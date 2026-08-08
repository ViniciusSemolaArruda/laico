import AdminShell from "@/app/components/admin/AdminShell";
import CancelExpiredOrdersButton from "@/app/components/admin/CancelExpiredOrdersButton";

import { redirect } from "next/navigation";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type AdminOrder = {
  id: string;
  status: string;
  total: unknown;
  createdAt: Date;

  user: {
    name: string;
    email: string;
  };

  payment: {
    status: string;
  } | null;

  items: Array<{
    id: string;
  }>;
};

function formatPrice(
  value: unknown
) {
  return Number(
    value
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

function getOrderStatusLabel(
  status: string
) {
  switch (status) {
    case "PENDING":
      return "Aguardando pagamento";

    case "PAID":
      return "Pago";

    case "PROCESSING":
      return "Em preparação";

    case "SHIPPED":
      return "Enviado";

    case "OUT_FOR_DELIVERY":
      return "Saiu para entrega";

    case "DELIVERED":
      return "Entregue";

    case "CANCELED":
      return "Cancelado";

    case "REFUNDED":
      return "Reembolsado";

    case "RETURNED":
      return "Devolvido";

    default:
      return status;
  }
}

function getOrderStatusStyle(
  status: string
) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";

    case "PROCESSING":
      return "bg-blue-100 text-blue-700";

    case "SHIPPED":
      return "bg-purple-100 text-purple-700";

    case "OUT_FOR_DELIVERY":
      return "bg-indigo-100 text-indigo-700";

    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700";

    case "CANCELED":
      return "bg-red-100 text-red-700";

    case "REFUNDED":
      return "bg-purple-100 text-purple-700";

    case "RETURNED":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-[#fff8e8] text-[#b98218]";
  }
}

function getPaymentStatusLabel(
  status: string
) {
  switch (status) {
    case "APPROVED":
      return "Aprovado";

    case "REJECTED":
      return "Recusado";

    case "CANCELED":
      return "Cancelado";

    case "REFUNDED":
      return "Reembolsado";

    default:
      return "Pendente";
  }
}

function getPaymentStatusStyle(
  status: string
) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";

    case "REJECTED":
    case "CANCELED":
      return "bg-red-100 text-red-700";

    case "REFUNDED":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-blue-100 text-blue-700";
  }
}

export default async function AdminOrdersPage() {
  /*
   * =====================================================
   * AUTORIZAÇÃO
   * =====================================================
   *
   * Esta página contém informações privadas dos
   * compradores.
   *
   * A autorização acontece ANTES de qualquer consulta
   * aos pedidos ou dados pessoais.
   */

  try {
    await requireAdminPermission(
      "ORDERS",
      "VIEW"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      redirect(
        "/admin/login"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_FORBIDDEN"
    ) {
      redirect(
        "/admin/acesso-negado?redirect=/admin/pedidos"
      );
    }

    throw error;
  }

  /*
   * =====================================================
   * PEDIDOS
   * =====================================================
   *
   * Só chegamos aqui depois da autorização.
   */

  const orders: AdminOrder[] =
    await prisma.order.findMany({
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,

        user: {
          select: {
            name: true,
            email: true,
          },
        },

        payment: {
          select: {
            status: true,
          },
        },

        items: {
          select: {
            id: true,
          },
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  const totalOrders =
    orders.length;

  const pendingOrders =
    orders.filter(
      (order) =>
        order.status ===
        "PENDING"
    ).length;

  const paidOrders =
    orders.filter(
      (order) =>
        order.status ===
        "PAID"
    ).length;

  const canceledOrders =
    orders.filter(
      (order) =>
        order.status ===
        "CANCELED"
    ).length;

  return (
    <AdminShell
      title="Pedidos"
      description="Acompanhe compras, pagamentos e entregas"
    >
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[30px] font-extrabold text-[#20170f] sm:text-[34px]">
            Pedidos recebidos
          </h2>

          <p className="mt-1 text-neutral-600">
            Gerencie pedidos,
            pagamentos e
            entregas da loja.
          </p>
        </div>

        {/*
         * A API deste botão já exige
         * ORDERS / MANAGE.
         *
         * Portanto, mesmo que alguém manipule
         * o navegador, não consegue executar
         * a operação sem autorização.
         */}

        <CancelExpiredOrdersButton />
      </div>

      <div className="mb-7 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label:
              "Total de pedidos",
            value:
              totalOrders,
            color:
              "border-t-[#20170f]",
          },

          {
            label:
              "Aguardando pagamento",
            value:
              pendingOrders,
            color:
              "border-t-[#b98218]",
          },

          {
            label:
              "Pagos",
            value:
              paidOrders,
            color:
              "border-t-green-600",
          },

          {
            label:
              "Cancelados",
            value:
              canceledOrders,
            color:
              "border-t-red-600",
          },
        ].map(
          (card) => (
            <section
              key={
                card.label
              }
              className={`rounded-2xl border border-[#e8dcc2] border-t-4 ${card.color} bg-white p-5 shadow-sm`}
            >
              <p className="text-sm text-neutral-500">
                {
                  card.label
                }
              </p>

              <strong className="mt-2 block text-[30px] text-[#20170f]">
                {
                  card.value
                }
              </strong>
            </section>
          )
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="border-b border-[#eee2cc] bg-[#faf9f6] px-5 py-4">
          <h3 className="text-[18px] font-extrabold text-[#20170f]">
            Lista de pedidos
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr>
                <th className="p-4 text-left">
                  Pedido
                </th>

                <th className="p-4 text-left">
                  Cliente
                </th>

                <th className="p-4 text-left">
                  Itens
                </th>

                <th className="p-4 text-left">
                  Total
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

                <th className="p-4 text-left">
                  Pagamento
                </th>

                <th className="p-4 text-left">
                  Criado em
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (order) => {
                  const paymentStatus =
                    order.payment
                      ?.status ||
                    "PENDING";

                  return (
                    <tr
                      key={
                        order.id
                      }
                      className="border-t border-[#eee2cc] transition hover:bg-[#faf9f6]"
                    >
                      <td className="p-4">
                        <strong className="text-[#20170f]">
                          #
                          {order.id
                            .slice(
                              0,
                              8
                            )
                            .toUpperCase()}
                        </strong>
                      </td>

                      <td className="p-4">
                        <strong>
                          {
                            order
                              .user
                              .name
                          }
                        </strong>

                        <p className="text-xs text-neutral-500">
                          {
                            order
                              .user
                              .email
                          }
                        </p>
                      </td>

                      <td className="p-4">
                        <strong>
                          {
                            order
                              .items
                              .length
                          }
                        </strong>{" "}
                        produto(s)
                      </td>

                      <td className="p-4 font-extrabold text-[#20170f]">
                        {formatPrice(
                          order.total
                        )}
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${getOrderStatusStyle(
                            order.status
                          )}`}
                        >
                          {getOrderStatusLabel(
                            order.status
                          )}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-extrabold ${getPaymentStatusStyle(
                            paymentStatus
                          )}`}
                        >
                          {getPaymentStatusLabel(
                            paymentStatus
                          )}
                        </span>
                      </td>

                      <td className="p-4 text-neutral-600">
                        {formatDate(
                          order.createdAt
                        )}
                      </td>
                    </tr>
                  );
                }
              )}

              {orders.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      7
                    }
                    className="p-10 text-center text-neutral-500"
                  >
                    Nenhum pedido
                    encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}