import {
  createHash,
} from "node:crypto";

import {
  cookies,
} from "next/headers";

import {
  NextResponse,
} from "next/server";

import {
  createAdminAuditLog,
} from "@/lib/admin-audit";

import {
  createAdminSession,
  getAdminCookieOptions,
} from "@/lib/admin-auth";

import {
  ADMIN_2FA_CHALLENGE_COOKIE_NAME,
  getAdminTwoFactorCookieOptions,
  verifyAdminTwoFactorChallenge,
} from "@/lib/admin-two-factor";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAXIMUM_REQUEST_SIZE =
  2_000;

type VerifyTwoFactorBody = {
  code?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  additionalHeaders?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",

      Pragma:
        "no-cache",

      "X-Content-Type-Options":
        "nosniff",

      ...additionalHeaders,
    },
  });
}

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return (
      origin ===
      new URL(request.url).origin
    );
  } catch {
    return false;
  }
}

function normalizeCode(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(/\D/g, "")
    .slice(0, 6);
}

function invalidCodeResponse() {
  return jsonResponse(
    {
      error:
        "Código inválido ou expirado.",
    },
    401
  );
}

function hashRateLimitIdentifier(
  value: string
) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export async function POST(
  request: Request
) {
  try {
    if (
      !isAllowedOrigin(request)
    ) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

    const contentType =
      request.headers.get(
        "content-type"
      );

    if (
      !contentType
        ?.toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da solicitação inválido.",
        },
        415
      );
    }

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ?? "0"
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAXIMUM_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        413
      );
    }

    let body:
      VerifyTwoFactorBody;

    try {
      const rawBody =
        await request.text();

      if (
        !rawBody ||
        rawBody.length >
          MAXIMUM_REQUEST_SIZE
      ) {
        return invalidCodeResponse();
      }

      body =
        JSON.parse(
          rawBody
        ) as VerifyTwoFactorBody;
    } catch {
      return invalidCodeResponse();
    }

    const code =
      normalizeCode(
        body.code
      );

    if (
      !/^\d{6}$/.test(code)
    ) {
      return invalidCodeResponse();
    }

    const cookieStore =
      await cookies();

    const challengeToken =
      cookieStore.get(
        ADMIN_2FA_CHALLENGE_COOKIE_NAME
      )?.value ?? "";

    if (!challengeToken) {
      return invalidCodeResponse();
    }

    /*
     * Rate limit por IP.
     */
    const clientIp =
      getClientIp(request);

    const ipRateLimit =
      await consumeRateLimit({
        scope:
          "admin-2fa-verify-ip",

        identifier:
          clientIp,

        limit: 20,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (!ipRateLimit.allowed) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              ipRateLimit.retryAfterSeconds
            ),
        }
      );
    }

    /*
     * Rate limit independente para o desafio.
     * O token puro não é utilizado como chave persistida.
     */
    const challengeRateLimit =
      await consumeRateLimit({
        scope:
          "admin-2fa-verify-challenge",

        identifier:
          hashRateLimitIdentifier(
            challengeToken
          ),

        limit: 8,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (
      !challengeRateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Solicite um novo código mais tarde.",
        },
        429,
        {
          "Retry-After":
            String(
              challengeRateLimit.retryAfterSeconds
            ),
        }
      );
    }

    const userId =
      await verifyAdminTwoFactorChallenge({
        token:
          challengeToken,

        code,
      });

    if (!userId) {
      return invalidCodeResponse();
    }

    /*
     * Defesa em profundidade antes de criar a sessão.
     */
    const admin =
      await prisma.user.findFirst({
        where: {
          id:
            userId,

          role:
            "ADMIN",

          adminProfile: {
            is: {
              active:
                true,

              removedAt:
                null,
            },
          },
        },

        select: {
          id: true,

          adminProfile: {
            select: {
              jobTitle: true,
              isSuperAdmin: true,
            },
          },
        },
      });

    if (
      !admin ||
      !admin.adminProfile
    ) {
      return invalidCodeResponse();
    }

    const adminProfile =
      admin.adminProfile;

    const sessionToken =
      await createAdminSession(
        admin.id
      );

    const now =
      new Date();

    await prisma.user.update({
      where: {
        id:
          admin.id,
      },

      data: {
        lastLoginAt:
          now,
      },

      select: {
        id: true,
      },
    });

    /*
     * Login só é considerado concluído depois do 2FA.
     */
    try {
      await createAdminAuditLog({
        actorId:
          admin.id,

        module:
          "DASHBOARD",

        action:
          "ADMIN_LOGIN",

        entityType:
          "ADMIN_USER",

        entityId:
          admin.id,

        changes: {
          event:
            "LOGIN_SUCCESS",

          jobTitle:
            adminProfile.jobTitle,

          isSuperAdmin:
            adminProfile.isSuperAdmin,

          secondFactor:
            "EMAIL_OTP",
        },
      });
    } catch (
      auditError
    ) {
      console.error(
        "Falha ao registrar auditoria do login administrativo:",
        auditError instanceof Error
          ? auditError.name
          : "UnknownError"
      );
    }

    const response =
      jsonResponse({
        success:
          true,

        redirectTo:
          "/admin",
      });

    response.cookies.set({
      ...getAdminCookieOptions(),

      value:
        sessionToken,
    });

    /*
     * Remove o cookie temporário do segundo fator.
     */
    response.cookies.set({
      ...getAdminTwoFactorCookieOptions(),

      value: "",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(
      "Erro ao validar segundo fator administrativo:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível validar o código de segurança.",
      },
      500
    );
  }
}