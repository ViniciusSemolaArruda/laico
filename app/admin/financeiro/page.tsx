import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminFinancePage() {
  const paidOrders = await prisma.order.findMany({
    where: { status: "PAID" },
    select: { total: true },
  });

  const pendingOrders = await prisma.order.findMany({
    where: { status: "PENDING" },
    select: { total: true },
  });

  const paidRevenue = paidOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  const pendingRevenue = pendingOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  return (
    <AdminShell
      title="Financeiro"
      description="Acompanhe faturamento, pagamentos e valores pendentes"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <section className="bg-white border-t-4 border-t-green-600 border border-[#e8dcc2] rounded-2xl p-6 shadow-sm">
          <p className="text-neutral-500">Faturamento Pago</p>
          <strong className="text-[32px] text-[#20170f]">
            {formatPrice(paidRevenue)}
          </strong>
        </section>

        <section className="bg-white border-t-4 border-t-[#b98218] border border-[#e8dcc2] rounded-2xl p-6 shadow-sm">
          <p className="text-neutral-500">Pendente</p>
          <strong className="text-[32px] text-[#20170f]">
            {formatPrice(pendingRevenue)}
          </strong>
        </section>

        <section className="bg-white border-t-4 border-t-[#20170f] border border-[#e8dcc2] rounded-2xl p-6 shadow-sm">
          <p className="text-neutral-500">Total Geral</p>
          <strong className="text-[32px] text-[#20170f]">
            {formatPrice(paidRevenue + pendingRevenue)}
          </strong>
        </section>
      </div>
    </AdminShell>
  );
}