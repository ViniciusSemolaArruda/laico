"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tags,
  Image,
  TicketPercent,
  Wallet,
  Settings,
  LogOut,
  Store,
  BarChart3,
} from "lucide-react";

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Produtos", href: "/admin/produtos", icon: Package },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Categorias", href: "/admin/categorias", icon: Tags },
  { label: "Banners", href: "/admin/banners", icon: Image },
  { label: "Cupons", href: "/admin/cupons", icon: TicketPercent },
  { label: "Financeiro", href: "/admin/financeiro", icon: Wallet },
  { label: "Relatórios", href: "/admin/relatorios", icon: BarChart3 },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[270px] bg-[#20170f] text-white border-r border-[#3a2b1b]">
      <div className="h-full flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#b98218] flex items-center justify-center shadow-lg">
              <Store size={23} />
            </div>

            <div>
              <h1 className="font-extrabold leading-tight">E-commerce</h1>
              <p className="text-xs text-[#d9b66b]">Laico Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="px-3 mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Navegação
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-12 px-4 rounded-xl flex items-center gap-3 text-sm font-bold transition ${
                  active
                    ? "bg-[#b98218] text-white shadow-lg"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="h-11 px-4 rounded-xl flex items-center gap-3 text-sm font-bold text-white/70 hover:bg-white/10"
          >
            <Store size={18} />
            Ver loja
          </Link>

          <Link
  href="/api/admin/logout"
  className="h-11 px-4 rounded-xl flex items-center gap-3 text-sm font-bold text-red-300 hover:bg-red-500/10 transition"
>
  <LogOut size={18} />
  Sair do sistema
</Link>
        </div>
      </div>
    </aside>
  );
}