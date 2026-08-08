"use client";

import {
  BarChart3,
  Image as ImageIcon,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MonitorX,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  TicketPercent,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

type PermissionLevel =
  | "NONE"
  | "VIEW"
  | "EDIT"
  | "MANAGE";

type AdminModule =
  | "DASHBOARD"
  | "PRODUCTS"
  | "ORDERS"
  | "CUSTOMERS"
  | "CATEGORIES"
  | "BANNERS"
  | "COUPONS"
  | "FINANCE"
  | "REPORTS"
  | "SETTINGS";

type AdminSidebarProps = {
  adminName: string;
  jobTitle: string;

  isSuperAdmin:
    boolean;

  permissions:
    Partial<
      Record<
        AdminModule,
        PermissionLevel
      >
    >;
};

const menuItems: Array<{
  label: string;
  href: string;
  module: AdminModule;
  icon:
    typeof LayoutDashboard;
}> = [
  {
    label:
      "Dashboard",

    href:
      "/admin",

    module:
      "DASHBOARD",

    icon:
      LayoutDashboard,
  },

  {
    label:
      "Produtos",

    href:
      "/admin/produtos",

    module:
      "PRODUCTS",

    icon:
      Package,
  },

  {
    label:
      "Pedidos",

    href:
      "/admin/pedidos",

    module:
      "ORDERS",

    icon:
      ShoppingBag,
  },

  {
    label:
      "Clientes",

    href:
      "/admin/clientes",

    module:
      "CUSTOMERS",

    icon:
      Users,
  },

  {
    label:
      "Categorias",

    href:
      "/admin/categorias",

    module:
      "CATEGORIES",

    icon:
      Tags,
  },

  {
    label:
      "Banners",

    href:
      "/admin/banners",

    module:
      "BANNERS",

    icon:
      ImageIcon,
  },

  {
    label:
      "Cupons",

    href:
      "/admin/cupons",

    module:
      "COUPONS",

    icon:
      TicketPercent,
  },

  {
    label:
      "Financeiro",

    href:
      "/admin/financeiro",

    module:
      "FINANCE",

    icon:
      Wallet,
  },

  {
    label:
      "Relatórios",

    href:
      "/admin/relatorios",

    module:
      "REPORTS",

    icon:
      BarChart3,
  },

  {
    label:
      "Configurações",

    href:
      "/admin/configuracoes",

    module:
      "SETTINGS",

    icon:
      Settings,
  },
];

export default function AdminSidebar({
  adminName,
  jobTitle,
  isSuperAdmin,
  permissions,
}: AdminSidebarProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  const [
    loggingOutAll,
    setLoggingOutAll,
  ] =
    useState(false);

  /*
   * =======================================================
   * PERMISSÃO VISUAL
   * =======================================================
   *
   * Isto controla o menu.
   *
   * A segurança verdadeira continua
   * sendo repetida no servidor.
   */

  function canSeeModule(
    adminModule:
      AdminModule
  ) {
    if (
      isSuperAdmin
    ) {
      return true;
    }

    const level =
      permissions[
        adminModule
      ] ?? "NONE";

    return (
      level ===
        "VIEW" ||
      level ===
        "EDIT" ||
      level ===
        "MANAGE"
    );
  }

  const visibleMenuItems =
    menuItems.filter(
      (item) =>
        canSeeModule(
          item.module
        )
    );

  function isActive(
    href: string
  ) {
    if (
      href === "/admin"
    ) {
      return (
        pathname ===
        "/admin"
      );
    }

    return (
      pathname ===
        href ||
      pathname.startsWith(
        `${href}/`
      )
    );
  }

  /*
   * =======================================================
   * LOGOUT
   * =======================================================
   */

  async function handleLogout() {
    if (
      loggingOut ||
      loggingOutAll
    ) {
      return;
    }

    setLoggingOut(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/logout",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {}
              ),
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          "LOGOUT_FAILED"
        );
      }

      router.replace(
        "/admin/login"
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Erro ao sair:",
        error instanceof Error
          ? error.name
          : "UnknownError"
      );

      alert(
        "Não foi possível sair do sistema. Tente novamente."
      );

      setLoggingOut(
        false
      );
    }
  }

  /*
   * =======================================================
   * LOGOUT DE TODOS OS DISPOSITIVOS
   * =======================================================
   */

  async function handleLogoutAll() {
    if (
      loggingOut ||
      loggingOutAll
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Tem certeza que deseja sair de todos os dispositivos? Todas as sessões desta conta administrativa serão encerradas."
      );

    if (!confirmed) {
      return;
    }

    setLoggingOutAll(
      true
    );

    try {
      const response =
        await fetch(
          "/api/admin/logout",
          {
            method:
              "DELETE",

            credentials:
              "same-origin",
          }
        );

      let data: {
        error?: string;
        redirectTo?: string;
      } = {};

      try {
        data =
          (await response.json()) as {
            error?: string;
            redirectTo?: string;
          };
      } catch {
        // Uma resposta sem JSON é tratada abaixo.
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "LOGOUT_ALL_FAILED"
        );
      }

      router.replace(
        data.redirectTo ||
          "/admin/login"
      );

      router.refresh();
    } catch (
      error
    ) {
      console.error(
        "Erro ao encerrar todas as sessões:",
        error instanceof Error
          ? error.name
          : "UnknownError"
      );

      alert(
        "Não foi possível sair de todos os dispositivos. Tente novamente."
      );

      setLoggingOutAll(
        false
      );
    }
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[270px] border-r border-[#3a2b1b] bg-[#20170f] text-white">
      <div className="flex h-full flex-col">
        {/* ===============================================
            LOGO + FUNCIONÁRIO
            =============================================== */}

        <div className="border-b border-white/10 px-4 pb-4 pt-5">
          <Link
            href="/admin"
            className="flex justify-center"
            aria-label="Laico Admin"
          >
            <Image
              src="/logo3.png"
              alt="Laico"
              width={120}
              height={52}
              priority
              className="h-auto w-[120px] object-contain brightness-0 invert"
            />
          </Link>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b98218] text-white shadow">
              <UserRound
                size={20}
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <strong className="block truncate text-sm text-white">
                {adminName}
              </strong>

              <p className="mt-0.5 truncate text-[11px] text-[#d9b66b]">
                {isSuperAdmin
                  ? "Super Admin"
                  : jobTitle}
              </p>
            </div>
          </div>
        </div>

        {/* ===============================================
            NAVEGAÇÃO
            =============================================== */}

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Navegação
          </p>

          <div className="space-y-2">
            {visibleMenuItems.map(
              (
                item
              ) => {
                const Icon =
                  item.icon;

                const active =
                  isActive(
                    item.href
                  );

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                    className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition ${
                      active
                        ? "bg-[#b98218] text-white shadow-lg"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                    />

                    {
                      item.label
                    }
                  </Link>
                );
              }
            )}
          </div>

          {/* SUPER ADMIN */}

          {isSuperAdmin && (
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                Administração
              </p>

              <Link
                href="/admin/funcionarios"
                aria-current={
                  isActive(
                    "/admin/funcionarios"
                  )
                    ? "page"
                    : undefined
                }
                className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition ${
                  isActive(
                    "/admin/funcionarios"
                  )
                    ? "bg-[#b98218] text-white shadow-lg"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                <UserRound
                  size={18}
                  aria-hidden="true"
                />

                Funcionários
              </Link>
            </div>
          )}
        </nav>

        {/* ===============================================
            RODAPÉ
            =============================================== */}

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            className="flex h-10 items-center gap-3 rounded-xl px-4 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Store
              size={17}
              aria-hidden="true"
            />

            Ver loja
          </Link>

          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut ||
              loggingOutAll
            }
            className="flex h-10 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? (
              <LoaderCircle
                size={17}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <LogOut
                size={17}
                aria-hidden="true"
              />
            )}

            {loggingOut
              ? "Saindo..."
              : "Sair do sistema"}
          </button>

          <button
            type="button"
            onClick={
              handleLogoutAll
            }
            disabled={
              loggingOut ||
              loggingOutAll
            }
            className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-xl px-4 py-2 text-left text-[12px] font-bold leading-4 text-red-300/70 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOutAll ? (
              <LoaderCircle
                size={17}
                className="shrink-0 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <MonitorX
                size={17}
                className="shrink-0"
                aria-hidden="true"
              />
            )}

            {loggingOutAll
              ? "Encerrando sessões..."
              : "Sair de todos os dispositivos"}
          </button>
        </div>
      </div>
    </aside>
  );
}