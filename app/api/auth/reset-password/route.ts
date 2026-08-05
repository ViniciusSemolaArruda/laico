import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  clearCustomerSessionCookieOnly,
} from "@/lib/customer-auth";

import {
  hashCustomerToken,
} from "@/lib/customer-tokens";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE = 8192;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

type ResetPasswordBody = {
  token?: unknown;
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

function invalidTokenResponse() {
  return jsonResponse(
    {
      error:
        "Este link de redefinição é inválido ou expirou.",
    },
    400
  );
}

function normalizeToken(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, 200);
}

function isValidToken(
  token: string
) {
  return (
    token.length >= 32 &&
    token.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(
      token
    )
  );
}

function validatePassword(
  value: unknown
) {
  if (typeof value !== "string") {
    return {
      valid: false,
      password: "",
    };
  }

  const password =
    value;

  const bytes =
    Buffer.byteLength(
      password,
      "utf8"
    );

  return {
    password,

    valid:
      password.length >=
        MIN_PASSWORD_LENGTH &&
      bytes <=
        MAX_PASSWORD_BYTES &&
      /[a-z]/.test(
        password
      ) &&
      /[A-Z]/.test(
        password
      ) &&
      /\d/.test(
        password
      ) &&
      /[^a-zA-Z0-9]/.test(
        password
      ),
  };
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

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return invalidTokenResponse();
    }

    let body: ResetPasswordBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as ResetPasswordBody;
    } catch {
      return invalidTokenResponse();
    }

    const token =
      normalizeToken(
        body.token
      );

    const {
      valid:
        passwordIsValid,
      password,
    } =
      validatePassword(
        body.password
      );

    if (!isValidToken(token)) {
      return invalidTokenResponse();
    }

    if (!passwordIsValid) {
      return jsonResponse(
        {
          error:
            "A senha deve possuir pelo menos 12 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.",
        },
        400
      );
    }

    /*
     * =====================================================
     * RATE LIMIT POR IP
     * =====================================================
     */

    const ipRateLimit =
      await consumeRateLimit({
        scope:
          "reset-password-ip",

        identifier:
          getClientIp(
            request
          ),

        limit: 15,

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
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
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
     * RATE LIMIT POR TOKEN
     * =====================================================
     *
     * O token puro também não será armazenado
     * na tabela de rate limit.
     *
     * consumeRateLimit aplica HMAC.
     */

    const tokenRateLimit =
      await consumeRateLimit({
        scope:
          "reset-password-token",

        identifier:
          token,

        limit: 5,

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
      !tokenRateLimit.allowed
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
              tokenRateLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * =====================================================
     * TOKEN
     * =====================================================
     */

    const tokenHash =
      hashCustomerToken(
        token
      );

    const now =
      new Date();

    const resetToken =
      await prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },

        select: {
          id: true,
          userId: true,
          expiresAt: true,
          usedAt: true,

          user: {
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
          },
        },
      });

    /*
     * =====================================================
     * VALIDAÇÃO
     * =====================================================
     */

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <=
        now
    ) {
      return invalidTokenResponse();
    }

    const user =
      resetToken.user;

    if (
      user.role !==
        "USER" ||
      user.accountStatus !==
        "ACTIVE" ||
      !user.emailVerifiedAt ||
      user.disabledAt ||
      !user.password
    ) {
      return invalidTokenResponse();
    }

    /*
     * =====================================================
     * SENHA DIFERENTE DA ATUAL
     * =====================================================
     */

    const isCurrentPassword =
      await bcrypt.compare(
        password,
        user.password
      );

    if (isCurrentPassword) {
      return jsonResponse(
        {
          error:
            "A nova senha precisa ser diferente da senha atual.",
        },
        400
      );
    }

    /*
     * =====================================================
     * NOVO HASH
     * =====================================================
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * =====================================================
     * TRANSAÇÃO
     * =====================================================
     *
     * Tudo acontece junto:
     *
     * 1. token é consumido;
     * 2. senha muda;
     * 3. outros resets são invalidados;
     * 4. sessões existentes são revogadas.
     */

    try {
      await prisma.$transaction(
        async (transaction) => {
          const tokenUpdate =
            await transaction.passwordResetToken.updateMany({
              where: {
                id:
                  resetToken.id,

                userId:
                  resetToken.userId,

                usedAt:
                  null,

                expiresAt: {
                  gt: now,
                },
              },

              data: {
                usedAt:
                  now,
              },
            });

          if (
            tokenUpdate.count !==
            1
          ) {
            throw new Error(
              "RESET_TOKEN_ALREADY_USED"
            );
          }

          const userUpdate =
            await transaction.user.updateMany({
              where: {
                id:
                  resetToken.userId,

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

              data: {
                password:
                  passwordHash,

                passwordChangedAt:
                  now,
              },
            });

          if (
            userUpdate.count !==
            1
          ) {
            throw new Error(
              "RESET_ACCOUNT_INVALID"
            );
          }

          /*
           * Invalida qualquer outro link
           * de recuperação ainda existente.
           */

          await transaction.passwordResetToken.updateMany({
            where: {
              userId:
                resetToken.userId,

              id: {
                not:
                  resetToken.id,
              },

              usedAt:
                null,
            },

            data: {
              usedAt:
                now,
            },
          });

          /*
           * Revoga TODAS as sessões.
           *
           * Inclusive sessões potencialmente
           * roubadas em outros dispositivos.
           */

          await transaction.customerSession.updateMany({
            where: {
              userId:
                resetToken.userId,

              revokedAt:
                null,
            },

            data: {
              revokedAt:
                now,
            },
          });
        }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.message ===
            "RESET_TOKEN_ALREADY_USED" ||
          error.message ===
            "RESET_ACCOUNT_INVALID"
        )
      ) {
        return invalidTokenResponse();
      }

      throw error;
    }

    /*
     * Remove também eventual cookie de sessão
     * existente neste navegador.
     */

    await clearCustomerSessionCookieOnly();

    return jsonResponse({
      success: true,

      message:
        "Sua senha foi alterada com sucesso.",

      redirectTo:
        "/entrar?password=changed",
    });
  } catch (error) {
    console.error(
      "Erro ao redefinir senha:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível redefinir sua senha.",
      },
      500
    );
  }
}