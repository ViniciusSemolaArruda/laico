import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type CanceledOrderForCleanup = {
  id: string;

  payment: {
    status: string;
  } | null;
};

export async function DELETE() {
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
    const limitDate =
      new Date(
        Date.now() -
          30 *
            24 *
            60 *
            60 *
            1000
      );

    /*
     * Primeiro buscamos os pedidos para garantir
     * que nenhum pagamento aprovado será apagado.
     */
    const canceledOrders: CanceledOrderForCleanup[] =
      await prisma.order.findMany({
        where: {
          status: "CANCELED",

          createdAt: {
            lt: limitDate,
          },

          payment: {
            isNot: {
              status:
                "APPROVED",
            },
          },
        },

        select: {
          id: true,

          payment: {
            select: {
              status: true,
            },
          },
        },
      });

    const safeOrderIds =
      canceledOrders
        .filter(
          (order) =>
            order.payment
              ?.status !==
            "APPROVED"
        )
        .map(
          (order) =>
            order.id
        );

    if (
      safeOrderIds.length === 0
    ) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message:
          "Nenhum pedido cancelado antigo foi encontrado.",
      });
    }

    const result =
      await prisma.order.deleteMany({
        where: {
          id: {
            in: safeOrderIds,
          },

          status:
            "CANCELED",

          createdAt: {
            lt: limitDate,
          },

          payment: {
            isNot: {
              status:
                "APPROVED",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,

      deleted:
        result.count,

      message: `${result.count} pedido(s) cancelado(s) antigo(s) apagado(s).`,
    });
  } catch (error) {
    console.error(
      "Erro ao apagar pedidos cancelados antigos:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao apagar pedidos cancelados antigos.",
      },
      {
        status: 500,
      }
    );
  }
}