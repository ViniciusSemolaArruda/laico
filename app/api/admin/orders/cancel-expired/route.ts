import {
  NextResponse,
} from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  restoreOrderReservedStock,
} from "@/lib/orders/restoreOrderStock";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type ExpiredOrder = {
  id: string;

  payment: {
    status: string;
  } | null;
};

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
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
      },
    }
  );
}

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

function isRecordNotFoundError(
  error: unknown
) {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    error.code ===
    "P2025"
  );
}

function getAuthorizationResponse(
  error: unknown
) {
  if (
    !(
      error instanceof
      Error
    )
  ) {
    return null;
  }

  if (
    error.message ===
    "ADMIN_UNAUTHORIZED"
  ) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      401
    );
  }

  if (
    error.message ===
    "ADMIN_FORBIDDEN"
  ) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      403
    );
  }

  return null;
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
      !isAllowedOrigin(
        request
      )
    ) {
      return jsonResponse(
        {
          error:
            ACCESS_DENIED_MESSAGE,
        },
        403
      );
    }

    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     *
     * Esta operação modifica vários pedidos e estoques.
     * Portanto, exige ORDERS / MANAGE.
     */

    const session =
      await requireAdminPermission(
        "ORDERS",
        "MANAGE"
      );

    const now =
      new Date();

    /*
     * Checkout abandonado sem pagamento iniciado:
     * expira 30 minutos depois da criação.
     */
    const abandonedLimit =
      new Date(
        Date.now() -
          30 *
            60 *
            1000
      );

    /*
     * =====================================================
     * PEDIDOS EXPIRADOS
     * =====================================================
     */

    const expiredOrders: ExpiredOrder[] =
      await prisma.order.findMany({
        where: {
          status:
            "PENDING",

          OR: [
            /*
             * Pagamento com data de expiração.
             */
            {
              expiresAt: {
                lt:
                  now,
              },
            },

            /*
             * Checkout abandonado antes da criação
             * de qualquer pagamento.
             */
            {
              expiresAt:
                null,

              createdAt: {
                lt:
                  abandonedLimit,
              },

              payment: {
                is:
                  null,
              },
            },
          ],
        },

        select: {
          id:
            true,

          payment: {
            select: {
              status:
                true,
            },
          },
        },
      });

    let canceledCount =
      0;

    let ignoredCount =
      0;

    let failedCount =
      0;

    let restoredUnits =
      0;

    /*
     * =====================================================
     * CANCELAMENTO
     * =====================================================
     */

    for (
      const order of
      expiredOrders
    ) {
      /*
       * Defesa adicional:
       * pagamentos aprovados nunca são cancelados.
       */
      if (
        order.payment
          ?.status ===
        "APPROVED"
      ) {
        ignoredCount +=
          1;

        continue;
      }

      try {
        const restoredStock =
          await prisma.$transaction(
            async (
              transaction
            ) => {
              /*
               * A condição status: PENDING impede que
               * sobrescrevamos uma atualização feita
               * simultaneamente pelo webhook.
               *
               * Se o pagamento se tornar aprovado,
               * o update relacional também falhará e
               * toda a transação será revertida.
               */
              await transaction.order.update({
                where: {
                  id:
                    order.id,

                  status:
                    "PENDING",
                },

                data: {
                  status:
                    "CANCELED",

                  payment:
                    order.payment
                      ? {
                          update: {
                            where: {
                              status: {
                                not:
                                  "APPROVED",
                              },
                            },

                            data: {
                              status:
                                "CANCELED",
                            },
                          },
                        }
                      : undefined,

                  history: {
                    create: {
                      status:
                        "CANCELED",

                      title:
                        "Pedido cancelado",

                      message:
                        "O prazo para pagamento expirou e o pedido foi cancelado automaticamente.",
                    },
                  },
                },
              });

              /*
               * Devolve somente o estoque que possui
               * uma ORDER_RESERVATION registrada.
               *
               * Pedidos antigos, que nunca descontaram
               * estoque, não aumentam o saldo.
               */
              const restored =
                await restoreOrderReservedStock({
                  transaction,

                  orderId:
                    order.id,

                  actorId:
                    session.userId,

                  reason:
                    "Prazo de pagamento expirado",

                  note:
                    "Cancelamento administrativo de pedido expirado.",
                });

              /*
               * Não registramos dados pessoais, CPF,
               * endereço, cookies, tokens ou credenciais.
               */
              await transaction.adminAuditLog.create({
                data: {
                  actorId:
                    session.userId,

                  module:
                    "ORDERS",

                  action:
                    "ORDER_EXPIRED_CANCELED",

                  entityType:
                    "ORDER",

                  entityId:
                    order.id,

                  changes: {
                    previousStatus:
                      "PENDING",

                    nextStatus:
                      "CANCELED",

                    reason:
                      "PAYMENT_EXPIRED",

                    restoredProducts:
                      restored.restoredProducts,

                    restoredUnits:
                      restored.restoredUnits,
                  },
                },
              });

              return restored;
            }
          );

        canceledCount +=
          1;

        restoredUnits +=
          restoredStock.restoredUnits;
      } catch (error) {
        /*
         * P2025 pode ocorrer quando outro processo,
         * como o webhook ou cron, atualiza o pedido
         * durante esta execução.
         *
         * A transação completa é revertida, inclusive
         * qualquer alteração de estoque.
         */
        if (
          isRecordNotFoundError(
            error
          )
        ) {
          ignoredCount +=
            1;

          continue;
        }

        failedCount +=
          1;

        /*
         * Não imprimimos ID do pedido, dados do
         * comprador, pagamento ou estoque.
         */
        console.error(
          "Falha ao cancelar um pedido expirado:",
          error instanceof
            Error
            ? error.name
            : "UnknownError"
        );
      }
    }

    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return jsonResponse({
      success:
        failedCount ===
        0,

      found:
        expiredOrders.length,

      canceled:
        canceledCount,

      ignored:
        ignoredCount,

      failed:
        failedCount,

      restoredUnits,

      message:
        failedCount >
        0
          ? `${canceledCount} pedido(s) cancelado(s) e ${failedCount} pedido(s) com erro.`
          : `${canceledCount} pedido(s) expirado(s) cancelado(s).`,
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    console.error(
      "Erro ao cancelar pedidos expirados:",
      error instanceof
        Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Erro interno ao cancelar pedidos expirados.",
      },
      500
    );
  }
}