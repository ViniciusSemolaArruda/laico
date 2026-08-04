import AdminShell from "@/app/components/admin/AdminShell";
import CancelExpiredOrdersButton from "@/app/components/admin/CancelExpiredOrdersButton";
import { prisma } from "@/lib/prisma";

function formatPrice(value: unknown) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getOrderStatusStyle(status: string) {
  switch (status) {
    case "PAID":
      return "bg-green-100 text-green-700";
    case "PROCESSING":
      return "bg-blue-100 text-blue-700";
    case "SHIPPED":
      return "bg-purple-100 text-purple-700";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-[#fff8e8] text-[#b98218]";
  }
}

function getPaymentStatusStyle(status?: string) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    case "REFUNDED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      user: true,
      payment: true,
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const paidOrders = orders.filter((order) => order.status === "PAID").length;
  const canceledOrders = orders.filter((order) => order.status === "CANCELED").length;

  return (
    <AdminShell
      title="Pedidos"
      description="Acompanhe compras, pagamentos e entregas"
    >
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[34px] font-extrabold text-[#20170f]">
            Pedidos Recebidos
          </h2>

          <p className="mt-1 text-neutral-600">
            Gerencie os pedidos feitos na loja e acompanhe os pagamentos.
          </p>
        </div>

        <CancelExpiredOrdersButton />
      </div>

      <div className="mb-7 grid grid-cols-1 gap-5 md:grid-cols-4">
        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-[#20170f] bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Total de pedidos</p>
          <strong className="mt-2 block text-[30px] text-[#20170f]">
            {totalOrders}
          </strong>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-[#b98218] bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Aguardando pagamento</p>
          <strong className="mt-2 block text-[30px] text-[#20170f]">
            {pendingOrders}
          </strong>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-green-600 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Pagos</p>
          <strong className="mt-2 block text-[30px] text-[#20170f]">
            {paidOrders}
          </strong>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-red-600 bg-white p-5 shadow-sm">
          <p className="text-sm text-neutral-500">Cancelados</p>
          <strong className="mt-2 block text-[30px] text-[#20170f]">
            {canceledOrders}
          </strong>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="border-b border-[#eee2cc] bg-[#faf9f6] px-5 py-4">
          <h3 className="text-[18px] font-extrabold text-[#20170f]">
            Lista de pedidos
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-white text-[#20170f]">
              <tr>
                <th className="p-4 text-left">Pedido</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Itens</th>
                <th className="p-4 text-left">Total</th>
                <th className="p-4 text-left">Status do pedido</th>
                <th className="p-4 text-left">Pagamento</th>
                <th className="p-4 text-left">Criado em</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const paymentStatus = order.payment?.status || "PENDING";

                return (
                  <tr
                    key={order.id}
                    className="border-t border-[#eee2cc] transition hover:bg-[#faf9f6]"
                  >
                    <td className="p-4">
                      <strong className="text-[#20170f]">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </strong>
                    </td>

                    <td className="p-4">
                      <strong>{order.user.name}</strong>
                      <p className="text-xs text-neutral-500">
                        {order.user.email}
                      </p>
                    </td>

                    <td className="p-4">
                      <strong>{order.items.length}</strong> produto(s)
                    </td>

                    <td className="p-4 font-extrabold text-[#20170f]">
                      {formatPrice(order.total)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${getOrderStatusStyle(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${getPaymentStatusStyle(
                          paymentStatus
                        )}`}
                      >
                        {paymentStatus}
                      </span>
                    </td>

                    <td className="p-4 text-neutral-600">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-10 text-center text-neutral-500"
                  >
                    Nenhum pedido encontrado.
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