import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

type OrderTotal = {
  total: unknown;
};

function formatPrice(
  value: number
) {
  return value.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function sumOrders(
  orders: OrderTotal[]
) {
  return orders.reduce(
    (sum, order) =>
      sum +
      Number(order.total),
    0
  );
}

export default async function AdminFinancePage() {
  const [
    paidOrders,
    pendingOrders,
  ]: [
    OrderTotal[],
    OrderTotal[],
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: "PAID",
      },

      select: {
        total: true,
      },
    }),

    prisma.order.findMany({
      where: {
        status: "PENDING",
      },

      select: {
        total: true,
      },
    }),
  ]);

  const paidRevenue =
    sumOrders(paidOrders);

  const pendingRevenue =
    sumOrders(pendingOrders);

  const totalRevenue =
    paidRevenue +
    pendingRevenue;

  return (
    <AdminShell
      title="Financeiro"
      description="Acompanhe faturamento, pagamentos e valores pendentes"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-green-600 bg-white p-6 shadow-sm">
          <p className="text-neutral-500">
            Faturamento pago
          </p>

          <strong className="mt-2 block text-[32px] text-[#20170f]">
            {formatPrice(
              paidRevenue
            )}
          </strong>

          <p className="mt-2 text-xs text-green-700">
            {
              paidOrders.length
            }{" "}
            {paidOrders.length === 1
              ? "pedido pago"
              : "pedidos pagos"}
          </p>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-[#b98218] bg-white p-6 shadow-sm">
          <p className="text-neutral-500">
            Pendente
          </p>

          <strong className="mt-2 block text-[32px] text-[#20170f]">
            {formatPrice(
              pendingRevenue
            )}
          </strong>

          <p className="mt-2 text-xs text-[#b98218]">
            {
              pendingOrders.length
            }{" "}
            {pendingOrders.length === 1
              ? "pedido pendente"
              : "pedidos pendentes"}
          </p>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] border-t-4 border-t-[#20170f] bg-white p-6 shadow-sm">
          <p className="text-neutral-500">
            Total geral
          </p>

          <strong className="mt-2 block text-[32px] text-[#20170f]">
            {formatPrice(
              totalRevenue
            )}
          </strong>

          <p className="mt-2 text-xs text-neutral-500">
            Valores pagos e
            pendentes
          </p>
        </section>
      </div>
    </AdminShell>
  );
}