"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  LoaderCircle,
  LogIn,
  LogOut,
  Package,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type ActivityItem = {
  id: string;
  module: string;
  action: string;
  actionLabel: string;
  entityType: string;

  entityId:
    | string
    | null;

  changes:
    unknown;

  createdAt:
    string;

  dateBrasilia:
    string;

  dayBrasilia:
    string;

  timeBrasilia:
    string;
};

type ActivityResponse = {
  success?: boolean;

  employee?: {
    id: string;
    name: string;
    email: string;
    jobTitle: string;
    active: boolean;

    removedAt:
      | string
      | null;

    createdAt:
      string;

    lastLoginAt:
      | string
      | null;

    lastLoginAtBrasilia:
      | string
      | null;
  };

  activities?:
    ActivityItem[];

  summary?: {
    logins:
      number;

    logouts:
      number;

    operations:
      number;
  };

  pagination?: {
    page:
      number;

    limit:
      number;

    total:
      number;

    totalPages:
      number;

    hasPreviousPage:
      boolean;

    hasNextPage:
      boolean;
  };

  error?: string;
};

type EmployeeActivityPanelProps = {
  employeeId:
    string;

  employeeName:
    string;

  onClose:
    () => void;
};

/*
 * =========================================================
 * MÓDULOS
 * =========================================================
 */

const moduleOptions = [
  {
    value: "",
    label:
      "Todas as áreas",
  },

  {
    value:
      "DASHBOARD",
    label:
      "Acesso / Dashboard",
  },

  {
    value:
      "PRODUCTS",
    label:
      "Produtos",
  },

  {
    value:
      "ORDERS",
    label:
      "Pedidos",
  },

  {
    value:
      "CUSTOMERS",
    label:
      "Clientes",
  },

  {
    value:
      "CATEGORIES",
    label:
      "Categorias",
  },

  {
    value:
      "BANNERS",
    label:
      "Banners",
  },

  {
    value:
      "COUPONS",
    label:
      "Cupons",
  },

  {
    value:
      "FINANCE",
    label:
      "Financeiro",
  },

  {
    value:
      "REPORTS",
    label:
      "Relatórios",
  },

  {
    value:
      "SETTINGS",
    label:
      "Configurações",
  },

  {
    value:
      "EMPLOYEES",
    label:
      "Funcionários",
  },
];

/*
 * =========================================================
 * ÍCONE
 * =========================================================
 */

function getActivityIcon(
  action: string
) {
  if (
    action ===
    "ADMIN_LOGIN"
  ) {
    return LogIn;
  }

  if (
    action ===
    "ADMIN_LOGOUT"
  ) {
    return LogOut;
  }

  if (
    action.includes(
      "PRODUCT"
    ) ||
    action.includes(
      "STOCK"
    )
  ) {
    return Package;
  }

  if (
    action.includes(
      "PERMISSION"
    )
  ) {
    return ShieldCheck;
  }

  return Activity;
}

/*
 * =========================================================
 * CORES
 * =========================================================
 */

function getActivityColor(
  action: string
) {
  if (
    action ===
    "ADMIN_LOGIN"
  ) {
    return {
      icon:
        "bg-green-50 text-green-600",

      line:
        "bg-green-200",
    };
  }

  if (
    action ===
    "ADMIN_LOGOUT"
  ) {
    return {
      icon:
        "bg-red-50 text-red-600",

      line:
        "bg-red-200",
    };
  }

  if (
    action.includes(
      "STOCK"
    )
  ) {
    return {
      icon:
        "bg-blue-50 text-blue-600",

      line:
        "bg-blue-200",
    };
  }

  return {
    icon:
      "bg-[#fff8e8] text-[#b98218]",

    line:
      "bg-[#e8dcc2]",
  };
}

/*
 * =========================================================
 * LABEL DO MÓDULO
 * =========================================================
 */

function getModuleLabel(
  value: string
) {
  return (
    moduleOptions.find(
      (option) =>
        option.value ===
        value
    )?.label ??
    value
  );
}

/*
 * =========================================================
 * LOGIN / LOGOUT
 * =========================================================
 */

function isAccessActivity(
  action: string
) {
  return (
    action ===
      "ADMIN_LOGIN" ||
    action ===
      "ADMIN_LOGOUT"
  );
}

/*
 * =========================================================
 * CAMPOS QUE PODEM APARECER NA INTERFACE
 * =========================================================
 *
 * Whitelist.
 *
 * Somente campos explicitamente permitidos
 * aparecem na tela.
 *
 * Portanto não aparecem:
 *
 * sessionId
 * isSuperAdmin
 * event
 * password
 * passwordHash
 * token
 * secret
 * cookie
 * JWT
 * etc.
 */

const SAFE_CHANGE_FIELDS =
  new Set([
    "name",
    "productName",
    "sku",

    "stock",
    "previousStock",
    "newStock",

    "quantity",

    "status",
    "previousStatus",
    "newStatus",

    "jobTitle",
    "role",
    "active",

    "permission",
    "permissions",

    "field",
    "oldValue",
    "newValue",
  ]);

/*
 * =========================================================
 * NOMES AMIGÁVEIS
 * =========================================================
 */

const changeLabels:
  Record<
    string,
    string
  > = {
    name:
      "Nome",

    productName:
      "Produto",

    sku:
      "SKU",

    stock:
      "Estoque",

    previousStock:
      "Estoque anterior",

    newStock:
      "Novo estoque",

    quantity:
      "Quantidade",

    status:
      "Status",

    previousStatus:
      "Status anterior",

    newStatus:
      "Novo status",

    jobTitle:
      "Cargo",

    role:
      "Função",

    active:
      "Situação",

    permission:
      "Permissão",

    permissions:
      "Permissões",

    field:
      "Campo",

    oldValue:
      "Valor anterior",

    newValue:
      "Novo valor",
  };

/*
 * =========================================================
 * FORMATAÇÃO SEGURA
 * =========================================================
 */

function formatSafeValue(
  value: unknown
): string | null {
  if (
    typeof value ===
    "string"
  ) {
    return value.slice(
      0,
      300
    );
  }

  if (
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }

  /*
   * Objetos arbitrários não são
   * exibidos diretamente.
   */

  return null;
}

/*
 * =========================================================
 * DETALHES SEGUROS
 * =========================================================
 */

function ChangesViewer({
  changes,
  action,
}: {
  changes:
    unknown;

  action:
    string;
}) {
  /*
   * Login e logout não mostram detalhes.
   */

  if (
    isAccessActivity(
      action
    )
  ) {
    return null;
  }

  if (
    !changes ||
    typeof changes !==
      "object" ||
    Array.isArray(
      changes
    )
  ) {
    return null;
  }

  const safeEntries =
    Object.entries(
      changes as Record<
        string,
        unknown
      >
    )
      .filter(
        ([key]) =>
          SAFE_CHANGE_FIELDS.has(
            key
          )
      )
      .map(
        ([
          key,
          value,
        ]) => ({
          key,

          value:
            formatSafeValue(
              value
            ),
        })
      )
      .filter(
        (
          item
        ): item is {
          key: string;
          value: string;
        } =>
          item.value !==
          null
      );

  if (
    safeEntries.length ===
    0
  ) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-[#eee2cc] bg-[#faf9f6] px-4 py-3">
      {safeEntries.map(
        ({
          key,
          value,
        }) => (
          <div
            key={key}
            className="flex min-w-[150px] items-center gap-2 text-xs"
          >
            <span className="text-neutral-400">
              {changeLabels[
                key
              ] ??
                key}
              :
            </span>

            <strong className="break-words text-[#20170f]">
              {value}
            </strong>
          </div>
        )
      )}
    </div>
  );
}

/*
 * =========================================================
 * COMPONENTE
 * =========================================================
 */

export default function EmployeeActivityPanel({
  employeeId,
  employeeName,
  onClose,
}: EmployeeActivityPanelProps) {
  const [
    activities,
    setActivities,
  ] =
    useState<
      ActivityItem[]
    >([]);

  const [
    employee,
    setEmployee,
  ] =
    useState<
      ActivityResponse["employee"]
    >();

  const [
    summary,
    setSummary,
  ] =
    useState<
      ActivityResponse["summary"]
    >();

  const [
    pagination,
    setPagination,
  ] =
    useState<
      ActivityResponse["pagination"]
    >();

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    page,
    setPage,
  ] =
    useState(
      1
    );

  const [
    selectedModule,
    setSelectedModule,
  ] =
    useState("");

  /*
   * Usado pelo botão de tentar novamente.
   */

  const [
    refreshKey,
    setRefreshKey,
  ] =
    useState(
      0
    );

  /*
   * =======================================================
   * REQUEST
   * =======================================================
   */

  const loadActivity =
    useCallback(
      async (
        requestedPage:
          number,

        requestedModule:
          string
      ) => {
        const params =
          new URLSearchParams();

        params.set(
          "page",
          String(
            requestedPage
          )
        );

        params.set(
          "limit",
          "30"
        );

        if (
          requestedModule
        ) {
          params.set(
            "module",
            requestedModule
          );
        }

        const response =
          await fetch(
            `/api/admin/employees/${employeeId}/activity?${params.toString()}`,
            {
              method:
                "GET",

              credentials:
                "same-origin",

              cache:
                "no-store",
            }
          );

        const data =
          (await response.json()) as ActivityResponse;

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              "Não foi possível carregar o histórico."
          );
        }

        return data;
      },
      [
        employeeId,
      ]
    );

  /*
   * =======================================================
   * CARREGAMENTO
   * =======================================================
   *
   * IMPORTANTE:
   *
   * Não executamos setLoading(true) diretamente
   * dentro do effect.
   *
   * O loading é ativado pelos eventos:
   *
   * - mudança de filtro;
   * - próxima página;
   * - página anterior;
   * - tentar novamente.
   *
   * O primeiro carregamento começa com true
   * através do useState(true).
   */

  useEffect(() => {
    let mounted =
      true;

    void loadActivity(
      page,
      selectedModule
    )
      .then(
        (
          data
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          setActivities(
            data.activities ??
              []
          );

          setEmployee(
            data.employee
          );

          setSummary(
            data.summary
          );

          setPagination(
            data.pagination
          );

          setError(
            null
          );
        }
      )
      .catch(
        (
          requestError:
            unknown
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Não foi possível carregar o histórico."
          );
        }
      )
      .finally(
        () => {
          if (
            !mounted
          ) {
            return;
          }

          setLoading(
            false
          );
        }
      );

    return () => {
      mounted =
        false;
    };
  }, [
    loadActivity,
    page,
    selectedModule,
    refreshKey,
  ]);

  /*
   * =======================================================
   * FILTRO
   * =======================================================
   */

  function handleModuleChange(
    value: string
  ) {
    setLoading(
      true
    );

    setError(
      null
    );

    setPage(
      1
    );

    setSelectedModule(
      value
    );
  }

  /*
   * =======================================================
   * PÁGINA ANTERIOR
   * =======================================================
   */

  function previousPage() {
    if (
      !pagination
        ?.hasPreviousPage
    ) {
      return;
    }

    setLoading(
      true
    );

    setError(
      null
    );

    setPage(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );
  }

  /*
   * =======================================================
   * PRÓXIMA PÁGINA
   * =======================================================
   */

  function nextPage() {
    if (
      !pagination
        ?.hasNextPage
    ) {
      return;
    }

    setLoading(
      true
    );

    setError(
      null
    );

    setPage(
      (current) =>
        current + 1
    );
  }

  /*
   * =======================================================
   * TENTAR NOVAMENTE
   * =======================================================
   */

  function retry() {
    setError(
      null
    );

    setLoading(
      true
    );

    setRefreshKey(
      (current) =>
        current + 1
    );
  }

  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <section className="mb-7 overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
      {/* CABEÇALHO */}

      <div className="flex flex-col gap-4 border-b border-[#eee2cc] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
            <Activity
              size={21}
            />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-xl font-extrabold text-[#20170f]">
              Histórico de{" "}
              {employeeName}
            </h3>

            <p className="mt-0.5 text-xs text-neutral-500">
              Atividades administrativas
              e acessos ao sistema
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            onClose
          }
          aria-label="Fechar histórico"
          className="flex h-9 w-9 shrink-0 items-center justify-center self-end rounded-xl text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 sm:self-auto"
        >
          <X
            size={19}
          />
        </button>
      </div>

      {/* FUNCIONÁRIO */}

      {employee && (
        <div className="border-b border-[#eee2cc] bg-[#faf9f6] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-xs text-neutral-400">
                Cargo
              </span>

              <strong className="ml-2 text-[#20170f]">
                {
                  employee.jobTitle
                }
              </strong>
            </div>

            <div>
              <span className="text-xs text-neutral-400">
                Último login
              </span>

              <strong className="ml-2 text-[#20170f]">
                {employee.lastLoginAtBrasilia ||
                  "Nunca"}
              </strong>
            </div>

            <span
              className={
                employee.removedAt
                  ? "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                  : employee.active
                    ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                    : "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"
              }
            >
              {employee.removedAt
                ? "Removido"
                : employee.active
                  ? "Ativo"
                  : "Desativado"}
            </span>
          </div>
        </div>
      )}

      {/* RESUMO */}

      <div className="grid grid-cols-1 border-b border-[#eee2cc] sm:grid-cols-3">
        {/* LOGIN */}

        <div className="border-b border-[#eee2cc] p-4 sm:border-b-0 sm:border-r">
          <div className="flex items-center gap-3">
            <LogIn
              size={18}
              className="text-green-600"
            />

            <div>
              <strong className="block text-xl text-[#20170f]">
                {summary
                  ?.logins ??
                  0}
              </strong>

              <span className="text-xs text-neutral-500">
                Logins nesta página
              </span>
            </div>
          </div>
        </div>

        {/* LOGOUT */}

        <div className="border-b border-[#eee2cc] p-4 sm:border-b-0 sm:border-r">
          <div className="flex items-center gap-3">
            <LogOut
              size={18}
              className="text-red-600"
            />

            <div>
              <strong className="block text-xl text-[#20170f]">
                {summary
                  ?.logouts ??
                  0}
              </strong>

              <span className="text-xs text-neutral-500">
                Logouts nesta página
              </span>
            </div>
          </div>
        </div>

        {/* TOTAL */}

        <div className="p-4">
          <div className="flex items-center gap-3">
            <Activity
              size={18}
              className="text-[#b98218]"
            />

            <div>
              <strong className="block text-xl text-[#20170f]">
                {pagination
                  ?.total ??
                  0}
              </strong>

              <span className="text-xs text-neutral-500">
                Atividades encontradas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTROS */}

      <div className="flex flex-col gap-3 border-b border-[#eee2cc] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Filter
            size={17}
            className="shrink-0 text-[#b98218]"
          />

          <select
            value={
              selectedModule
            }
            onChange={(
              event
            ) =>
              handleModuleChange(
                event
                  .target
                  .value
              )
            }
            className="h-10 max-w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm font-semibold text-[#20170f] outline-none focus:border-[#b98218]"
          >
            {moduleOptions.map(
              (
                option
              ) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Clock3
            size={15}
          />

          Horário de Brasília
        </div>
      </div>

      {/* HISTÓRICO */}

      <div className="px-5 py-5 sm:px-6">
        {loading ? (
          /*
           * ===============================================
           * LOADING
           * ===============================================
           */

          <div className="flex min-h-[220px] items-center justify-center">
            <div className="text-center">
              <LoaderCircle
                size={30}
                className="mx-auto animate-spin text-[#b98218]"
              />

              <p className="mt-3 text-sm text-neutral-500">
                Carregando histórico...
              </p>
            </div>
          </div>
        ) : error ? (
          /*
           * ===============================================
           * ERRO
           * ===============================================
           */

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={
                retry
              }
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-red-700"
            >
              <RefreshCw
                size={15}
              />

              Tentar novamente
            </button>
          </div>
        ) : activities.length ===
          0 ? (
          /*
           * ===============================================
           * VAZIO
           * ===============================================
           */

          <div className="py-12 text-center">
            <Activity
              size={35}
              className="mx-auto text-neutral-300"
            />

            <strong className="mt-3 block text-[#20170f]">
              Nenhuma atividade
            </strong>

            <p className="mt-1 text-sm text-neutral-500">
              Não existem registros
              para o filtro
              selecionado.
            </p>
          </div>
        ) : (
          /*
           * ===============================================
           * ATIVIDADES
           * ===============================================
           */

          <div>
            {activities.map(
              (
                activityItem,
                index
              ) => {
                const Icon =
                  getActivityIcon(
                    activityItem.action
                  );

                const colors =
                  getActivityColor(
                    activityItem.action
                  );

                const accessActivity =
                  isAccessActivity(
                    activityItem.action
                  );

                return (
                  <div
                    key={
                      activityItem.id
                    }
                    className="relative flex gap-4"
                  >
                    {/* LINHA */}

                    {index <
                      activities.length -
                        1 && (
                      <div
                        className={`absolute bottom-0 left-[19px] top-10 w-[2px] ${colors.line}`}
                      />
                    )}

                    {/* ÍCONE */}

                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors.icon}`}
                    >
                      <Icon
                        size={18}
                      />
                    </div>

                    {/* EVENTO */}

                    <div className="min-w-0 flex-1 pb-6">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <strong className="text-sm text-[#20170f]">
                            {
                              activityItem.actionLabel
                            }
                          </strong>

                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#f4efe6] px-2 py-1 text-[10px] font-bold text-[#7a5422]">
                              {getModuleLabel(
                                activityItem.module
                              )}
                            </span>

                            {/*
                             * IDs internos não aparecem
                             * para login/logout.
                             */}

                            {!accessActivity &&
                              activityItem.entityId && (
                                <span className="text-[10px] text-neutral-400">
                                  ID:{" "}
                                  {
                                    activityItem.entityId
                                  }
                                </span>
                              )}
                          </div>
                        </div>

                        {/* DATA */}

                        <div className="shrink-0 sm:text-right">
                          <strong className="block text-xs text-[#20170f]">
                            {
                              activityItem.dayBrasilia
                            }
                          </strong>

                          <span className="text-[11px] text-neutral-400">
                            {
                              activityItem.timeBrasilia
                            }
                          </span>
                        </div>
                      </div>

                      {/* DETALHES */}

                      <ChangesViewer
                        changes={
                          activityItem.changes
                        }
                        action={
                          activityItem.action
                        }
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* PAGINAÇÃO */}

      {!loading &&
        !error &&
        pagination &&
        pagination.total >
          0 && (
          <div className="flex flex-col gap-3 border-t border-[#eee2cc] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-neutral-500">
              Página{" "}
              <strong>
                {
                  pagination.page
                }
              </strong>{" "}
              de{" "}
              <strong>
                {
                  pagination.totalPages
                }
              </strong>

              {" · "}

              {
                pagination.total
              }{" "}
              atividade(s)
            </p>

            <div className="flex gap-2">
              {/* ANTERIOR */}

              <button
                type="button"
                onClick={
                  previousPage
                }
                disabled={
                  !pagination.hasPreviousPage
                }
                className="flex h-9 items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-[#20170f] transition hover:bg-[#fff8e8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft
                  size={15}
                />

                Anterior
              </button>

              {/* PRÓXIMA */}

              <button
                type="button"
                onClick={
                  nextPage
                }
                disabled={
                  !pagination.hasNextPage
                }
                className="flex h-9 items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-[#20170f] transition hover:bg-[#fff8e8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próxima

                <ChevronRight
                  size={15}
                />
              </button>
            </div>
          </div>
        )}
    </section>
  );
}