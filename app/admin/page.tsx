import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, ShoppingBag, Users, Wallet, Plus } from "lucide-react";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/app/components/admin/AdminSidebar";

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminPage() {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const [ordersCount, usersCount, productsCount, paidOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.findMany({
        where: { status: "PAID" },
        select: { total: true },
      }),
    ]);

  const revenue = paidOrders.reduce(
    (total, order) => total + Number(order.total),
    0
  );

  const cards = [
    {
      title: "Pedidos",
      value: ordersCount,
      subtitle: "Total de pedidos",
      icon: <ShoppingBag size={22} />,
      color: "border-t-[#b98218]",
    },
    {
      title: "Clientes",
      value: usersCount,
      subtitle: "Clientes cadastrados",
      icon: <Users size={22} />,
      color: "border-t-[#20170f]",
    },
    {
      title: "Produtos",
      value: productsCount,
      subtitle: "Produtos ativos",
      icon: <Package size={22} />,
      color: "border-t-[#d9b66b]",
    },
    {
      title: "Faturamento pago",
      value: formatPrice(revenue),
      subtitle: "Receita confirmada",
      icon: <Wallet size={22} />,
      color: "border-t-green-600",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <AdminSidebar />

      <section className="ml-[270px] min-h-screen">
        <header className="h-[78px] bg-white border-b border-[#e8dcc2] px-8 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-[22px] font-extrabold text-[#20170f]">
              Dashboard
            </h1>
            <p className="text-sm text-neutral-500">
              Visão geral da loja, vendas, pedidos e produtos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/pedidos"
              className="h-11 px-5 rounded-xl border border-[#e8dcc2] bg-white text-[#20170f] font-bold flex items-center hover:bg-[#faf9f6] transition"
            >
              Ver pedidos
            </Link>

            <Link
              href="/admin/produtos/novo"
              className="h-11 px-5 rounded-xl bg-[#b98218] text-white font-bold flex items-center gap-2 shadow-lg hover:bg-[#9f6f14] transition"
            >
              <Plus size={18} />
              Novo produto
            </Link>
          </div>
        </header>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-[36px] font-extrabold text-[#20170f]">
              Painel de Controle
            </h2>
            <p className="text-neutral-600 mt-1">
              Acompanhe o desempenho do e-commerce laico em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {cards.map((card) => (
              <section
                key={card.title}
                className={`bg-white border border-[#e8dcc2] border-t-4 ${card.color} rounded-2xl p-6 shadow-sm hover:shadow-md transition`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#fff8e8] text-[#b98218] flex items-center justify-center">
                    {card.icon}
                  </div>

                  <div>
                    <strong className="text-[30px] leading-none text-[#20170f]">
                      {card.value}
                    </strong>

                    <p className="text-neutral-500 text-[14px] mt-1">
                      {card.title}
                    </p>

                    <p className="text-green-700 text-[12px] font-bold mt-1">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-7">
            <section className="bg-white border border-[#e8dcc2] rounded-2xl p-6 shadow-sm min-h-[330px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-extrabold text-[#20170f]">
                  Vendas por categoria
                </h3>

                <span className="px-3 py-1 rounded-full bg-[#fff8e8] text-[#b98218] text-xs font-bold">
                  Loja
                </span>
              </div>

              <div className="h-[240px] flex items-center justify-center text-neutral-400 text-sm">
                Área para gráfico de categorias
              </div>
            </section>

            <section className="bg-white border border-[#e8dcc2] rounded-2xl p-6 shadow-sm min-h-[330px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-extrabold text-[#20170f]">
                  Pedidos x Faturamento
                </h3>

                <span className="px-3 py-1 rounded-full bg-[#fff8e8] text-[#b98218] text-xs font-bold">
                  Mensal
                </span>
              </div>

              <div className="h-[240px] flex items-center justify-center text-neutral-400 text-sm">
                Área para gráfico de vendas
              </div>
            </section>
          </div>

          <section className="bg-white border border-[#e8dcc2] rounded-2xl p-6 shadow-sm mt-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-extrabold text-[#20170f]">
                Próximas ações recomendadas
              </h3>

              <Link
                href="/admin/produtos"
                className="text-[#b98218] font-bold text-sm hover:underline"
              >
                Ver produtos →
              </Link>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <strong>Cadastrar produtos principais</strong>
                  <span className="text-neutral-500">Prioridade alta</span>
                </div>
                <div className="h-2 rounded-full bg-[#eee2cc]">
                  <div className="h-2 rounded-full bg-[#b98218] w-[65%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <strong>Finalizar checkout e pagamento</strong>
                  <span className="text-neutral-500">Em andamento</span>
                </div>
                <div className="h-2 rounded-full bg-[#eee2cc]">
                  <div className="h-2 rounded-full bg-[#20170f] w-[35%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <strong>Configurar pedidos e estoque</strong>
                  <span className="text-neutral-500">Pendente</span>
                </div>
                <div className="h-2 rounded-full bg-[#eee2cc]">
                  <div className="h-2 rounded-full bg-green-700 w-[20%]" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}