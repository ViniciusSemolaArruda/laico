import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  clearCustomerSessionCookieOnly,
  getCustomerSession,
} from "@/lib/customer-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE = 8192;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

type PasswordBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
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
      new URL(request.url).origin
    );
  } catch {
    return false;
  }
}

function getPassword(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value
    : "";
}

function isStrongPassword(
  password: string
) {
  const bytes =
    Buffer.byteLength(
      password,
      "utf8"
    );

  return (
    password.length >=
      MIN_PASSWORD_LENGTH &&
    bytes <=
      MAX_PASSWORD_BYTES &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^a-zA-Z0-9]/.test(
      password
    )
  );
}

export async function PATCH(
  request: Request
) {
  const session =
    await getCustomerSession();

  if (!session) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      401
    );
  }

  try {
    if (!isSameOrigin(request)) {
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

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Dados inválidos.",
        },
        400
      );
    }

    let body: PasswordBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as PasswordBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Dados inválidos.",
        },
        400
      );
    }

    const currentPassword =
      getPassword(
        body.currentPassword
      );

    const newPassword =
      getPassword(
        body.newPassword
      );

    if (
      !currentPassword ||
      Buffer.byteLength(
        currentPassword,
        "utf8"
      ) > 256
    ) {
      return jsonResponse(
        {
          error:
            "Senha atual incorreta.",
        },
        400
      );
    }

    if (
      !isStrongPassword(
        newPassword
      )
    ) {
      return jsonResponse(
        {
          error:
            "A nova senha deve possuir pelo menos 12 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.",
        },
        400
      );
    }

    /*
     * RATE LIMIT POR IP
     */

    const ipLimit =
      await consumeRateLimit({
        scope:
          "change-password-ip",

        identifier:
          getClientIp(
            request
          ),

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

    if (!ipLimit.allowed) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              ipLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * RATE LIMIT POR CONTA
     */

    const accountLimit =
      await consumeRateLimit({
        scope:
          "change-password-account",

        identifier:
          session.userId,

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
      !accountLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              accountLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * CARREGA SOMENTE A CONTA DA SESSÃO.
     */

    const user =
      await prisma.user.findFirst({
        where: {
          id:
            session.userId,

          role:
            "USER",

          accountStatus:
            "ACTIVE",

          emailVerifiedAt: {
            not: null,
          },

          disabledAt:
            null,
        },

        select: {
          id: true,
          password: true,
        },
      });

    if (
      !user ||
      !user.password
    ) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        401
      );
    }

    /*
     * CONFERE SENHA ATUAL
     */

    const currentIsValid =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!currentIsValid) {
      return jsonResponse(
        {
          error:
            "Senha atual incorreta.",
        },
        400
      );
    }

    /*
     * NOVA SENHA NÃO PODE SER IGUAL À ATUAL.
     */

    const samePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (samePassword) {
      return jsonResponse(
        {
          error:
            "A nova senha precisa ser diferente da senha atual.",
        },
        400
      );
    }

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        12
      );

    const now =
      new Date();

    /*
     * ALTERAÇÃO + REVOGAÇÃO DE SESSÕES
     * NA MESMA TRANSAÇÃO.
     */

    await prisma.$transaction(
      async (transaction) => {
        const update =
          await transaction.user.updateMany({
            where: {
              id:
                user.id,

              /*
               * Também impede uma condição
               * de corrida com outra mudança
               * simultânea de senha.
               */
              password:
                user.password,

              role:
                "USER",

              accountStatus:
                "ACTIVE",

              disabledAt:
                null,
            },

            data: {
              password:
                passwordHash,

              passwordChangedAt:
                now,
            },
          });

        if (
          update.count !== 1
        ) {
          throw new Error(
            "PASSWORD_UPDATE_CONFLICT"
          );
        }

        /*
         * TODAS as sessões são revogadas.
         */

        await transaction.customerSession.updateMany({
          where: {
            userId:
              user.id,

            revokedAt:
              null,
          },

          data: {
            revokedAt:
              now,
          },
        });

        /*
         * Qualquer recuperação de senha
         * pendente também deixa de funcionar.
         */

        await transaction.passwordResetToken.updateMany({
          where: {
            userId:
              user.id,

            usedAt:
              null,
          },

          data: {
            usedAt:
              now,
          },
        });
      }
    );

    /*
     * A sessão atual também acabou de ser
     * revogada no banco. Removemos o cookie.
     */

    await clearCustomerSessionCookieOnly();

    return jsonResponse({
      success: true,

      message:
        "Senha alterada com sucesso.",

      redirectTo:
        "/entrar?password=changed",
    });
  } catch (error) {
    console.error(
      "Erro ao alterar senha:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível alterar sua senha.",
      },
      500
    );
  }
}