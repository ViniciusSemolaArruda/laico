import AdminSidebar from "@/app/components/admin/AdminSidebar";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  Package,
  Plus,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type {
  ReactNode,
} from "react";

type PaidOrderTotal = {
  total: unknown;
};

type DashboardCard = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: string;
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

export default async function AdminPage() {
  const session =
    await getAdminSession();

  if (!session) {
    redirect(
      "/admin/login"
    );
  }

  const [
    ordersCount,
    usersCount,
    productsCount,
    paidOrders,
  ]: [
    number,
    number,
    number,
    PaidOrderTotal[],
  ] = await Promise.all([
    prisma.order.count(),

    prisma.user.count({
      where: {
        role: "USER",
      },
    }),

    prisma.product.count({
      where: {
        active: true,
      },
    }),

    prisma.order.findMany({
      where: {
        status: "PAID",
      },

      select: {
        total: true,
      },
    }),
  ]);

  const revenue =
    paidOrders.reduce(
      (total, order) =>
        total +
        Number(order.total),
      0
    );

  const cards: DashboardCard[] =
    [
      {
        title: "Pedidos",
        value: ordersCount,
        subtitle:
          "Total de pedidos",
        icon: (
          <ShoppingBag
            size={22}
          />
        ),
        color:
          "border-t-[#b98218]",
      },
      {
        title: "Clientes",
        value: usersCount,
        subtitle:
          "Clientes cadastrados",
        icon: (
          <Users size={22} />
        ),
        color:
          "border-t-[#20170f]",
      },
      {
        title: "Produtos",
        value: productsCount,
        subtitle:
          "Produtos ativos",
        icon: (
          <Package
            size={22}
          />
        ),
        color:
          "border-t-[#d9b66b]",
      },
      {
        title:
          "Faturamento pago",
        value:
          formatPrice(revenue),
        subtitle:
          "Receita confirmada",
        icon: (
          <Wallet
            size={22}
          />
        ),
        color:
          "border-t-green-600",
      },
    ];

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <AdminSidebar />

      <section className="min-h-screen lg:ml-[270px]">
        <header className="sticky top-0 z-30 flex min-h-[78px] flex-wrap items-center justify-between gap-4 border-b border-[#e8dcc2] bg-white px-5 py-4 lg:px-8">
          <div>
            <h1 className="text-[22px] font-extrabold text-[#20170f]">
              Dashboard
            </h1>

            <p className="text-sm text-neutral-500">
              Visão geral da
              loja e das vendas
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/pedidos"
              className="flex h-11 items-center rounded-xl border border-[#e8dcc2] bg-white px-5 font-bold text-[#20170f] transition hover:bg-[#faf9f6]"
            >
              Ver pedidos
            </Link>

            <Link
              href="/admin/produtos/novo"
              className="flex h-11 items-center gap-2 rounded-xl bg-[#b98218] px-5 font-bold text-white shadow-lg transition hover:bg-[#9f6f14]"
            >
              <Plus size={18} />
              Novo produto
            </Link>
          </div>
        </header>

        <div className="p-5 lg:p-8">
          <div className="mb-8">
            <h2 className="text-[30px] font-extrabold text-[#20170f] sm:text-[36px]">
              Painel de controle
            </h2>

            <p className="mt-1 text-neutral-600">
              Acompanhe o
              desempenho do
              e-commerce em
              tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(
              (card) => (
                <section
                  key={
                    card.title
                  }
                  className={`rounded-2xl border border-[#e8dcc2] border-t-4 ${card.color} bg-white p-6 shadow-sm transition hover:shadow-md`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                      {card.icon}
                    </div>

                    <div>
                      <strong className="text-[30px] leading-none text-[#20170f]">
                        {
                          card.value
                        }
                      </strong>

                      <p className="mt-1 text-[14px] text-neutral-500">
                        {
                          card.title
                        }
                      </p>

                      <p className="mt-1 text-[12px] font-bold text-green-700">
                        {
                          card.subtitle
                        }
                      </p>
                    </div>
                  </div>
                </section>
              )
            )}
          </div>

          <section className="mt-7 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-[18px] font-extrabold text-[#20170f]">
                Gestão da loja
              </h3>

              <Link
                href="/admin/produtos"
                className="text-sm font-bold text-[#b98218] hover:underline"
              >
                Ver produtos →
              </Link>
            </div>

            <p className="text-sm leading-relaxed text-neutral-600">
              O checkout e os
              pagamentos estão
              integrados. Continue
              acompanhando os
              pedidos, o estoque e
              as notificações do
              Mercado Pago.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}