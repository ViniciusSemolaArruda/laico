import { NextResponse } from "next/server";

import { requireAdminPermission } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ExpiredOrder = {
  id: string;

  payment: {
    status: string;
  } | null;

  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isRecordNotFoundError(error: unknown) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return error.code === "P2025";
}

function getAuthorizationResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.message === "ADMIN_UNAUTHORIZED") {
    return jsonResponse(
      {
        error: ACCESS_DENIED_MESSAGE,
      },
      401
    );
  }

  if (error.message === "ADMIN_FORBIDDEN") {
    return jsonResponse(
      {
        error: ACCESS_DENIED_MESSAGE,
      },
      403
    );
  }

  return null;
}

export async function POST(request: Request) {
  try {
    /*
     * É uma operação administrativa que altera vários
     * pedidos e estoque. Portanto exige ORDERS / MANAGE.
     */
    if (!isAllowedOrigin(request)) {
      return jsonResponse(
        {
          error: ACCESS_DENIED_MESSAGE,
        },
        403
      );
    }

    const session =
      await requireAdminPermission(
        "ORDERS",
        "MANAGE"
      );

    const now = new Date();

    /*
     * Checkout abandonado sem pagamento iniciado:
     * expira 30 minutos após a criação.
     */
    const abandonedLimit = new Date(
      Date.now() - 30 * 60 * 1000
    );

    const expiredOrders: ExpiredOrder[] =
      await prisma.order.findMany({
        where: {
          status: "PENDING",

          OR: [
            {
              expiresAt: {
                lt: now,
              },
            },
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

          payment: {
            select: {
              status: true,
            },
          },

          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

    let canceledCount = 0;
    let ignoredCount = 0;
    let failedCount = 0;

    for (const order of expiredOrders) {
      if (order.payment?.status === "APPROVED") {
        ignoredCount += 1;
        continue;
      }

      try {
        await prisma.$transaction(
          async (transaction) => {
            /*
             * O status PENDING impede sobrescrever uma
             * alteração concorrente. Se existir pagamento,
             * o update condicional também impede cancelar
             * um pagamento que se tornou APPROVED.
             */
            await transaction.order.update({
              where: {
                id: order.id,
                status: "PENDING",
              },

              data: {
                status: "CANCELED",

                payment: order.payment
                  ? {
                      update: {
                        where: {
                          status: {
                            not: "APPROVED",
                          },
                        },
                        data: {
                          status: "CANCELED",
                        },
                      },
                    }
                  : undefined,

                history: {
                  create: {
                    status: "CANCELED",
                    title: "Pedido cancelado",
                    message:
                      "O prazo para pagamento expirou e o pedido foi cancelado automaticamente.",
                  },
                },
              },
            });

            /*
             * O checkout já desconta/reserva o estoque ao
             * criar o pedido. Um pedido cancelado devolve as
             * unidades dentro da MESMA transação.
             */
            for (const item of order.items) {
              await transaction.product.update({
                where: {
                  id: item.productId,
                },
                data: {
                  stock: {
                    increment: item.quantity,
                  },
                },
              });
            }

            /*
             * Não registramos CPF, e-mail, endereço,
             * cookies, tokens ou credenciais na auditoria.
             */
            await transaction.adminAuditLog.create({
              data: {
                actorId: session.userId,
                module: "ORDERS",
                action: "ORDER_EXPIRED_CANCELED",
                entityType: "ORDER",
                entityId: order.id,
                changes: {
                  previousStatus: "PENDING",
                  nextStatus: "CANCELED",
                  reason: "PAYMENT_EXPIRED",
                },
              },
            });
          }
        );

        canceledCount += 1;
      } catch (error) {
        /*
         * P2025 é esperado se webhook/outro processo
         * alterar o pedido ou pagamento simultaneamente.
         * A transação inteira é revertida, inclusive estoque.
         */
        if (isRecordNotFoundError(error)) {
          ignoredCount += 1;
          continue;
        }

        failedCount += 1;

        console.error(
          "Falha ao cancelar um pedido expirado:",
          error instanceof Error
            ? error.name
            : "UnknownError"
        );
      }
    }

    return jsonResponse({
      success: failedCount === 0,
      found: expiredOrders.length,
      canceled: canceledCount,
      ignored: ignoredCount,
      failed: failedCount,
      message:
        failedCount > 0
          ? `${canceledCount} pedido(s) cancelado(s) e ${failedCount} pedido(s) com erro.`
          : `${canceledCount} pedido(s) expirado(s) cancelado(s).`,
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationResponse(error);

    if (authorizationResponse) {
      return authorizationResponse;
    }

    console.error(
      "Erro ao cancelar pedidos expirados:",
      error instanceof Error
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