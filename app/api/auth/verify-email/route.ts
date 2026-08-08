import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";
import { createCustomerSession } from "@/lib/customer-auth";
import { hashCustomerToken } from "@/lib/customer-tokens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 4096;

type VerifyEmailBody = {
  token?: unknown;
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
        "no-store, no-cache, must-revalidate",

      Pragma:
        "no-cache",

      "X-Content-Type-Options":
        "nosniff",

      ...additionalHeaders,
    },
  });
}

function normalizeToken(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, 200);
}

function isValidTokenFormat(
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

function invalidTokenResponse() {
  /*
   * Mesma resposta para:
   *
   * - token inexistente;
   * - expirado;
   * - já utilizado;
   * - conta inválida;
   * - conta desativada.
   *
   * Não revelamos qual situação ocorreu.
   */
  return jsonResponse(
    {
      error:
        "Este link de confirmação é inválido ou expirou.",
    },
    400
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
     * RATE LIMIT
     * =====================================================
     */

    const clientIp =
      getClientIp(
        request
      );

    const rateLimit =
      await consumeRateLimit({
        scope:
          "verify-email-ip",

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
      !rateLimit.allowed
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
              rateLimit
                .retryAfterSeconds
            ),
        }
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
      rawBody.length === 0 ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return invalidTokenResponse();
    }

    let body: VerifyEmailBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as VerifyEmailBody;
    } catch {
      return invalidTokenResponse();
    }

    const token =
      normalizeToken(
        body.token
      );

    if (
      !isValidTokenFormat(
        token
      )
    ) {
      return invalidTokenResponse();
    }

    /*
     * =====================================================
     * HASH
     * =====================================================
     *
     * Procuramos somente pelo hash.
     *
     * O token puro nunca está no banco.
     */

    const tokenHash =
      hashCustomerToken(
        token
      );

    const now =
      new Date();

    /*
     * =====================================================
     * PROCURA TOKEN
     * =====================================================
     */

    const verification =
      await prisma.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },

        select: {
          id: true,
          userId: true,
          email: true,
          expiresAt: true,
          usedAt: true,

          user: {
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              accountStatus:
                true,
              disabledAt:
                true,
            },
          },
        },
      });

    if (
      !verification ||
      verification.usedAt ||
      verification.expiresAt <=
        now
    ) {
      return invalidTokenResponse();
    }

    /*
     * O endereço armazenado no token precisa
     * continuar sendo exatamente o endereço
     * atual da conta.
     */
    if (
      verification.email
        .trim()
        .toLowerCase() !==
      verification.user.email
        .trim()
        .toLowerCase()
    ) {
      return invalidTokenResponse();
    }

    /*
     * Nunca ativamos uma conta administrativa
     * através do fluxo de cadastro público.
     */
    if (
      verification.user.role !==
        "USER" ||
      verification.user.disabledAt ||
      verification.user
        .accountStatus ===
        "DISABLED" ||
      !verification.user.password
    ) {
      return invalidTokenResponse();
    }

    /*
     * =====================================================
     * ATIVAÇÃO ATÔMICA
     * =====================================================
     *
     * O consumo do token e a ativação acontecem
     * dentro da mesma transação.
     *
     * Se qualquer uma falhar, nenhuma alteração
     * fica parcialmente salva.
     */

    try {
      await prisma.$transaction(
        async (transaction) => {
          /*
           * "Reivindica" o token.
           *
           * Se duas requisições tentarem usar
           * o mesmo token simultaneamente,
           * somente uma poderá continuar.
           */
          const tokenUpdate =
            await transaction.emailVerificationToken.updateMany({
              where: {
                id:
                  verification.id,

                userId:
                  verification.userId,

                usedAt: null,

                expiresAt: {
                  gt: now,
                },
              },

              data: {
                usedAt: now,
              },
            });

          if (
            tokenUpdate.count !==
            1
          ) {
            throw new Error(
              "VERIFICATION_TOKEN_ALREADY_USED"
            );
          }

          /*
           * Ativa somente GUEST ou
           * PENDING_VERIFICATION.
           *
           * ACTIVE/DISABLED/ADMIN nunca são
           * alterados por este endpoint.
           */
          const userUpdate =
            await transaction.user.updateMany({
              where: {
                id:
                  verification.userId,

                email:
                  verification.email,

                role:
                  "USER",

                disabledAt:
                  null,

                password: {
                  not: null,
                },

                accountStatus: {
                  in: [
                    "GUEST",
                    "PENDING_VERIFICATION",
                  ],
                },
              },

              data: {
                accountStatus:
                  "ACTIVE",

                emailVerifiedAt:
                  now,
              },
            });

          if (
            userUpdate.count !==
            1
          ) {
            throw new Error(
              "ACCOUNT_NOT_ACTIVATABLE"
            );
          }

          /*
           * Todos os outros links antigos
           * deste usuário deixam de funcionar.
           */
          await transaction.emailVerificationToken.updateMany({
            where: {
              userId:
                verification.userId,

              id: {
                not:
                  verification.id,
              },

              usedAt:
                null,
            },

            data: {
              usedAt: now,
            },
          });

          /*
           * =================================================
           * REVOGA ACESSO DE VISITANTE DOS PEDIDOS
           * =================================================
           *
           * A partir deste momento o cliente comprovou que
           * controla o endereço de e-mail e a conta passou
           * para ACTIVE.
           *
           * Por isso os antigos tokens GUEST dos pedidos
           * desse usuário deixam de ser uma segunda chave de
           * acesso. O cliente autenticado continuará acessando
           * os próprios pedidos por CustomerSession + userId.
           *
           * O cookie antigo pode continuar fisicamente no
           * navegador até expirar, mas deixa de funcionar
           * imediatamente porque verifyOrderAccessToken()
           * rejeita tokens cujo revokedAt não seja nulo.
           */
          await transaction.orderAccessToken.updateMany({
            where: {
              type:
                "GUEST",

              revokedAt:
                null,

              order: {
                is: {
                  userId:
                    verification.userId,
                },
              },
            },

            data: {
              revokedAt:
                now,
            },
          });
        }
      );
    } catch {
      return invalidTokenResponse();
    }

    /*
     * =====================================================
     * CRIA SESSÃO
     * =====================================================
     *
     * O controle do e-mail foi comprovado.
     *
     * Agora podemos autenticar o cliente.
     */

    await createCustomerSession(
      verification.userId
    );

    /*
     * IMPORTANTE:
     *
     * Os pedidos antigos já possuem userId
     * desse mesmo User criado durante o checkout.
     *
     * Somente agora, após emailVerifiedAt e ACTIVE,
     * a futura área "Minha conta" poderá mostrá-los.
     */

    return jsonResponse({
      success: true,

      message:
        "E-mail confirmado com sucesso.",

      redirectTo:
        "/minha-conta",
    });
  } catch (error) {
    /*
     * Nunca registramos o token.
     */

    console.error(
      "Erro ao confirmar e-mail:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível confirmar seu e-mail.",
      },
      500
    );
  }
}