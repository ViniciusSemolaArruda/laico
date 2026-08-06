import type {
  AdminModule,
  Prisma,
} from "@prisma/client";

import {
  NextResponse,
} from "next/server";

import {
  formatAdminAuditDate,
  formatAdminAuditDay,
  formatAdminAuditTime,
  getAdminAuditActionLabel,
} from "@/lib/admin-audit";

import type {
  AdminAuditAction,
} from "@/lib/admin-audit";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const DEFAULT_PAGE_SIZE =
  30;

const MAXIMUM_PAGE_SIZE =
  100;

const ADMIN_MODULES:
  readonly AdminModule[] = [
    "DASHBOARD",
    "PRODUCTS",
    "ORDERS",
    "CUSTOMERS",
    "CATEGORIES",
    "BANNERS",
    "COUPONS",
    "FINANCE",
    "REPORTS",
    "SETTINGS",
    "EMPLOYEES",
  ];

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

/*
 * =========================================================
 * CAMPOS DE AUDITORIA QUE PODEM IR PARA O NAVEGADOR
 * =========================================================
 *
 * Tudo que não estiver aqui permanece exclusivamente
 * no servidor/banco.
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
 * JSON
 * =========================================================
 */

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeText(
  value: string | null,
  maximumLength: number
) {
  return (
    value
      ?.trim()
      .slice(
        0,
        maximumLength
      ) ?? ""
  );
}

function isValidId(
  value: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    value
  );
}

function parsePositiveInteger(
  value: string | null,
  fallback: number
) {
  if (!value) {
    return fallback;
  }

  const parsed =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    return fallback;
  }

  return parsed;
}

/*
 * =========================================================
 * MÓDULO
 * =========================================================
 */

function isAdminModule(
  value: string
): value is AdminModule {
  return ADMIN_MODULES.includes(
    value as AdminModule
  );
}

/*
 * =========================================================
 * AÇÃO
 * =========================================================
 */

function normalizeAction(
  value: string | null
) {
  const action =
    normalizeText(
      value,
      100
    ).toUpperCase();

  if (!action) {
    return "";
  }

  if (
    !/^[A-Z0-9_]+$/.test(
      action
    )
  ) {
    return "";
  }

  return action;
}

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
 * DATAS
 * =========================================================
 */

function parseDate(
  value: string | null
): Date | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

/*
 * =========================================================
 * LABEL
 * =========================================================
 */

function getActionLabel(
  action: string
) {
  const label =
    getAdminAuditActionLabel(
      action as AdminAuditAction
    );

  return (
    label ||
    action
  );
}

/*
 * =========================================================
 * SANITIZAÇÃO DA AUDITORIA
 * =========================================================
 *
 * IMPORTANTE:
 *
 * Isso NÃO altera o que está salvo no banco.
 *
 * Apenas decide quais informações podem sair pela API.
 */

function sanitizeAuditChanges(
  action: string,
  changes: unknown
): Record<
  string,
  string | number | boolean
> | null {
  /*
   * Login e logout não precisam enviar
   * absolutamente nenhum detalhe adicional.
   *
   * Portanto:
   *
   * sessionId
   * event
   * jobTitle interno
   * isSuperAdmin
   *
   * não chegam ao navegador.
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

  const source =
    changes as Record<
      string,
      unknown
    >;

  const safeChanges:
    Record<
      string,
      string | number | boolean
    > = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(
      source
    )
  ) {
    /*
     * Qualquer chave não autorizada
     * é descartada.
     */

    if (
      !SAFE_CHANGE_FIELDS.has(
        key
      )
    ) {
      continue;
    }

    /*
     * Não enviamos objetos arbitrários,
     * arrays ou estruturas internas.
     */

    if (
      typeof value ===
      "string"
    ) {
      safeChanges[key] =
        value.slice(
          0,
          500
        );

      continue;
    }

    if (
      typeof value ===
        "number" ||
      typeof value ===
        "boolean"
    ) {
      safeChanges[key] =
        value;
    }
  }

  if (
    Object.keys(
      safeChanges
    ).length ===
    0
  ) {
    return null;
  }

  return safeChanges;
}

/*
 * =========================================================
 * ENTIDADE DA AUDITORIA
 * =========================================================
 */

function getSafeEntityId(
  action: string,
  entityId: string | null
) {
  /*
   * Em login/logout o identificador
   * interno não tem utilidade para a UI.
   */

  if (
    isAccessActivity(
      action
    )
  ) {
    return null;
  }

  return entityId;
}

/*
 * =========================================================
 * ERROS DE AUTORIZAÇÃO
 * =========================================================
 */

function getAuthorizationResponse(
  error: unknown
) {
  const message =
    error instanceof Error
      ? error.message
      : "";

  if (
    message ===
    "ADMIN_UNAUTHORIZED"
  ) {
    return jsonResponse(
      {
        error:
          "Não autorizado.",
      },
      401
    );
  }

  if (
    message ===
    "ADMIN_FORBIDDEN"
  ) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      403
    );
  }

  return null;
}

/*
 * =========================================================
 * GET
 * =========================================================
 */

export async function GET(
  request: Request,
  {
    params,
  }: RouteProps
) {
  try {
    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     */

    const session =
      await requireAdminPermission(
        "EMPLOYEES",
        "MANAGE"
      );

    /*
     * Somente Super Admin pode consultar
     * o histórico de funcionários.
     */

    if (
      !session.isSuperAdmin
    ) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

    /*
     * =====================================================
     * FUNCIONÁRIO
     * =====================================================
     */

    const {
      id,
    } =
      await params;

    const employeeId =
      normalizeText(
        id,
        100
      );

    if (
      !isValidId(
        employeeId
      )
    ) {
      return jsonResponse(
        {
          error:
            "Funcionário não encontrado.",
        },
        404
      );
    }

    const employee =
      await prisma.user.findFirst({
        where: {
          id:
            employeeId,

          role:
            "ADMIN",

          /*
           * Super Admin não é gerenciado
           * por esta área.
           */

          adminProfile: {
            is: {
              isSuperAdmin:
                false,
            },
          },
        },

        select: {
          id:
            true,

          name:
            true,

          email:
            true,

          lastLoginAt:
            true,

          createdAt:
            true,

          adminProfile: {
            select: {
              jobTitle:
                true,

              active:
                true,

              removedAt:
                true,

              createdAt:
                true,
            },
          },
        },
      });

    if (
      !employee ||
      !employee.adminProfile
    ) {
      return jsonResponse(
        {
          error:
            "Funcionário não encontrado.",
        },
        404
      );
    }

    /*
     * =====================================================
     * QUERY STRING
     * =====================================================
     */

    const url =
      new URL(
        request.url
      );

    const page =
      parsePositiveInteger(
        url.searchParams.get(
          "page"
        ),
        1
      );

    const requestedLimit =
      parsePositiveInteger(
        url.searchParams.get(
          "limit"
        ),
        DEFAULT_PAGE_SIZE
      );

    const limit =
      Math.min(
        requestedLimit,
        MAXIMUM_PAGE_SIZE
      );

    /*
     * =====================================================
     * MÓDULO
     * =====================================================
     */

    const requestedModule =
      normalizeText(
        url.searchParams.get(
          "module"
        ),
        50
      ).toUpperCase();

    let selectedModule:
      AdminModule | null =
        null;

    if (
      requestedModule
    ) {
      if (
        !isAdminModule(
          requestedModule
        )
      ) {
        return jsonResponse(
          {
            error:
              "Módulo de auditoria inválido.",
          },
          400
        );
      }

      selectedModule =
        requestedModule;
    }

    /*
     * =====================================================
     * AÇÃO
     * =====================================================
     */

    const rawAction =
      url.searchParams.get(
        "action"
      );

    const selectedAction =
      normalizeAction(
        rawAction
      );

    if (
      rawAction &&
      !selectedAction
    ) {
      return jsonResponse(
        {
          error:
            "Ação de auditoria inválida.",
        },
        400
      );
    }

    /*
     * =====================================================
     * DATAS
     * =====================================================
     */

    const rawFrom =
      url.searchParams.get(
        "from"
      );

    const rawTo =
      url.searchParams.get(
        "to"
      );

    const from =
      parseDate(
        rawFrom
      );

    const to =
      parseDate(
        rawTo
      );

    if (
      rawFrom &&
      !from
    ) {
      return jsonResponse(
        {
          error:
            "Data inicial inválida.",
        },
        400
      );
    }

    if (
      rawTo &&
      !to
    ) {
      return jsonResponse(
        {
          error:
            "Data final inválida.",
        },
        400
      );
    }

    if (
      from &&
      to &&
      from > to
    ) {
      return jsonResponse(
        {
          error:
            "O período informado é inválido.",
        },
        400
      );
    }

    /*
     * =====================================================
     * FILTRO
     * =====================================================
     */

    const where:
      Prisma.AdminAuditLogWhereInput =
        {
          actorId:
            employee.id,
        };

    if (
      selectedModule
    ) {
      where.module =
        selectedModule;
    }

    if (
      selectedAction
    ) {
      where.action =
        selectedAction;
    }

    if (
      from ||
      to
    ) {
      where.createdAt =
        {};

      if (from) {
        where.createdAt.gte =
          from;
      }

      if (to) {
        where.createdAt.lte =
          to;
      }
    }

    /*
     * =====================================================
     * PAGINAÇÃO
     * =====================================================
     */

    const skip =
      (page - 1) *
      limit;

    /*
     * =====================================================
     * CONSULTA
     * =====================================================
     *
     * changes continua sendo buscado porque precisamos
     * extrair os campos permitidos.
     *
     * O valor completo não será enviado ao navegador.
     */

    const [
      total,
      activities,
    ] =
      await Promise.all([
        prisma.adminAuditLog.count({
          where,
        }),

        prisma.adminAuditLog.findMany({
          where,

          orderBy: [
            {
              createdAt:
                "desc",
            },

            {
              id:
                "desc",
            },
          ],

          skip,

          take:
            limit,

          select: {
            id:
              true,

            module:
              true,

            action:
              true,

            entityType:
              true,

            entityId:
              true,

            changes:
              true,

            createdAt:
              true,
          },
        }),
      ]);

    /*
     * =====================================================
     * RESUMO
     * =====================================================
     */

    const pageLoginCount =
      activities.filter(
        (
          activity
        ) =>
          activity.action ===
          "ADMIN_LOGIN"
      ).length;

    const pageLogoutCount =
      activities.filter(
        (
          activity
        ) =>
          activity.action ===
          "ADMIN_LOGOUT"
      ).length;

    const pageOperationCount =
      activities.length -
      pageLoginCount -
      pageLogoutCount;

    /*
     * =====================================================
     * CALENDÁRIO
     * =====================================================
     */

    const calendarMap =
      new Map<
        string,
        number
      >();

    for (
      const activity of
      activities
    ) {
      const day =
        formatAdminAuditDay(
          activity.createdAt
        );

      calendarMap.set(
        day,

        (
          calendarMap.get(
            day
          ) ?? 0
        ) + 1
      );
    }

    const activityDays =
      Array.from(
        calendarMap.entries()
      ).map(
        ([
          date,
          count,
        ]) => ({
          date,
          count,
        })
      );

    /*
     * =====================================================
     * PÁGINAS
     * =====================================================
     */

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total /
            limit
        )
      );

    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    return jsonResponse({
      success:
        true,

      /*
       * ===================================================
       * FUNCIONÁRIO
       * ===================================================
       */

      employee: {
        id:
          employee.id,

        name:
          employee.name,

        email:
          employee.email,

        jobTitle:
          employee
            .adminProfile
            .jobTitle,

        active:
          employee
            .adminProfile
            .active,

        removedAt:
          employee
            .adminProfile
            .removedAt,

        createdAt:
          employee.createdAt,

        lastLoginAt:
          employee.lastLoginAt,

        lastLoginAtBrasilia:
          employee.lastLoginAt
            ? formatAdminAuditDate(
                employee.lastLoginAt
              )
            : null,
      },

      /*
       * ===================================================
       * HISTÓRICO SANITIZADO
       * ===================================================
       */

      activities:
        activities.map(
          (
            activity
          ) => ({
            id:
              activity.id,

            module:
              activity.module,

            action:
              activity.action,

            actionLabel:
              getActionLabel(
                activity.action
              ),

            /*
             * Para login/logout não revelamos
             * o tipo de entidade interno.
             */

            entityType:
              isAccessActivity(
                activity.action
              )
                ? "ACCESS"
                : activity.entityType,

            /*
             * IDs de sessão/acesso nunca são
             * enviados em login/logout.
             */

            entityId:
              getSafeEntityId(
                activity.action,
                activity.entityId
              ),

            /*
             * AQUI ESTÁ A PRINCIPAL CORREÇÃO:
             *
             * activity.changes nunca vai diretamente
             * para o JSON.
             */

            changes:
              sanitizeAuditChanges(
                activity.action,
                activity.changes
              ),

            /*
             * ISO original.
             */

            createdAt:
              activity.createdAt,

            /*
             * Brasília.
             */

            dateBrasilia:
              formatAdminAuditDate(
                activity.createdAt
              ),

            dayBrasilia:
              formatAdminAuditDay(
                activity.createdAt
              ),

            timeBrasilia:
              formatAdminAuditTime(
                activity.createdAt
              ),
          })
        ),

      /*
       * ===================================================
       * CALENDÁRIO
       * ===================================================
       */

      calendar: {
        activityDays,
      },

      /*
       * ===================================================
       * RESUMO
       * ===================================================
       */

      summary: {
        logins:
          pageLoginCount,

        logouts:
          pageLogoutCount,

        operations:
          pageOperationCount,
      },

      /*
       * ===================================================
       * PAGINAÇÃO
       * ===================================================
       */

      pagination: {
        page,

        limit,

        total,

        totalPages,

        hasPreviousPage:
          page > 1,

        hasNextPage:
          page <
          totalPages,
      },

      /*
       * ===================================================
       * FILTROS
       * ===================================================
       */

      filters: {
        module:
          selectedModule,

        action:
          selectedAction ||
          null,

        from:
          from
            ?.toISOString() ??
          null,

        to:
          to
            ?.toISOString() ??
          null,
      },
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    /*
     * Nunca imprimimos:
     *
     * - funcionário;
     * - changes;
     * - tokens;
     * - cookies;
     * - sessões.
     */

    console.error(
      "Erro ao carregar histórico administrativo:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar o histórico do funcionário.",
      },
      500
    );
  }
}