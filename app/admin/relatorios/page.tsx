import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

export default async function AdminReportsPage() {
  const [orders, products, users] = await Promise.all([
    prisma.order.count(),
    prisma.product.count(),
    prisma.user.count(),
  ]);

  return (
    <AdminShell
      title="Relatórios"
      description="Resumo gerencial do desempenho da loja"
    >
      <section className="bg-white border border-[#e8dcc2] rounded-2xl p-8 shadow-sm">
        <h2 className="text-[30px] font-extrabold text-[#20170f] mb-6">
          Relatório Geral
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl bg-[#faf9f6] p-6 border border-[#e8dcc2]">
            <p className="text-neutral-500">Pedidos</p>
            <strong className="text-[34px]">{orders}</strong>
          </div>

          <div className="rounded-2xl bg-[#faf9f6] p-6 border border-[#e8dcc2]">
            <p className="text-neutral-500">Produtos</p>
            <strong className="text-[34px]">{products}</strong>
          </div>

          <div className="rounded-2xl bg-[#faf9f6] p-6 border border-[#e8dcc2]">
            <p className="text-neutral-500">Clientes</p>
            <strong className="text-[34px]">{users}</strong>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}