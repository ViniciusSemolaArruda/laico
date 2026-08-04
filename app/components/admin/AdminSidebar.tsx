"use client";

import {
  BarChart3,
  Image,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  TicketPercent,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useState } from "react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Produtos",
    href: "/admin/produtos",
    icon: Package,
  },
  {
    label: "Pedidos",
    href: "/admin/pedidos",
    icon: ShoppingBag,
  },
  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
  },
  {
    label: "Categorias",
    href: "/admin/categorias",
    icon: Tags,
  },
  {
    label: "Banners",
    href: "/admin/banners",
    icon: Image,
  },
  {
    label: "Cupons",
    href: "/admin/cupons",
    icon: TicketPercent,
  },
  {
    label: "Financeiro",
    href: "/admin/financeiro",
    icon: Wallet,
  },
  {
    label: "Relatórios",
    href: "/admin/relatorios",
    icon: BarChart3,
  },
  {
    label: "Configurações",
    href: "/admin/configuracoes",
    icon: Settings,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] =
    useState(false);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch(
        "/api/admin/logout",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Não foi possível encerrar a sessão."
        );
      }

      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error instanceof Error
          ? error.message
          : "Erro desconhecido."
      );

      alert(
        "Não foi possível sair do sistema. Tente novamente."
      );

      setLoggingOut(false);
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[270px] border-r border-[#3a2b1b] bg-[#20170f] text-white">
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#b98218] shadow-lg">
              <Store size={23} />
            </div>

            <div>
              <h1 className="font-extrabold leading-tight">
                E-commerce
              </h1>

              <p className="text-xs text-[#d9b66b]">
                Laico Admin
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Navegação
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            /*
             * Dashboard fica ativo somente
             * em /admin. Antes ele também
             * ficava ativo nas subpáginas.
             */
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname ===
                      item.href ||
                  pathname.startsWith(
                    `${item.href}/`
                  );

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={`flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold transition ${
                  active
                    ? "bg-[#b98218] text-white shadow-lg"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  size={19}
                  aria-hidden="true"
                />

                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Store
              size={18}
              aria-hidden="true"
            />

            Ver loja
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut
                size={18}
                aria-hidden="true"
              />
            )}

            {loggingOut
              ? "Saindo..."
              : "Sair do sistema"}
          </button>
        </div>
      </div>
    </aside>
  );
}