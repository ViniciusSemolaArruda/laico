import { prisma } from "@/lib/prisma";

const MAXIMUM_ORDERS_PER_RUN = 100;

export async function cancelExpiredOrders() {
  const now = new Date();

  /*
   * Limitamos a quantidade processada em
   * uma execução para evitar que o cron
   * fique aberto por tempo excessivo.
   */
  const expiredOrders =
    await prisma.order.findMany({
      where: {
        status: "PENDING",

        expiresAt: {
          not: null,
          lte: now,
        },

        /*
         * Um pagamento aprovado nunca pode
         * ser cancelado pelo cron.
         */
        OR: [
          {
            payment: {
              is: null,
            },
          },
          {
            payment: {
              is: {
                status: {
                  not: "APPROVED",
                },
              },
            },
          },
        ],
      },

      select: {
        id: true,
      },

      orderBy: {
        expiresAt: "asc",
      },

      take:
        MAXIMUM_ORDERS_PER_RUN,
    });

  let canceledCount = 0;
  let ignoredCount = 0;

  for (const order of expiredOrders) {
    /*
     * O updateMany funciona como uma trava
     * otimista. Apenas uma execução consegue
     * trocar PENDING por CANCELED.
     */
    const updateResult =
      await prisma.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",

          expiresAt: {
            not: null,
            lte: now,
          },

          OR: [
            {
              payment: {
                is: null,
              },
            },
            {
              payment: {
                is: {
                  status: {
                    not: "APPROVED",
                  },
                },
              },
            },
          ],
        },

        data: {
          status: "CANCELED",
        },
      });

    /*
     * Se outra execução já processou esse
     * pedido, não criamos histórico duplicado.
     */
    if (updateResult.count !== 1) {
      ignoredCount += 1;
      continue;
    }

    await prisma.$transaction([
      prisma.payment.updateMany({
        where: {
          orderId: order.id,

          status: {
            not: "APPROVED",
          },
        },

        data: {
          status: "CANCELED",
        },
      }),

      prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CANCELED",

          title:
            "Pedido cancelado automaticamente",

          message:
            "O prazo de pagamento expirou e o pedido foi cancelado automaticamente.",
        },
      }),
    ]);

    /*
     * Não devolvemos estoque aqui porque,
     * atualmente, o checkout não reserva nem
     * reduz o estoque ao criar o pedido.
     *
     * Quando implementarmos a reserva de
     * estoque, adicionaremos uma marcação
     * específica para impedir devolução dupla.
     */
    canceledCount += 1;
  }

  return {
    found: expiredOrders.length,
    canceled: canceledCount,
    ignored: ignoredCount,
  };
}