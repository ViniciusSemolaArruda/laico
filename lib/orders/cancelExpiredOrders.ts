import {
  restoreOrderReservedStock,
} from "@/lib/orders/restoreOrderStock";

import {
  prisma,
} from "@/lib/prisma";

const MAXIMUM_ORDERS_PER_RUN =
  100;

function isRecordNotFoundError(
  error: unknown
) {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    error.code ===
      "P2025"
  );
}

export async function cancelExpiredOrders() {
  const now =
    new Date();

  /*
   * Limitamos a quantidade processada em
   * uma única execução para evitar que o
   * cron permaneça aberto por muito tempo.
   */
  const expiredOrders =
    await prisma.order.findMany({
      where: {
        status:
          "PENDING",

        expiresAt: {
          not:
            null,

          lte:
            now,
        },

        /*
         * Um pagamento aprovado nunca pode
         * ser cancelado automaticamente.
         */
        OR: [
          {
            payment: {
              is:
                null,
            },
          },

          {
            payment: {
              is: {
                status: {
                  not:
                    "APPROVED",
                },
              },
            },
          },
        ],
      },

      select: {
        id:
          true,
      },

      orderBy: {
        expiresAt:
          "asc",
      },

      take:
        MAXIMUM_ORDERS_PER_RUN,
    });

  let canceledCount =
    0;

  let ignoredCount =
    0;

  let failedCount =
    0;

  let restoredUnits =
    0;

  for (
    const order of
    expiredOrders
  ) {
    try {
      const result =
        await prisma.$transaction(
          async (
            transaction
          ) => {
            /*
             * updateMany funciona como uma trava
             * otimista.
             *
             * Apenas uma execução poderá trocar
             * este pedido de PENDING para CANCELED.
             *
             * Também repetimos a verificação do
             * pagamento dentro da transação.
             */
            const statusUpdate =
              await transaction.order.updateMany({
                where: {
                  id:
                    order.id,

                  status:
                    "PENDING",

                  expiresAt: {
                    not:
                      null,

                    lte:
                      now,
                  },

                  OR: [
                    {
                      payment: {
                        is:
                          null,
                      },
                    },

                    {
                      payment: {
                        is: {
                          status: {
                            not:
                              "APPROVED",
                          },
                        },
                      },
                    },
                  ],
                },

                data: {
                  status:
                    "CANCELED",
                },
              });

            /*
             * Outra execução, webhook ou
             * funcionário já modificou o pedido.
             */
            if (
              statusUpdate.count !==
              1
            ) {
              return null;
            }

            /*
             * Pagamentos ainda não aprovados
             * acompanham o cancelamento do pedido.
             */
            await transaction.payment.updateMany({
              where: {
                orderId:
                  order.id,

                status: {
                  not:
                    "APPROVED",
                },
              },

              data: {
                status:
                  "CANCELED",
              },
            });

            /*
             * Histórico visível no acompanhamento
             * do pedido.
             */
            await transaction.orderStatusHistory.create({
              data: {
                orderId:
                  order.id,

                status:
                  "CANCELED",

                title:
                  "Pedido cancelado automaticamente",

                message:
                  "O prazo de pagamento expirou e o pedido foi cancelado automaticamente.",
              },
            });

            /*
             * Devolve apenas reservas realmente
             * registradas pelo checkout.
             *
             * Pedidos antigos, sem ORDER_RESERVATION,
             * não terão o estoque aumentado.
             */
            const restored =
              await restoreOrderReservedStock({
                transaction,

                orderId:
                  order.id,

                actorId:
                  null,

                reason:
                  "Prazo de pagamento expirado",

                note:
                  "Cancelamento automático executado pelo sistema.",
              });

            return restored;
          }
        );

      if (!result) {
        ignoredCount +=
          1;

        continue;
      }

      canceledCount +=
        1;

      restoredUnits +=
        result.restoredUnits;
    } catch (error) {
      /*
       * P2025 pode acontecer se algum registro
       * for modificado ou removido concorrentemente.
       *
       * A transação inteira será revertida.
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
       * Não registramos CPF, e-mail, endereço,
       * cookies, tokens ou credenciais.
       */
      console.error(
        "Falha ao cancelar pedido expirado:",
        error instanceof Error
          ? error.name
          : "UnknownError"
      );
    }
  }

  return {
    found:
      expiredOrders.length,

    canceled:
      canceledCount,

    ignored:
      ignoredCount,

    failed:
      failedCount,

    restoredUnits,
  };
}