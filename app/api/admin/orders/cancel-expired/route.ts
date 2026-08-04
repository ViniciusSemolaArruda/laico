import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type ExpiredOrder = {
  id: string;
  expiresAt: Date | null;
  createdAt: Date;

  payment: {
    status: string;
  } | null;
};

function isRecordNotFoundError(
  error: unknown
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return error.code === "P2025";
}

export async function POST() {
  const session =
    await getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Não autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const now = new Date();

    /*
     * Pedido sem pagamento iniciado:
     * expira 30 minutos depois da criação.
     */
    const abandonedLimit =
      new Date(
        Date.now() -
          30 * 60 * 1000
      );

    const expiredOrders: ExpiredOrder[] =
      await prisma.order.findMany({
        where: {
          status: "PENDING",

          OR: [
            /*
             * Pix, boleto ou outra forma de
             * pagamento com prazo definido.
             */
            {
              expiresAt: {
                lt: now,
              },
            },

            /*
             * Checkout abandonado antes da
             * criação do pagamento.
             */
            {
              expiresAt: null,

              createdAt: {
                lt: abandonedLimit,
              },

              payment: {
                is: null,
              },
            },
          ],
        },

        select: {
          id: true,
          expiresAt: true,
          createdAt: true,

          payment: {
            select: {
              status: true,
            },
          },
        },
      });

    let canceledCount = 0;
    let ignoredCount = 0;
    let failedCount = 0;

    for (
      const order of
      expiredOrders
    ) {
      /*
       * Nunca cancela um pagamento que já
       * esteja aprovado.
       */
      if (
        order.payment?.status ===
        "APPROVED"
      ) {
        ignoredCount += 1;
        continue;
      }

      try {
        /*
         * O update do pedido, pagamento e
         * histórico acontece em uma única
         * operação atômica do Prisma.
         *
         * A condição status: PENDING impede
         * cancelar um pedido alterado por outro
         * processo enquanto esta rota executa.
         */
        await prisma.order.update({
          where: {
            id: order.id,
            status: "PENDING",
          },

          data: {
            status:
              "CANCELED",

            payment: order.payment
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

        canceledCount += 1;
      } catch (error) {
        /*
         * P2025 pode acontecer quando o pedido
         * foi pago ou atualizado por outro
         * processo entre a busca e o update.
         */
        if (
          isRecordNotFoundError(
            error
          )
        ) {
          ignoredCount += 1;
          continue;
        }

        failedCount += 1;

        console.error(
          `Erro ao cancelar o pedido ${order.id}:`,
          error
        );
      }
    }

    return NextResponse.json({
      success:
        failedCount === 0,

      found:
        expiredOrders.length,

      canceled:
        canceledCount,

      ignored:
        ignoredCount,

      failed:
        failedCount,

      message:
        failedCount > 0
          ? `${canceledCount} pedido(s) cancelado(s) e ${failedCount} pedido(s) com erro.`
          : `${canceledCount} pedido(s) expirado(s) cancelado(s).`,
    });
  } catch (error) {
    console.error(
      "Erro ao cancelar pedidos expirados:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao cancelar pedidos expirados.",
      },
      {
        status: 500,
      }
    );
  }
}