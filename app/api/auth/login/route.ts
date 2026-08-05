import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";
import { createCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 8192;
const MAX_PASSWORD_BYTES = 256;

/*
 * Usado para reduzir diferenças de tempo entre:
 *
 * - e-mail inexistente;
 * - senha incorreta.
 *
 * Assim continuamos executando bcrypt mesmo quando
 * o usuário não existe.
 */
const dummyPasswordHashPromise =
  bcrypt.hash(
    "Laico-Dummy-Password-For-Timing-Protection-2026!",
    12
  );

type LoginBody = {
  email?: unknown;
  password?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers?: Record<string, string>
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate",

      Pragma: "no-cache",

      "X-Content-Type-Options":
        "nosniff",

      ...headers,
    },
  });
}

function normalizeEmail(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

function getPassword(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value;
}

function isValidEmail(
  email: string
) {
  return (
    email.length > 3 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

function isSameOrigin(
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
      new URL(request.url)
        .origin
    );
  } catch {
    return false;
  }
}

function invalidCredentialsResponse() {
  /*
   * Não revelamos:
   *
   * - se o e-mail existe;
   * - se ainda não foi confirmado;
   * - se a conta está desativada;
   * - se a senha está errada.
   */
  return jsonResponse(
    {
      error:
        "E-mail ou senha inválidos.",
    },
    401
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * ORIGEM
     * =====================================================
     */

    if (!isSameOrigin(request)) {
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
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da requisição inválido.",
        },
        415
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

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
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        413
      );
    }

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return invalidCredentialsResponse();
    }

    let body: LoginBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as LoginBody;
    } catch {
      return invalidCredentialsResponse();
    }

    const email =
      normalizeEmail(
        body.email
      );

    const password =
      getPassword(
        body.password
      );

    if (
      !isValidEmail(email) ||
      !password ||
      Buffer.byteLength(
        password,
        "utf8"
      ) >
        MAX_PASSWORD_BYTES
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
          "customer-login-ip",

        identifier:
          clientIp,

        limit: 20,

        windowMs:
          15 *
          60 *
          1000,

        blockMs:
          30 *
          60 *
          1000,
      });

    if (!ipRateLimit.allowed) {
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
          "customer-login-email",

        identifier:
          email,

        limit: 8,

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
          id: true,
          password: true,
          role: true,

          accountStatus:
            true,

          emailVerifiedAt:
            true,

          disabledAt:
            true,
        },
      });

    /*
     * Mesmo que não exista usuário, executamos
     * bcrypt.compare usando um hash dummy.
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
     * AUTORIZAÇÃO DA CONTA
     * =====================================================
     */

    const canLogin =
      Boolean(user) &&
      passwordIsValid &&
      user?.role ===
        "USER" &&
      user.accountStatus ===
        "ACTIVE" &&
      Boolean(
        user.emailVerifiedAt
      ) &&
      !user.disabledAt &&
      Boolean(
        user.password
      );

    if (
      !canLogin ||
      !user
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * =====================================================
     * SESSÃO
     * =====================================================
     *
     * createCustomerSession:
     *
     * - gera token aleatório;
     * - salva somente hash no banco;
     * - cria cookie HttpOnly;
     * - Secure em produção;
     * - possui expiração;
     * - pode ser revogada.
     */

    await createCustomerSession(
      user.id
    );

    /*
     * lastLoginAt é apenas informação operacional.
     */

    await prisma.user.update({
      where: {
        id: user.id,
      },

      data: {
        lastLoginAt:
          new Date(),
      },

      select: {
        id: true,
      },
    });

    return jsonResponse({
      success: true,

      redirectTo:
        "/minha-conta",
    });
  } catch (error) {
    /*
     * Nunca logamos:
     *
     * - e-mail;
     * - senha;
     * - cookie;
     * - token.
     */

    console.error(
      "Erro no login do cliente:",
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