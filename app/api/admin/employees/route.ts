import bcrypt from "bcryptjs";

import type {
  AdminModule,
  PermissionLevel,
  Prisma,
} from "@prisma/client";

import {
  NextResponse,
} from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  consumeRateLimit,
} from "@/lib/auth-rate-limit";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

/*
 * =========================================================
 * CONFIGURAÇÕES
 * =========================================================
 */

const MAXIMUM_REQUEST_SIZE =
  20_000;

const MAXIMUM_EMPLOYEES_RETURNED =
  100;

/*
 * EMPLOYEES não aparece aqui de propósito.
 *
 * Somente o Super Admin pode administrar
 * funcionários e permissões.
 */
const ASSIGNABLE_MODULES:
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
  ];

const PERMISSION_LEVELS:
  readonly PermissionLevel[] = [
    "NONE",
    "VIEW",
    "EDIT",
    "MANAGE",
  ];

type CreateEmployeeBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  jobTitle?: unknown;
  active?: unknown;
  permissions?: unknown;
};

type NormalizedPermission = {
  module: AdminModule;
  level: PermissionLevel;
};

/*
 * =========================================================
 * RESPOSTA
 * =========================================================
 */

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200,
  headers?: Record<
    string,
    string
  >
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

        ...headers,
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
  value: unknown,
  maximumLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .replace(
      /\s+/g,
      " "
    )
    .slice(
      0,
      maximumLength
    );
}

function normalizeEmail(
  value: unknown
) {
  return normalizeText(
    value,
    254
  ).toLowerCase();
}

function getPassword(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  /*
   * Não aplicamos trim em senha.
   *
   * Espaços podem fazer parte dela.
   */
  return value;
}

function isValidEmail(
  email: string
) {
  return (
    email.length >= 5 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

/*
 * =========================================================
 * SENHA
 * =========================================================
 */

function getPasswordError(
  password: string
): string | null {
  if (
    Buffer.byteLength(
      password,
      "utf8"
    ) > 72
  ) {
    return "A senha pode ter no máximo 72 bytes.";
  }

  if (
    password.length < 16
  ) {
    return "A senha precisa ter pelo menos 16 caracteres.";
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    return "A senha precisa conter pelo menos uma letra minúscula.";
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return "A senha precisa conter pelo menos uma letra maiúscula.";
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return "A senha precisa conter pelo menos um número.";
  }

  if (
    !/[^a-zA-Z0-9]/.test(
      password
    )
  ) {
    return "A senha precisa conter pelo menos um caractere especial.";
  }

  return null;
}

/*
 * =========================================================
 * ORIGEM
 * =========================================================
 */

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return true;
  }

  try {
    return (
      origin ===
      new URL(
        request.url
      ).origin
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * PERMISSÕES
 * =========================================================
 */

function isPermissionLevel(
  value: unknown
): value is PermissionLevel {
  return (
    typeof value ===
      "string" &&
    PERMISSION_LEVELS.includes(
      value as PermissionLevel
    )
  );
}

function normalizePermissions(
  value: unknown
):
  | NormalizedPermission[]
  | null {
  /*
   * Exigimos um objeto:
   *
   * {
   *   DASHBOARD: "VIEW",
   *   PRODUCTS: "MANAGE",
   *   ...
   * }
   */

  if (
    typeof value !==
      "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const input =
    value as Record<
      string,
      unknown
    >;

  /*
   * Não permitimos módulos desconhecidos.
   *
   * Isso também impede o navegador de
   * enviar EMPLOYEES: "MANAGE".
   */
  for (
    const key of
    Object.keys(input)
  ) {
    if (
      !ASSIGNABLE_MODULES.includes(
        key as AdminModule
      )
    ) {
      return null;
    }
  }

  const result:
    NormalizedPermission[] =
      [];

  /*
   * Todo módulo recebe uma permissão
   * explícita no banco.
   *
   * Se estiver ausente:
   * NONE.
   */
 for (
  const adminModule of
  ASSIGNABLE_MODULES
) {
  const valueForModule =
    input[adminModule] ??
    "NONE";

  if (
    !isPermissionLevel(
      valueForModule
    )
  ) {
    return null;
  }

  result.push({
    module:
      adminModule,

    level:
      valueForModule,
  });
}

  return result;
}

/*
 * =========================================================
 * ERROS DO PRISMA
 * =========================================================
 */

function isPrismaUniqueError(
  error: unknown
) {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !(
      "code" in error
    )
  ) {
    return false;
  }

  return (
    error.code ===
    "P2002"
  );
}

/*
 * =========================================================
 * ERROS DE AUTORIZAÇÃO
 * =========================================================
 */

function getAuthorizationErrorResponse(
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
 *
 * Lista os funcionários.
 *
 * Somente Super Admin possui MANAGE em EMPLOYEES.
 */

export async function GET() {
  try {
    const session =
      await requireAdminPermission(
        "EMPLOYEES",
        "MANAGE"
      );

    /*
     * Defesa adicional.
     *
     * Mesmo que uma permissão seja cadastrada
     * incorretamente no banco, esta rota nunca
     * permite um funcionário comum gerenciar
     * outros funcionários.
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

    const employees =
      await prisma.user.findMany({
        where: {
          role:
            "ADMIN",

          adminProfile: {
            is: {
              isSuperAdmin:
                false,

              /*
               * Funcionários removidos continuam no banco
               * para preservar auditoria, mas não aparecem
               * na lista administrativa.
               */
              removedAt:
                null,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          MAXIMUM_EMPLOYEES_RETURNED,

        select: {
          id: true,
          name: true,
          email: true,

          lastLoginAt:
            true,

          createdAt:
            true,

          updatedAt:
            true,

          adminProfile: {
            select: {
              jobTitle:
                true,

              active:
                true,

              isSuperAdmin:
                true,

              createdAt:
                true,

              createdBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
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

    return jsonResponse({
      success: true,

      employees:
        employees.map(
          (employee) => ({
            id:
              employee.id,

            name:
              employee.name,

            email:
              employee.email,

            jobTitle:
              employee
                .adminProfile
                ?.jobTitle ??
              "",

            active:
              employee
                .adminProfile
                ?.active ??
              false,

            isSuperAdmin:
              false,

            lastLoginAt:
              employee.lastLoginAt,

            createdAt:
              employee.createdAt,

            updatedAt:
              employee.updatedAt,

            createdBy:
              employee
                .adminProfile
                ?.createdBy ??
              null,

            permissions:
              Object.fromEntries(
                employee.adminPermissions.map(
                  (
                    permission
                  ) => [
                    permission.module,
                    permission.level,
                  ]
                )
              ),
          })
        ),
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationErrorResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    console.error(
      "Erro ao listar funcionários:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar os funcionários.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 *
 * Cria um funcionário administrativo.
 */

export async function POST(
  request: Request
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
     * ORIGEM
     * =====================================================
     */

    if (
      !isAllowedOrigin(
        request
      )
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
     * CONTENT TYPE
     * =====================================================
     */

    const contentType =
      request.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da solicitação inválido.",
        },
        415
      );
    }

    /*
     * =====================================================
     * TAMANHO
     * =====================================================
     */

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ?? "0"
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAXIMUM_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "A solicitação é muito grande.",
        },
        413
      );
    }

    /*
     * =====================================================
     * RATE LIMIT
     * =====================================================
     */

    const rateLimit =
      await consumeRateLimit({
        scope:
          "admin-create-employee",

        identifier:
          session.userId,

        limit: 20,

        windowMs:
          60 *
          60 *
          1000,

        blockMs:
          60 *
          60 *
          1000,
      });

    if (
      !rateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas operações foram realizadas. Aguarde e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              rateLimit
                .retryAfterSeconds
            ),
        }
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAXIMUM_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    let body:
      CreateEmployeeBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as CreateEmployeeBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    /*
     * =====================================================
     * CAMPOS
     * =====================================================
     */

    const name =
      normalizeText(
        body.name,
        120
      );

    const email =
      normalizeEmail(
        body.email
      );

    const password =
      getPassword(
        body.password
      );

    const jobTitle =
      normalizeText(
        body.jobTitle,
        100
      );

    const active =
      body.active ===
        undefined
        ? true
        : body.active ===
          true;

    if (
      name.length < 2
    ) {
      return jsonResponse(
        {
          error:
            "Informe o nome do funcionário.",
        },
        400
      );
    }

    if (
      !isValidEmail(
        email
      )
    ) {
      return jsonResponse(
        {
          error:
            "Informe um e-mail válido.",
        },
        400
      );
    }

    if (
      jobTitle.length < 2
    ) {
      return jsonResponse(
        {
          error:
            "Informe o cargo do funcionário.",
        },
        400
      );
    }

    if (
      body.active !==
        undefined &&
      typeof body.active !==
        "boolean"
    ) {
      return jsonResponse(
        {
          error:
            "Situação do funcionário inválida.",
        },
        400
      );
    }

    const passwordError =
      getPasswordError(
        password
      );

    if (
      passwordError
    ) {
      return jsonResponse(
        {
          error:
            passwordError,
        },
        400
      );
    }

    const permissions =
      normalizePermissions(
        body.permissions
      );

    if (
      !permissions
    ) {
      return jsonResponse(
        {
          error:
            "As permissões informadas são inválidas.",
        },
        400
      );
    }

    /*
     * =====================================================
     * E-MAIL JÁ EXISTENTE
     * =====================================================
     *
     * Nunca transformamos automaticamente:
     *
     * - cliente;
     * - visitante;
     * - outro administrador;
     *
     * em funcionário.
     */

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
        },
      });

    if (
      existingUser
    ) {
      return jsonResponse(
        {
          error:
            "Este e-mail já está cadastrado no sistema.",
        },
        409
      );
    }

    /*
     * =====================================================
     * HASH DA SENHA
     * =====================================================
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    const now =
      new Date();

    const permissionsForAudit =
      Object.fromEntries(
        permissions.map(
          (
            permission
          ) => [
            permission.module,
            permission.level,
          ]
        )
      );

    /*
     * =====================================================
     * TRANSAÇÃO
     * =====================================================
     *
     * Usuário + perfil + permissões + auditoria
     * são criados atomicamente.
     */

    const employee =
      await prisma.$transaction(
        async (
          tx
        ) => {
          const createdUser =
            await tx.user.create({
              data: {
                name,
                email,

                password:
                  passwordHash,

                role:
                  "ADMIN",

                passwordChangedAt:
                  now,
              },

              select: {
                id: true,
                name: true,
                email: true,
                createdAt:
                  true,
              },
            });

          await tx.adminProfile.create({
            data: {
              userId:
                createdUser.id,

              jobTitle,

              active,

              /*
               * JAMAIS vem do navegador.
               */
              isSuperAdmin:
                false,

              createdById:
                session.userId,
            },
          });

          await tx.adminPermission.createMany({
            data:
              permissions.map(
                (
                  permission
                ) => ({
                  userId:
                    createdUser.id,

                  module:
                    permission.module,

                  level:
                    permission.level,
                })
              ),
          });

          /*
           * Nenhum dado de senha entra
           * no registro de auditoria.
           */
          const auditChanges:
            Prisma.InputJsonValue =
              {
                jobTitle,
                active,

                permissions:
                  permissionsForAudit,
              };

          await tx.adminAuditLog.create({
            data: {
              actorId:
                session.userId,

              module:
                "EMPLOYEES",

              action:
                "EMPLOYEE_CREATED",

              entityType:
                "ADMIN_USER",

              entityId:
                createdUser.id,

              changes:
                auditChanges,
            },
          });

          return createdUser;
        }
      );

    /*
     * =====================================================
     * RESPOSTA
     * =====================================================
     *
     * Nunca retornamos:
     *
     * - senha;
     * - hash;
     * - cookie;
     * - token;
     */

    return jsonResponse(
      {
        success: true,

        message:
          "Funcionário criado com sucesso.",

        employee: {
          id:
            employee.id,

          name:
            employee.name,

          email:
            employee.email,

          jobTitle,

          active,

          isSuperAdmin:
            false,

          permissions:
            permissionsForAudit,

          createdAt:
            employee.createdAt,
        },
      },
      201
    );
  } catch (error) {
    const authorizationResponse =
      getAuthorizationErrorResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    /*
     * Proteção final contra condição de
     * corrida entre duas criações com
     * o mesmo e-mail.
     *
     * User.email também é UNIQUE no banco.
     */
    if (
      isPrismaUniqueError(
        error
      )
    ) {
      return jsonResponse(
        {
          error:
            "Este e-mail já está cadastrado no sistema.",
        },
        409
      );
    }

    /*
     * Nunca imprime:
     *
     * - senha;
     * - e-mail;
     * - body;
     * - token;
     * - cookie.
     */
    console.error(
      "Erro ao criar funcionário:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível criar o funcionário.",
      },
      500
    );
  }
}