import bcrypt from "bcryptjs";

import {
  NextResponse,
} from "next/server";

import {
  createAdminAuditLog,
} from "@/lib/admin-audit";

import {
  createAdminSession,
  getAdminCookieOptions,
  revokeCurrentAdminSession,
} from "@/lib/admin-auth";

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
  5_000;

const MAXIMUM_PASSWORD_BYTES =
  72;

/*
 * =========================================================
 * HASH DUMMY
 * =========================================================
 *
 * Mantém bcrypt mesmo quando o e-mail
 * não existe.
 */

const dummyPasswordHashPromise =
  bcrypt.hash(
    "Laico-Admin-Dummy-Password-2026!#Secure",
    12
  );

type AdminLoginBody = {
  email?: unknown;
  password?: unknown;
};

/*
 * =========================================================
 * JSON
 * =========================================================
 */

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200,
  additionalHeaders?: Record<
    string,
    string
  >
) {
  return NextResponse.json(
    body,
    {
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
    }
  );
}

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeEmail(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .slice(
      0,
      254
    );
}

function normalizePassword(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  /*
   * Senha não recebe trim.
   */
  return value;
}

function isValidEmail(
  email: string
) {
  return (
    email.length >= 5 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

/*
 * =========================================================
 * ORIGEM
 * =========================================================
 */

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return true;
  }

  try {
    return (
      origin ===
      new URL(
        request.url
      ).origin
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * RESPOSTA GENÉRICA
 * =========================================================
 */

function invalidCredentialsResponse() {
  return jsonResponse(
    {
      error:
        "E-mail ou senha inválidos.",
    },
    401
  );
}

/*
 * =========================================================
 * LOGIN
 * =========================================================
 */

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * ORIGEM
     * =====================================================
     */

    if (
      !isAllowedOrigin(
        request
      )
    ) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

    /*
     * =====================================================
     * CONTENT TYPE
     * =====================================================
     */

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

    /*
     * =====================================================
     * TAMANHO
     * =====================================================
     */

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ??
          "0"
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
            "A solicitação é muito grande.",
        },
        413
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body:
      AdminLoginBody;

    try {
      const rawBody =
        await request.text();

      if (
        !rawBody ||
        rawBody.length >
          MAXIMUM_REQUEST_SIZE
      ) {
        return jsonResponse(
          {
            error:
              "Solicitação inválida.",
          },
          400
        );
      }

      body =
        JSON.parse(
          rawBody
        ) as AdminLoginBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    /*
     * =====================================================
     * CREDENCIAIS
     * =====================================================
     */

    const email =
      normalizeEmail(
        body.email
      );

    const password =
      normalizePassword(
        body.password
      );

    const passwordBytes =
      Buffer.byteLength(
        password,
        "utf8"
      );

    if (
      !isValidEmail(
        email
      ) ||
      !password ||
      passwordBytes >
        MAXIMUM_PASSWORD_BYTES
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * =====================================================
     * RATE LIMIT POR IP
     * =====================================================
     */

    const clientIp =
      getClientIp(
        request
      );

    const ipRateLimit =
      await consumeRateLimit({
        scope:
          "admin-login-ip-v2",

        identifier:
          clientIp,

        limit:
          10,

        windowMs:
          15 *
          60 *
          1000,

        blockMs:
          30 *
          60 *
          1000,
      });

    if (
      !ipRateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              ipRateLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * =====================================================
     * RATE LIMIT POR E-MAIL
     * =====================================================
     */

    const emailRateLimit =
      await consumeRateLimit({
        scope:
          "admin-login-email-v2",

        identifier:
          email,

        limit:
          5,

        windowMs:
          15 *
          60 *
          1000,

        blockMs:
          30 *
          60 *
          1000,
      });

    if (
      !emailRateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              emailRateLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * =====================================================
     * USUÁRIO
     * =====================================================
     */

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id:
            true,

          role:
            true,

          password:
            true,

          adminProfile: {
            select: {
              active:
                true,

              removedAt:
                true,

              isSuperAdmin:
                true,

              jobTitle:
                true,
            },
          },
        },
      });

    /*
     * =====================================================
     * BCRYPT
     * =====================================================
     *
     * Mesmo sem usuário, bcrypt é executado.
     */

    const passwordHash =
      user?.password ??
      (await dummyPasswordHashPromise);

    const passwordIsValid =
      await bcrypt.compare(
        password,
        passwordHash
      );

    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     *
     * Nunca explicamos ao navegador qual destas
     * condições falhou.
     */

    if (
      !user ||
      user.role !==
        "ADMIN" ||
      !user.password ||
      !passwordIsValid ||
      !user.adminProfile ||
      !user.adminProfile.active ||
      user.adminProfile
        .removedAt !==
        null
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * Referência já validada.
     */

    const adminProfile =
      user.adminProfile;

    /*
     * =====================================================
     * SESSÃO ANTERIOR DESTE NAVEGADOR
     * =====================================================
     */

    await revokeCurrentAdminSession();

    /*
     * =====================================================
     * NOVA SESSÃO
     * =====================================================
     */

    const sessionToken =
      await createAdminSession(
        user.id
      );

    const now =
      new Date();

    /*
     * =====================================================
     * ÚLTIMO LOGIN
     * =====================================================
     */

    await prisma.user.update({
      where: {
        id:
          user.id,
      },

      data: {
        lastLoginAt:
          now,
      },

      select: {
        id:
          true,
      },
    });

    /*
     * =====================================================
     * AUDITORIA DO LOGIN
     * =====================================================
     *
     * A falha somente da auditoria não imprime
     * dados sensíveis nem revela credenciais.
     */

    try {
      await createAdminAuditLog({
        actorId:
          user.id,

        module:
          "DASHBOARD",

        action:
          "ADMIN_LOGIN",

        entityType:
          "ADMIN_USER",

        entityId:
          user.id,

        changes: {
          event:
            "LOGIN_SUCCESS",

          jobTitle:
            adminProfile.jobTitle,

          isSuperAdmin:
            adminProfile.isSuperAdmin,
        },
      });
    } catch (
      auditError
    ) {
      console.error(
        "Falha ao registrar auditoria do login administrativo:",
        auditError instanceof
          Error
          ? auditError.name
          : "UnknownError"
      );
    }

    /*
     * =====================================================
     * RESPOSTA + COOKIE
     * =====================================================
     */

    const response =
      jsonResponse({
        success:
          true,

        redirectTo:
          "/admin",
      });

    const cookieOptions =
      getAdminCookieOptions();

    response.cookies.set({
      ...cookieOptions,

      value:
        sessionToken,
    });

    return response;
  } catch (error) {
    /*
     * Nunca imprimimos:
     *
     * - senha;
     * - e-mail;
     * - token;
     * - cookie;
     * - hash.
     */

    console.error(
      "Erro no login administrativo:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível realizar o login.",
      },
      500
    );
  }
}