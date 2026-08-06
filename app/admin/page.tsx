import {
  Package,
  Plus,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import type {
  ReactNode,
} from "react";

import AdminSidebar from "@/app/components/admin/AdminSidebar";

import {
  getAdminPermissionLevel,
  getAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";

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

type PaidOrderTotal = {
  total: unknown;
};

type DashboardCard = {
  title: string;

  value:
    | string
    | number;

  subtitle: string;

  icon:
    ReactNode;

  color: string;
};

/*
 * =========================================================
 * HIERARQUIA
 * =========================================================
 */

const permissionRank:
  Record<
    PermissionLevel,
    number
  > = {
    NONE:
      0,

    VIEW:
      1,

    EDIT:
      2,

    MANAGE:
      3,
  };

function hasLevel(
  level:
    PermissionLevel,

  required:
    Exclude<
      PermissionLevel,
      "NONE"
    >
) {
  return (
    permissionRank[
      level
    ] >=
    permissionRank[
      required
    ]
  );
}

/*
 * =========================================================
 * FORMATAÇÃO
 * =========================================================
 */

function formatPrice(
  value: number
) {
  return value.toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    }
  );
}

/*
 * =========================================================
 * PÁGINA
 * =========================================================
 */

export default async function AdminPage() {
  /*
   * =======================================================
   * SESSÃO
   * =======================================================
   */

  const session =
    await getAdminSession();

  if (!session) {
    redirect(
      "/admin/login"
    );
  }

  /*
   * =======================================================
   * AUTORIZAÇÃO DO DASHBOARD
   * =======================================================
   */

  const dashboardPermission =
    await getAdminPermissionLevel(
      "DASHBOARD",
      session
    );

  if (
    !session.isSuperAdmin &&
    !hasLevel(
      dashboardPermission,
      "VIEW"
    )
  ) {
    redirect(
      "/admin/acesso-negado?redirect=/admin"
    );
  }

  /*
   * =======================================================
   * ADMINISTRADOR / FUNCIONÁRIO
   * =======================================================
   */

  const admin =
    await prisma.user.findFirst({
      where: {
        id:
          session.userId,

        role:
          "ADMIN",

        adminProfile: {
          is: {
            active:
              true,
          },
        },
      },

      select: {
        id:
          true,

        name:
          true,

        adminProfile: {
          select: {
            jobTitle:
              true,

            active:
              true,

            isSuperAdmin:
              true,
          },
        },

        adminPermissions: {
          select: {
            module:
              true,

            level:
              true,
          },
        },
      },
    });

  /*
   * Depois deste ponto sabemos que:
   *
   * - admin existe;
   * - adminProfile existe;
   * - funcionário está ativo.
   */

  if (
    !admin ||
    !admin.adminProfile ||
    !admin.adminProfile.active
  ) {
    redirect(
      "/admin/login"
    );
  }

  /*
   * Guardamos as referências já validadas.
   *
   * Isso também evita problemas de narrowing
   * do TypeScript dentro das funções abaixo.
   */

  const adminProfile =
    admin.adminProfile;

  const adminName =
    admin.name;

  /*
   * =======================================================
   * MAPA DE PERMISSÕES
   * =======================================================
   */

  const permissions =
    Object.fromEntries(
      admin.adminPermissions.map(
        (
          permission
        ) => [
          permission.module,
          permission.level,
        ]
      )
    ) as Partial<
      Record<
        AdminModule,
        PermissionLevel
      >
    >;

  /*
   * =======================================================
   * PERMISSÃO POR MÓDULO
   * =======================================================
   */

  function getPermission(
    adminModule:
      AdminModule
  ): PermissionLevel {
    /*
     * Super Admin possui acesso
     * total a todos os módulos.
     */

    if (
      adminProfile.isSuperAdmin
    ) {
      return "MANAGE";
    }

    return (
      permissions[
        adminModule
      ] ??
      "NONE"
    );
  }

  /*
   * =======================================================
   * PERMISSÕES NECESSÁRIAS NESTA PÁGINA
   * =======================================================
   */

  const canViewOrders =
    hasLevel(
      getPermission(
        "ORDERS"
      ),
      "VIEW"
    );

  const canViewCustomers =
    hasLevel(
      getPermission(
        "CUSTOMERS"
      ),
      "VIEW"
    );

  const canViewProducts =
    hasLevel(
      getPermission(
        "PRODUCTS"
      ),
      "VIEW"
    );

  const canEditProducts =
    hasLevel(
      getPermission(
        "PRODUCTS"
      ),
      "EDIT"
    );

  const canViewFinance =
    hasLevel(
      getPermission(
        "FINANCE"
      ),
      "VIEW"
    );

  /*
   * =======================================================
   * CONSULTAS
   * =======================================================
   *
   * Um funcionário não consulta dados de módulos
   * para os quais não possui autorização.
   */

  const [
    ordersCount,
    usersCount,
    productsCount,
    paidOrders,
  ]: [
    number | null,
    number | null,
    number | null,
    PaidOrderTotal[],
  ] =
    await Promise.all([
      /*
       * PEDIDOS
       */

      canViewOrders
        ? prisma.order.count()
        : Promise.resolve(
            null
          ),

      /*
       * CLIENTES
       */

      canViewCustomers
        ? prisma.user.count({
            where: {
              role:
                "USER",
            },
          })
        : Promise.resolve(
            null
          ),

      /*
       * PRODUTOS
       */

      canViewProducts
        ? prisma.product.count({
            where: {
              active:
                true,
            },
          })
        : Promise.resolve(
            null
          ),

      /*
       * FINANCEIRO
       */

      canViewFinance
        ? prisma.order.findMany({
            where: {
              status:
                "PAID",
            },

            select: {
              total:
                true,
            },
          })
        : Promise.resolve(
            []
          ),
    ]);

  /*
   * =======================================================
   * FATURAMENTO
   * =======================================================
   */

  const revenue =
    canViewFinance
      ? paidOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.total
            ),
          0
        )
      : 0;

  /*
   * =======================================================
   * CARDS
   * =======================================================
   */

  const cards:
    DashboardCard[] =
      [];

  /*
   * PEDIDOS
   */

  if (
    canViewOrders &&
    ordersCount !==
      null
  ) {
    cards.push({
      title:
        "Pedidos",

      value:
        ordersCount,

      subtitle:
        "Total de pedidos",

      icon: (
        <ShoppingBag
          size={22}
        />
      ),

      color:
        "border-t-[#b98218]",
    });
  }

  /*
   * CLIENTES
   */

  if (
    canViewCustomers &&
    usersCount !==
      null
  ) {
    cards.push({
      title:
        "Clientes",

      value:
        usersCount,

      subtitle:
        "Clientes cadastrados",

      icon: (
        <Users
          size={22}
        />
      ),

      color:
        "border-t-[#20170f]",
    });
  }

  /*
   * PRODUTOS
   */

  if (
    canViewProducts &&
    productsCount !==
      null
  ) {
    cards.push({
      title:
        "Produtos",

      value:
        productsCount,

      subtitle:
        "Produtos ativos",

      icon: (
        <Package
          size={22}
        />
      ),

      color:
        "border-t-[#d9b66b]",
    });
  }

  /*
   * FINANCEIRO
   */

  if (
    canViewFinance
  ) {
    cards.push({
      title:
        "Faturamento pago",

      value:
        formatPrice(
          revenue
        ),

      subtitle:
        "Receita confirmada",

      icon: (
        <Wallet
          size={22}
        />
      ),

      color:
        "border-t-green-600",
    });
  }

  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <AdminSidebar
        adminName={
          adminName
        }
        jobTitle={
          adminProfile.jobTitle
        }
        isSuperAdmin={
          adminProfile.isSuperAdmin
        }
        permissions={
          permissions
        }
      />

      <section className="min-h-screen lg:ml-[270px]">
        {/* ===============================================
            TOPBAR
            =============================================== */}

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
            {/* PEDIDOS */}

            {canViewOrders && (
              <Link
                href="/admin/pedidos"
                className="flex h-11 items-center rounded-xl border border-[#e8dcc2] bg-white px-5 font-bold text-[#20170f] transition hover:bg-[#faf9f6]"
              >
                Ver pedidos
              </Link>
            )}

            {/* NOVO PRODUTO */}

            {canEditProducts && (
              <Link
                href="/admin/produtos/novo"
                className="flex h-11 items-center gap-2 rounded-xl bg-[#b98218] px-5 font-bold text-white shadow-lg transition hover:bg-[#9f6f14]"
              >
                <Plus
                  size={
                    18
                  }
                />

                Novo produto
              </Link>
            )}
          </div>
        </header>

        {/* ===============================================
            CONTEÚDO
            =============================================== */}

        <div className="p-5 lg:p-8">
          <div className="mb-8">
            <h2 className="text-[30px] font-extrabold text-[#20170f] sm:text-[36px]">
              Painel de controle
            </h2>

            <p className="mt-1 text-neutral-600">
              Acompanhe somente
              as áreas autorizadas
              para o seu perfil.
            </p>
          </div>

          {/* =============================================
              CARDS
              ============================================= */}

          {cards.length >
          0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(
                (
                  card
                ) => (
                  <section
                    key={
                      card.title
                    }
                    className={`rounded-2xl border border-[#e8dcc2] border-t-4 ${card.color} bg-white p-6 shadow-sm transition hover:shadow-md`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                        {
                          card.icon
                        }
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
          ) : (
            <section className="rounded-2xl border border-[#e8dcc2] bg-white p-8 shadow-sm">
              <strong className="text-[#20170f]">
                Nenhum módulo
                adicional liberado
              </strong>

              <p className="mt-2 text-sm text-neutral-500">
                Seu perfil possui
                acesso ao Dashboard,
                mas ainda não possui
                acesso aos dados dos
                demais módulos.
              </p>
            </section>
          )}

          {/* =============================================
              GESTÃO DA LOJA
              ============================================= */}

          {canViewProducts && (
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
                Acompanhe os
                produtos e o
                estoque conforme
                as permissões
                atribuídas ao seu
                perfil.
              </p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}