"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  History as HistoryIcon,
  LoaderCircle,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";

import type {
  FormEvent,
} from "react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import EmployeeActivityPanel from "@/app/components/admin/EmployeeActivityPanel";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

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

type Permissions =
  Record<
    AdminModule,
    PermissionLevel
  >;

type Employee = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  active: boolean;
  isSuperAdmin: boolean;

  lastLoginAt:
    | string
    | null;

  createdAt: string;
  updatedAt: string;

  createdBy: {
    id: string;
    name: string;
  } | null;

  permissions:
    Partial<Permissions>;
};

type EmployeesResponse = {
  success?: boolean;
  employees?: Employee[];
  employee?: Employee;
  error?: string;
  message?: string;
};

type FormMode =
  | "create"
  | "edit";

type HistoryEmployee = {
  id: string;
  name: string;
};

/*
 * =========================================================
 * CARGOS
 * =========================================================
 */

const JOB_TITLES = [
  "Administrador",
  "Gerente de E-commerce",
  "Coordenador de E-commerce",
  "Supervisor de E-commerce",
  "Gerente de Operações",
  "Coordenador de Operações",
  "Supervisor de Operações",
  "Analista de E-commerce",
  "Assistente de E-commerce",

  "Gerente de Produtos",
  "Coordenador de Produtos",
  "Analista de Produtos",
  "Assistente de Produtos",
  "Gestor de Catálogo",
  "Analista de Catálogo",
  "Assistente de Catálogo",

  "Gerente de Estoque",
  "Coordenador de Estoque",
  "Supervisor de Estoque",
  "Analista de Estoque",
  "Estoquista",
  "Auxiliar de Estoque",
  "Conferente",

  "Gerente de Pedidos",
  "Supervisor de Pedidos",
  "Operador de Pedidos",
  "Separador de Pedidos",
  "Auxiliar de Expedição",
  "Expedição",

  "Gerente de Logística",
  "Coordenador de Logística",
  "Supervisor de Logística",
  "Analista de Logística",
  "Assistente de Logística",

  "Gerente de Atendimento",
  "Supervisor de Atendimento",
  "Atendimento ao Cliente",
  "SAC",
  "Pós-venda",

  "Gerente Financeiro",
  "Coordenador Financeiro",
  "Analista Financeiro",
  "Assistente Financeiro",
  "Faturamento",
  "Contas a Pagar",
  "Contas a Receber",

  "Gerente Comercial",
  "Coordenador Comercial",
  "Supervisor Comercial",
  "Analista Comercial",
  "Assistente Comercial",

  "Gerente de Compras",
  "Comprador",
  "Analista de Compras",
  "Assistente de Compras",

  "Gerente de Marketing",
  "Coordenador de Marketing",
  "Analista de Marketing",
  "Assistente de Marketing",
  "Social Media",
  "Gestor de Tráfego",
  "CRM",
  "Copywriter",
  "Designer",
  "SEO",

  "Gestor de Banners",
  "Gestor de Cupons e Promoções",

  "Analista de Dados",
  "Analista de BI",
  "Business Intelligence",

  "TI",
  "Suporte Técnico",
  "Auditor",
] as const;

/*
 * =========================================================
 * MÓDULOS
 * =========================================================
 */

const modules: Array<{
  id: AdminModule;
  label: string;
  description: string;
}> = [
  {
    id: "DASHBOARD",
    label: "Dashboard",
    description:
      "Visão geral da operação.",
  },
  {
    id: "PRODUCTS",
    label: "Produtos",
    description:
      "Produtos, estoque, preços e imagens.",
  },
  {
    id: "ORDERS",
    label: "Pedidos",
    description:
      "Pedidos, status e entregas.",
  },
  {
    id: "CUSTOMERS",
    label: "Clientes",
    description:
      "Clientes e informações cadastrais.",
  },
  {
    id: "CATEGORIES",
    label: "Categorias",
    description:
      "Categorias e organização do catálogo.",
  },
  {
    id: "BANNERS",
    label: "Banners",
    description:
      "Banners e destaques da loja.",
  },
  {
    id: "COUPONS",
    label: "Cupons",
    description:
      "Cupons e promoções.",
  },
  {
    id: "FINANCE",
    label: "Financeiro",
    description:
      "Informações financeiras.",
  },
  {
    id: "REPORTS",
    label: "Relatórios",
    description:
      "Relatórios administrativos.",
  },
  {
    id: "SETTINGS",
    label: "Configurações",
    description:
      "Configurações gerais da loja.",
  },
];

const permissionOptions:
  Array<{
    value:
      PermissionLevel;
    label:
      string;
  }> = [
    {
      value: "NONE",
      label: "Sem acesso",
    },
    {
      value: "VIEW",
      label: "Visualizar",
    },
    {
      value: "EDIT",
      label: "Editar",
    },
    {
      value: "MANAGE",
      label: "Administrar",
    },
];

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function createEmptyPermissions(): Permissions {
  return {
    DASHBOARD: "NONE",
    PRODUCTS: "NONE",
    ORDERS: "NONE",
    CUSTOMERS: "NONE",
    CATEGORIES: "NONE",
    BANNERS: "NONE",
    COUPONS: "NONE",
    FINANCE: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  };
}

function normalizeEmployeePermissions(
  permissions:
    Partial<Permissions>
): Permissions {
  const result =
    createEmptyPermissions();

  for (
    const permissionModule of
    modules
  ) {
    result[
      permissionModule.id
    ] =
      permissions[
        permissionModule.id
      ] ??
      "NONE";
  }

  return result;
}

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "Nunca";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Sao_Paulo",

      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(date);
}

async function requestEmployees(): Promise<
  Employee[]
> {
  const response =
    await fetch(
      "/api/admin/employees",
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
    (await response.json()) as EmployeesResponse;

  if (
    !response.ok
  ) {
    throw new Error(
      data.error ||
        "Não foi possível carregar os funcionários."
    );
  }

  return (
    data.employees ??
    []
  );
}

/*
 * =========================================================
 * COMPONENTE
 * =========================================================
 */

export default function EmployeesManager() {
  const [
    employees,
    setEmployees,
  ] =
    useState<Employee[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    removingEmployeeId,
    setRemovingEmployeeId,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    formMode,
    setFormMode,
  ] =
    useState<FormMode>(
      "create"
    );

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    historyEmployee,
    setHistoryEmployee,
  ] =
    useState<
      HistoryEmployee | null
    >(null);

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    jobTitle,
    setJobTitle,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    active,
    setActive,
  ] =
    useState(true);

  const [
    permissions,
    setPermissions,
  ] =
    useState<Permissions>(
      createEmptyPermissions
    );

  /*
   * =======================================================
   * CARREGAR
   * =======================================================
   */

  const loadEmployees =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const loadedEmployees =
            await requestEmployees();

          setEmployees(
            loadedEmployees
          );
        } catch (
          requestError
        ) {
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Não foi possível carregar os funcionários."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    let mounted =
      true;

    void requestEmployees()
      .then(
        (
          loadedEmployees
        ) => {
          if (
            !mounted
          ) {
            return;
          }

          setEmployees(
            loadedEmployees
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
              : "Não foi possível carregar os funcionários."
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
  }, []);

  /*
   * =======================================================
   * BUSCA
   * =======================================================
   */

  const filteredEmployees =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      if (
        !normalizedSearch
      ) {
        return employees;
      }

      return employees.filter(
        (
          employee
        ) =>
          employee.name
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          employee.email
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          employee.jobTitle
            .toLowerCase()
            .includes(
              normalizedSearch
            )
      );
    }, [
      employees,
      search,
    ]);

  /*
   * =======================================================
   * FORM
   * =======================================================
   */

  function resetForm() {
    setEditingId(
      null
    );

    setName("");
    setEmail("");
    setJobTitle("");
    setPassword("");

    setShowPassword(
      false
    );

    setActive(
      true
    );

    setPermissions(
      createEmptyPermissions()
    );
  }

  function openCreate() {
    resetForm();

    setHistoryEmployee(
      null
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    setFormMode(
      "create"
    );

    setFormOpen(
      true
    );
  }

  function openEdit(
    employee: Employee
  ) {
    setHistoryEmployee(
      null
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    setFormMode(
      "edit"
    );

    setEditingId(
      employee.id
    );

    setName(
      employee.name
    );

    setEmail(
      employee.email
    );

    setJobTitle(
      employee.jobTitle
    );

    setPassword("");

    setShowPassword(
      false
    );

    setActive(
      employee.active
    );

    setPermissions(
      normalizeEmployeePermissions(
        employee.permissions
      )
    );

    setFormOpen(
      true
    );

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  function closeForm() {
    if (
      saving
    ) {
      return;
    }

    resetForm();

    setFormOpen(
      false
    );
  }

  /*
   * =======================================================
   * HISTÓRICO
   * =======================================================
   */

  function openHistory(
    employee: Employee
  ) {
    resetForm();

    setFormOpen(
      false
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    setHistoryEmployee({
      id:
        employee.id,

      name:
        employee.name,
    });

    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    });
  }

  /*
   * =======================================================
   * REMOVER FUNCIONÁRIO
   * =======================================================
   *
   * A API faz uma remoção lógica:
   *
   * - active = false;
   * - removedAt recebe a data atual;
   * - todas as sessões são revogadas;
   * - histórico e auditoria permanecem no banco.
   */

  async function removeEmployee(
    employee: Employee
  ) {
    if (
      removingEmployeeId ||
      saving
    ) {
      return;
    }

    /*
     * Defesa visual adicional.
     * O backend também impede remover Super Admin.
     */
    if (
      employee.isSuperAdmin
    ) {
      setError(
        "O Super Admin não pode ser removido."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Tem certeza que deseja remover o funcionário "${employee.name}"? O acesso dele será bloqueado e todas as sessões serão encerradas.`
      );

    if (!confirmed) {
      return;
    }

    setError(
      null
    );

    setSuccess(
      null
    );

    setRemovingEmployeeId(
      employee.id
    );

    try {
      const response =
        await fetch(
          `/api/admin/employees/${encodeURIComponent(
            employee.id
          )}`,
          {
            method:
              "DELETE",

            credentials:
              "same-origin",
          }
        );

      let data:
        EmployeesResponse = {};

      try {
        data =
          (await response.json()) as EmployeesResponse;
      } catch {
        // A resposta inválida é tratada abaixo.
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Não foi possível remover o funcionário."
        );
      }

      /*
       * Remove imediatamente da interface.
       * Um novo GET também não retornará o funcionário,
       * pois o backend filtra removedAt: null.
       */
      setEmployees(
        (currentEmployees) =>
          currentEmployees.filter(
            (currentEmployee) =>
              currentEmployee.id !==
              employee.id
          )
      );

      if (
        editingId ===
        employee.id
      ) {
        resetForm();
        setFormOpen(false);
      }

      if (
        historyEmployee?.id ===
        employee.id
      ) {
        setHistoryEmployee(
          null
        );
      }

      setSuccess(
        data.message ||
          `Funcionário "${employee.name}" removido com sucesso.`
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Não foi possível remover o funcionário."
      );
    } finally {
      setRemovingEmployeeId(
        null
      );
    }
  }

  /*
   * =======================================================
   * PERMISSÕES
   * =======================================================
   */

  function changePermission(
    adminModule:
      AdminModule,

    level:
      PermissionLevel
  ) {
    setPermissions(
      (
        current
      ) => ({
        ...current,

        [adminModule]:
          level,
      })
    );
  }

  /*
   * =======================================================
   * SUBMIT
   * =======================================================
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      saving
    ) {
      return;
    }

    setError(
      null
    );

    setSuccess(
      null
    );

    if (
      name.trim().length <
      2
    ) {
      setError(
        "Informe o nome do funcionário."
      );

      return;
    }

    if (
      !jobTitle
    ) {
      setError(
        "Selecione o cargo do funcionário."
      );

      return;
    }

    if (
      formMode ===
        "create" &&
      !password
    ) {
      setError(
        "Informe uma senha para o funcionário."
      );

      return;
    }

    if (
      formMode ===
        "create" &&
      password.length <
        16
    ) {
      setError(
        "A senha precisa ter pelo menos 16 caracteres."
      );

      return;
    }

    if (
      formMode ===
        "edit" &&
      password &&
      password.length <
        16
    ) {
      setError(
        "A nova senha precisa ter pelo menos 16 caracteres."
      );

      return;
    }

    if (
      formMode ===
        "edit" &&
      editingId
    ) {
      const existing =
        employees.find(
          (
            employee
          ) =>
            employee.id ===
            editingId
        );

      if (
        existing?.active &&
        !active
      ) {
        const confirmed =
          window.confirm(
            "Deseja realmente desativar este funcionário? Todas as sessões administrativas dele serão encerradas."
          );

        if (
          !confirmed
        ) {
          return;
        }
      }
    }

    setSaving(
      true
    );

    try {
      const endpoint =
        formMode ===
          "create"
          ? "/api/admin/employees"
          : `/api/admin/employees/${editingId}`;

      const method =
        formMode ===
          "create"
          ? "POST"
          : "PATCH";

      const requestBody: {
        name: string;
        email: string;
        jobTitle: string;
        active: boolean;
        permissions:
          Permissions;
        password?: string;
      } = {
        name:
          name.trim(),

        email:
          email
            .trim()
            .toLowerCase(),

        jobTitle:
          jobTitle.trim(),

        active,

        permissions,
      };

      /*
       * Na edição:
       * vazio = manter senha atual.
       */

      if (
        formMode ===
          "create" ||
        password
      ) {
        requestBody.password =
          password;
      }

      const response =
        await fetch(
          endpoint,
          {
            method,

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                requestBody
              ),
          }
        );

      const data =
        (await response.json()) as EmployeesResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível salvar o funcionário."
        );
      }

      setSuccess(
        data.message ||
          (formMode ===
          "create"
            ? "Funcionário criado com sucesso."
            : "Funcionário atualizado com sucesso.")
      );

      resetForm();

      setFormOpen(
        false
      );

      await loadEmployees();
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Não foi possível salvar o funcionário."
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /*
   * =======================================================
   * RENDER
   * =======================================================
   */

  return (
    <div>
      {/* CABEÇALHO */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[28px] font-extrabold text-[#20170f] sm:text-[34px]">
            Funcionários
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Gerencie funcionários,
            cargos, permissões e
            atividades administrativas.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreate
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#9f6f14]"
        >
          <UserPlus
            size={18}
          />

          Novo funcionário
        </button>
      </div>

      {/* MENSAGENS */}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2
            size={18}
          />

          {success}
        </div>
      )}

      {/* HISTÓRICO */}

      {historyEmployee && (
        <EmployeeActivityPanel
          employeeId={
            historyEmployee.id
          }
          employeeName={
            historyEmployee.name
          }
          onClose={() =>
            setHistoryEmployee(
              null
            )
          }
        />
      )}

      {/* FORMULÁRIO */}

      {formOpen && (
        <section className="mb-7 overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#eee2cc] px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-xl font-extrabold text-[#20170f]">
                {formMode ===
                "create"
                  ? "Novo funcionário"
                  : "Editar funcionário"}
              </h3>

              <p className="mt-1 text-xs text-neutral-500">
                Configure os dados,
                cargo e permissões.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              disabled={
                saving
              }
              aria-label="Fechar"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition hover:bg-neutral-100"
            >
              <X
                size={19}
              />
            </button>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
          >
            {/* DADOS */}

            <div className="p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <UserCog
                  size={20}
                  className="text-[#b98218]"
                />

                <div>
                  <h4 className="font-extrabold text-[#20170f]">
                    Dados do funcionário
                  </h4>

                  <p className="text-xs text-neutral-500">
                    Informações utilizadas
                    para acesso ao painel.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* NOME */}

                <label>
                  <span className="text-sm font-bold text-[#20170f]">
                    Nome *
                  </span>

                  <input
                    value={
                      name
                    }
                    onChange={(
                      event
                    ) =>
                      setName(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    maxLength={
                      120
                    }
                    autoComplete="name"
                    placeholder="Nome completo"
                    className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none transition focus:border-[#b98218]"
                  />
                </label>

                {/* EMAIL */}

                <label>
                  <span className="text-sm font-bold text-[#20170f]">
                    E-mail *
                  </span>

                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    maxLength={
                      254
                    }
                    autoComplete="email"
                    placeholder="funcionario@empresa.com"
                    className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none transition focus:border-[#b98218]"
                  />
                </label>

                {/* CARGO */}

                <label>
                  <span className="text-sm font-bold text-[#20170f]">
                    Cargo *
                  </span>

                  <select
                    value={
                      jobTitle
                    }
                    onChange={(
                      event
                    ) =>
                      setJobTitle(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm font-semibold text-[#20170f] outline-none transition focus:border-[#b98218]"
                  >
                    <option
                      value=""
                      disabled
                    >
                      Selecione o cargo
                    </option>

                    {/*
                     * Mantém compatibilidade caso exista
                     * algum cargo antigo personalizado.
                     */}

                    {jobTitle &&
                      !JOB_TITLES.includes(
                        jobTitle as
                          (typeof JOB_TITLES)[number]
                      ) && (
                        <option
                          value={
                            jobTitle
                          }
                        >
                          {
                            jobTitle
                          }
                        </option>
                      )}

                    {JOB_TITLES.map(
                      (
                        title
                      ) => (
                        <option
                          key={
                            title
                          }
                          value={
                            title
                          }
                        >
                          {
                            title
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                {/* SENHA */}

                <label>
                  <span className="text-sm font-bold text-[#20170f]">
                    {formMode ===
                    "create"
                      ? "Senha *"
                      : "Redefinir senha"}
                  </span>

                  <div className="mt-2 flex h-11 items-center rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218]">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event
                            .target
                            .value
                        )
                      }
                      required={
                        formMode ===
                        "create"
                      }
                      autoComplete="new-password"
                      placeholder={
                        formMode ===
                        "create"
                          ? "Crie uma senha forte"
                          : "Deixe vazio para não alterar"
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                      className="ml-2 text-neutral-400 hover:text-[#20170f]"
                    >
                      {showPassword ? (
                        <EyeOff
                          size={17}
                        />
                      ) : (
                        <Eye
                          size={17}
                        />
                      )}
                    </button>
                  </div>

                  <p className="mt-1 text-[11px] text-neutral-400">
                    16+ caracteres,
                    maiúscula, minúscula,
                    número e símbolo.
                  </p>
                </label>
              </div>

              {/* STATUS */}

              <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4">
                <div>
                  <strong className="text-sm text-[#20170f]">
                    Funcionário ativo
                  </strong>

                  <p className="mt-1 text-xs text-neutral-500">
                    Funcionários desativados
                    não conseguem acessar
                    o painel.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={
                    active
                  }
                  onChange={(
                    event
                  ) =>
                    setActive(
                      event
                        .target
                        .checked
                    )
                  }
                  className="h-5 w-5 accent-[#b98218]"
                />
              </label>
            </div>

            {/* PERMISSÕES */}

            <div className="border-t border-[#eee2cc] bg-[#faf9f6] p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck
                  size={21}
                  className="text-[#b98218]"
                />

                <div>
                  <h4 className="font-extrabold text-[#20170f]">
                    Níveis de acesso
                  </h4>

                  <p className="text-xs text-neutral-500">
                    Escolha o que poderá
                    fazer em cada área.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#e8dcc2] bg-white">
                {modules.map(
                  (
                    permissionModule,
                    index
                  ) => (
                    <div
                      key={
                        permissionModule.id
                      }
                      className={`grid grid-cols-1 gap-3 p-4 sm:grid-cols-[1fr_210px] sm:items-center ${
                        index >
                        0
                          ? "border-t border-[#eee2cc]"
                          : ""
                      }`}
                    >
                      <div>
                        <strong className="text-sm text-[#20170f]">
                          {
                            permissionModule.label
                          }
                        </strong>

                        <p className="mt-1 text-xs text-neutral-500">
                          {
                            permissionModule.description
                          }
                        </p>
                      </div>

                      <select
                        value={
                          permissions[
                            permissionModule.id
                          ]
                        }
                        onChange={(
                          event
                        ) =>
                          changePermission(
                            permissionModule.id,

                            event
                              .target
                              .value as PermissionLevel
                          )
                        }
                        className="h-10 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm font-semibold text-[#20170f] outline-none transition focus:border-[#b98218]"
                      >
                        {permissionOptions.map(
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
                  )
                )}
              </div>

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
                Funcionários não podem
                administrar outros
                funcionários. Essa área
                permanece exclusiva do
                Super Admin.
              </div>
            </div>

            {/* BOTÕES */}

            <div className="flex flex-col-reverse gap-3 border-t border-[#eee2cc] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                className="h-11 rounded-xl border border-[#e8dcc2] px-5 text-sm font-bold text-neutral-600 transition hover:bg-[#faf9f6]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-6 text-sm font-bold text-white transition hover:bg-[#9f6f14] disabled:opacity-60"
              >
                {saving && (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Salvando..."
                  : formMode ===
                      "create"
                    ? "Criar funcionário"
                    : "Salvar alterações"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* BUSCA */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#e8dcc2] bg-white px-4 shadow-sm sm:max-w-[420px]">
          <Search
            size={18}
            className="text-[#b98218]"
          />

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event
                  .target
                  .value
              )
            }
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <span className="text-sm font-semibold text-neutral-500">
          {
            filteredEmployees.length
          }{" "}
          {filteredEmployees.length ===
          1
            ? "funcionário"
            : "funcionários"}
        </span>
      </div>

      {/* LISTA */}

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <LoaderCircle
              size={30}
              className="animate-spin text-[#b98218]"
            />
          </div>
        ) : filteredEmployees.length ===
          0 ? (
          <div className="px-6 py-16 text-center">
            <UserCog
              size={38}
              className="mx-auto text-neutral-300"
            />

            <strong className="mt-4 block text-lg text-[#20170f]">
              Nenhum funcionário
              encontrado
            </strong>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-[#faf9f6]">
                <tr>
                  <th className="p-4 text-left">
                    Funcionário
                  </th>

                  <th className="p-4 text-left">
                    Cargo
                  </th>

                  <th className="p-4 text-left">
                    Status
                  </th>

                  <th className="p-4 text-left">
                    Último acesso
                  </th>

                  <th className="p-4 text-center">
                    Acessos
                  </th>

                  <th className="p-4 text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map(
                  (
                    employee
                  ) => {
                    const normalizedPermissions =
                      normalizeEmployeePermissions(
                        employee.permissions
                      );

                    const accessCount =
                      Object.values(
                        normalizedPermissions
                      ).filter(
                        (
                          level
                        ) =>
                          level !==
                          "NONE"
                      ).length;

                    return (
                      <tr
                        key={
                          employee.id
                        }
                        className="border-t border-[#eee2cc] hover:bg-[#fffcf6]"
                      >
                        <td className="p-4">
                          <strong className="block text-[#20170f]">
                            {
                              employee.name
                            }
                          </strong>

                          <p className="mt-1 text-xs text-neutral-500">
                            {
                              employee.email
                            }
                          </p>
                        </td>

                        <td className="p-4">
                          {
                            employee.jobTitle
                          }
                        </td>

                        <td className="p-4">
                          <span
                            className={
                              employee.active
                                ? "rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700"
                                : "rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700"
                            }
                          >
                            {employee.active
                              ? "Ativo"
                              : "Desativado"}
                          </span>
                        </td>

                        <td className="p-4 text-xs text-neutral-500">
                          {formatDate(
                            employee.lastLoginAt
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span className="rounded-full bg-[#fff8e8] px-3 py-1 text-xs font-bold text-[#b98218]">
                            {
                              accessCount
                            }
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            {/* HISTÓRICO */}

                            <button
                              type="button"
                              onClick={() =>
                                openHistory(
                                  employee
                                )
                              }
                              className="flex h-9 items-center gap-2 rounded-xl border border-[#e8dcc2] px-3 text-xs font-bold text-[#20170f] transition hover:bg-[#faf9f6]"
                            >
                              <HistoryIcon
                                size={15}
                              />

                              Histórico
                            </button>

                            {/* EDITAR */}

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  employee
                                )
                              }
                              className="flex h-9 items-center gap-2 rounded-xl border border-[#e8dcc2] px-3 text-xs font-bold text-[#7a5422] transition hover:bg-[#fff8e8]"
                            >
                              <Pencil
                                size={15}
                              />

                              Editar
                            </button>

                            {/* REMOVER */}

                            <button
                              type="button"
                              onClick={() =>
                                void removeEmployee(
                                  employee
                                )
                              }
                              disabled={
                                Boolean(
                                  removingEmployeeId
                                )
                              }
                              className="flex h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {removingEmployeeId ===
                              employee.id ? (
                                <LoaderCircle
                                  size={15}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2
                                  size={15}
                                />
                              )}

                              {removingEmployeeId ===
                              employee.id
                                ? "Removendo..."
                                : "Remover"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}