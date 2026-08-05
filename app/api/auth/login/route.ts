import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  createCustomerSession,
} from "@/lib/customer-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE = 8192;
const MAX_PASSWORD_BYTES = 256;

/*
 * Hash utilizado para evitar diferenças
 * perceptíveis de tempo entre:
 *
 * - usuário inexistente;
 * - senha incorreta.
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

      Pragma:
        "no-cache",

      "X-Content-Type-Options":
        "nosniff",

      ...headers,
    },
  });
}

function normalizeEmail(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
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
  if (
    typeof value !== "string"
  ) {
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

  /*
   * Algumas chamadas legítimas do servidor
   * podem não possuir Origin.
   */
  if (!origin) {
    return true;
  }

  try {
    const requestOrigin =
      new URL(
        request.url
      ).origin;

    return (
      origin ===
      requestOrigin
    );
  } catch {
    return false;
  }
}

function invalidCredentialsResponse() {
  /*
   * Resposta genérica.
   *
   * Não informa se:
   *
   * - o e-mail existe;
   * - a senha está errada;
   * - a conta foi desativada.
   */
  return jsonResponse(
    {
      error:
        "E-mail ou senha inválidos.",
    },
    401
  );
}

function emailNotVerifiedResponse() {
  /*
   * Esta resposta SOMENTE poderá ser enviada
   * depois de a senha ter sido validada.
   *
   * Portanto, apenas saber o e-mail da pessoa
   * não é suficiente para descobrir o estado
   * da conta.
   */
  return jsonResponse(
    {
      error:
        "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada e também a pasta de spam.",

      code:
        "EMAIL_NOT_VERIFIED",

      requiresEmailVerification:
        true,
    },
    403
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

    if (
      !isSameOrigin(
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
     * TAMANHO DA REQUISIÇÃO
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

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

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
      !isValidEmail(
        email
      ) ||
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
     * BUSCA DO USUÁRIO
     * =====================================================
     */

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,

          password:
            true,

          role:
            true,

          accountStatus:
            true,

          emailVerifiedAt:
            true,

          disabledAt:
            true,
        },
      });

    /*
     * Se o usuário não existir, ainda executamos
     * bcrypt.compare() utilizando o hash dummy.
     *
     * Isso dificulta inferir a existência da conta
     * comparando tempos de resposta.
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
     * CREDENCIAIS INVÁLIDAS
     * =====================================================
     *
     * Antes de revelar qualquer informação sobre
     * confirmação de e-mail, a senha precisa estar
     * correta.
     */

    if (
      !user ||
      !passwordIsValid ||
      !user.password ||
      user.role !==
        "USER"
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * =====================================================
     * CONTA DESATIVADA
     * =====================================================
     *
     * Mantemos resposta genérica para uma conta
     * desativada.
     */

    if (
      user.disabledAt ||
      user.accountStatus ===
        "DISABLED"
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * =====================================================
     * E-MAIL AINDA NÃO CONFIRMADO
     * =====================================================
     *
     * IMPORTANTE:
     *
     * Só chegamos aqui depois de verificar a senha.
     *
     * Dessa forma:
     *
     * atacante + e-mail conhecido + senha errada
     *
     * continua recebendo:
     *
     * "E-mail ou senha inválidos."
     */

    if (
      !user.emailVerifiedAt &&
      (
        user.accountStatus ===
          "PENDING_VERIFICATION" ||
        user.accountStatus ===
          "GUEST"
      )
    ) {
      return emailNotVerifiedResponse();
    }

    /*
     * =====================================================
     * CONTA PRECISA ESTAR ATIVA
     * =====================================================
     */

    if (
      user.accountStatus !==
        "ACTIVE" ||
      !user.emailVerifiedAt
    ) {
      return invalidCredentialsResponse();
    }

    /*
     * =====================================================
     * CRIAÇÃO DA SESSÃO
     * =====================================================
     *
     * createCustomerSession:
     *
     * - gera token criptograficamente aleatório;
     * - armazena somente o hash no banco;
     * - envia token pelo cookie HttpOnly;
     * - Secure em produção;
     * - possui expiração;
     * - pode ser revogado.
     */

    await createCustomerSession(
      user.id
    );

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
          new Date(),
      },

      select: {
        id: true,
      },
    });

    /*
     * =====================================================
     * SUCESSO
     * =====================================================
     */

    return jsonResponse({
      success:
        true,

      redirectTo:
        "/minha-conta",
    });
  } catch (error) {
    /*
     * Nunca registramos:
     *
     * - e-mail;
     * - senha;
     * - cookie;
     * - token;
     * - corpo da requisição.
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