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

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateEmployeeBody = {
  name?: unknown;
  email?: unknown;
  jobTitle?: unknown;
  password?: unknown;
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

  return value;
}

function isValidId(
  value: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    value
  );
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
    return "A senha precisa ter uma letra minúscula.";
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    return "A senha precisa ter uma letra maiúscula.";
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    return "A senha precisa ter um número.";
  }

  if (
    !/[^a-zA-Z0-9]/.test(
      password
    )
  ) {
    return "A senha precisa ter um caractere especial.";
  }

  return null;
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
   * EMPLOYEES propositalmente não pode
   * ser atribuído pelo formulário.
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

  for (
    const adminModule of
    ASSIGNABLE_MODULES
  ) {
    const permissionLevel =
      input[adminModule] ??
      "NONE";

    if (
      !isPermissionLevel(
        permissionLevel
      )
    ) {
      return null;
    }

    result.push({
      module:
        adminModule,

      level:
        permissionLevel,
    });
  }

  return result;
}

/*
 * =========================================================
 * ERROS
 * =========================================================
 */

function isPrismaUniqueError(
  error: unknown
) {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    error.code ===
      "P2002"
  );
}

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
 *
 * Retorna um funcionário específico.
 */

export async function GET(
  _request: Request,
  {
    params,
  }: RouteProps
) {
  try {
    const session =
      await requireAdminPermission(
        "EMPLOYEES",
        "MANAGE"
      );

    /*
     * Segurança adicional.
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

          adminProfile: {
            is: {
              /*
               * O Super Admin não pode
               * ser manipulado por esta API.
               */
              isSuperAdmin:
                false,
            },
          },
        },

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

              updatedAt:
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

    return jsonResponse({
      success: true,

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
            .createdBy,

        permissions:
          Object.fromEntries(
            ASSIGNABLE_MODULES.map(
              (
                adminModule
              ) => {
                const permission =
                  employee.adminPermissions.find(
                    (
                      item
                    ) =>
                      item.module ===
                      adminModule
                  );

                return [
                  adminModule,

                  permission
                    ?.level ??
                    "NONE",
                ];
              }
            )
          ),
      },
    });
  } catch (error) {
    const authResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authResponse
    ) {
      return authResponse;
    }

    console.error(
      "Erro ao carregar funcionário:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar o funcionário.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * PATCH
 * =========================================================
 *
 * Atualiza:
 *
 * - nome;
 * - e-mail;
 * - cargo;
 * - senha opcional;
 * - situação;
 * - permissões.
 */

export async function PATCH(
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
     * ID
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

    /*
     * =====================================================
     * CONTENT TYPE / TAMANHO
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

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ??
          "0"
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
      UpdateEmployeeBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as UpdateEmployeeBody;
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
     * FUNCIONÁRIO ATUAL
     * =====================================================
     */

    const existingEmployee =
      await prisma.user.findFirst({
        where: {
          id:
            employeeId,

          role:
            "ADMIN",

          adminProfile: {
            is: {
              isSuperAdmin:
                false,
            },
          },
        },

        select: {
          id: true,
          name: true,
          email: true,

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

    if (
      !existingEmployee ||
      !existingEmployee.adminProfile
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
     * CAMPOS
     * =====================================================
     */

    const name =
      body.name ===
      undefined
        ? existingEmployee.name
        : normalizeText(
            body.name,
            120
          );

    const email =
      body.email ===
      undefined
        ? existingEmployee.email
        : normalizeEmail(
            body.email
          );

    const jobTitle =
      body.jobTitle ===
      undefined
        ? existingEmployee
            .adminProfile
            .jobTitle
        : normalizeText(
            body.jobTitle,
            100
          );

    const active =
      body.active ===
      undefined
        ? existingEmployee
            .adminProfile
            .active
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

    /*
     * =====================================================
     * PERMISSÕES
     * =====================================================
     */

    let permissions:
      NormalizedPermission[];

    if (
      body.permissions ===
      undefined
    ) {
      /*
       * Mantém as permissões atuais.
       */
      permissions =
        ASSIGNABLE_MODULES.map(
          (
            adminModule
          ) => {
            const current =
              existingEmployee
                .adminPermissions
                .find(
                  (
                    permission
                  ) =>
                    permission.module ===
                    adminModule
                );

            return {
              module:
                adminModule,

              level:
                current?.level ??
                "NONE",
            };
          }
        );
    } else {
      const normalized =
        normalizePermissions(
          body.permissions
        );

      if (
        !normalized
      ) {
        return jsonResponse(
          {
            error:
              "As permissões informadas são inválidas.",
          },
          400
        );
      }

      permissions =
        normalized;
    }

    /*
     * =====================================================
     * NOVA SENHA OPCIONAL
     * =====================================================
     */

    const newPassword =
      body.password ===
      undefined
        ? ""
        : getPassword(
            body.password
          );

    let passwordHash:
      string | null =
        null;

    if (
      body.password !==
      undefined
    ) {
      if (
        !newPassword
      ) {
        return jsonResponse(
          {
            error:
              "A nova senha não pode ficar vazia.",
          },
          400
        );
      }

      const passwordError =
        getPasswordError(
          newPassword
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

      passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );
    }

    /*
     * =====================================================
     * E-MAIL DUPLICADO
     * =====================================================
     */

    if (
      email !==
      existingEmployee.email
    ) {
      const emailOwner =
        await prisma.user.findUnique({
          where: {
            email,
          },

          select: {
            id: true,
          },
        });

      if (
        emailOwner &&
        emailOwner.id !==
          employeeId
      ) {
        return jsonResponse(
          {
            error:
              "Este e-mail já está cadastrado no sistema.",
          },
          409
        );
      }
    }

    /*
     * =====================================================
     * AUDITORIA
     * =====================================================
     */

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

    const auditChanges:
      Prisma.InputJsonValue =
        {
          nameChanged:
            name !==
            existingEmployee.name,

          emailChanged:
            email !==
            existingEmployee.email,

          previousJobTitle:
            existingEmployee
              .adminProfile
              .jobTitle,

          jobTitle,

          previousActive:
            existingEmployee
              .adminProfile
              .active,

          active,

          passwordChanged:
            Boolean(
              passwordHash
            ),

          permissions:
            permissionsForAudit,
        };

    /*
     * =====================================================
     * TRANSAÇÃO
     * =====================================================
     */

    await prisma.$transaction(
      async (
        tx
      ) => {
        /*
         * Atualiza dados básicos.
         */
        await tx.user.update({
          where: {
            id:
              employeeId,
          },

          data: {
            name,
            email,

            ...(passwordHash
              ? {
                  password:
                    passwordHash,

                  passwordChangedAt:
                    new Date(),
                }
              : {}),
          },

          select: {
            id: true,
          },
        });

        /*
         * Perfil administrativo.
         *
         * isSuperAdmin NÃO é atualizado aqui.
         */
        await tx.adminProfile.update({
          where: {
            userId:
              employeeId,
          },

          data: {
            jobTitle,
            active,
          },

          select: {
            id: true,
          },
        });

        /*
         * Atualiza cada permissão.
         */
        for (
          const permission of
          permissions
        ) {
          await tx.adminPermission.upsert({
            where: {
              userId_module: {
                userId:
                  employeeId,

                module:
                  permission.module,
              },
            },

            create: {
              userId:
                employeeId,

              module:
                permission.module,

              level:
                permission.level,
            },

            update: {
              level:
                permission.level,
            },
          });
        }

        /*
         * Se a conta foi desativada ou
         * a senha administrativa mudou,
         * todas as sessões existentes
         * deixam de valer imediatamente.
         */
        if (
          !active ||
          passwordHash
        ) {
          await tx.adminSession.updateMany({
            where: {
              userId:
                employeeId,

              revokedAt:
                null,
            },

            data: {
              revokedAt:
                new Date(),
            },
          });
        }

        /*
         * Auditoria sem senha, hash,
         * cookie ou token.
         */
        await tx.adminAuditLog.create({
          data: {
            actorId:
              session.userId,

            module:
              "EMPLOYEES",

            action:
              active
                ? "EMPLOYEE_UPDATED"
                : "EMPLOYEE_DISABLED",

            entityType:
              "ADMIN_USER",

            entityId:
              employeeId,

            changes:
              auditChanges,
          },
        });
      }
    );

    /*
     * =====================================================
     * RESULTADO FINAL
     * =====================================================
     */

    const updatedEmployee =
      await prisma.user.findFirst({
        where: {
          id:
            employeeId,

          role:
            "ADMIN",

          adminProfile: {
            is: {
              isSuperAdmin:
                false,
            },
          },
        },

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

    if (
      !updatedEmployee ||
      !updatedEmployee.adminProfile
    ) {
      return jsonResponse(
        {
          error:
            "Não foi possível carregar o funcionário atualizado.",
        },
        500
      );
    }

    return jsonResponse({
      success: true,

      message:
        active
          ? "Funcionário atualizado com sucesso."
          : "Funcionário desativado com sucesso.",

      employee: {
        id:
          updatedEmployee.id,

        name:
          updatedEmployee.name,

        email:
          updatedEmployee.email,

        jobTitle:
          updatedEmployee
            .adminProfile
            .jobTitle,

        active:
          updatedEmployee
            .adminProfile
            .active,

        lastLoginAt:
          updatedEmployee.lastLoginAt,

        createdAt:
          updatedEmployee.createdAt,

        updatedAt:
          updatedEmployee.updatedAt,

        permissions:
          Object.fromEntries(
            ASSIGNABLE_MODULES.map(
              (
                adminModule
              ) => {
                const permission =
                  updatedEmployee
                    .adminPermissions
                    .find(
                      (
                        item
                      ) =>
                        item.module ===
                        adminModule
                    );

                return [
                  adminModule,

                  permission
                    ?.level ??
                    "NONE",
                ];
              }
            )
          ),
      },
    });
  } catch (error) {
    const authResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authResponse
    ) {
      return authResponse;
    }

    /*
     * Defesa contra corrida de dois updates
     * tentando usar o mesmo e-mail.
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

    console.error(
      "Erro ao atualizar funcionário:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível atualizar o funcionário.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 *
 * Remove logicamente um funcionário.
 *
 * IMPORTANTE:
 *
 * Não apagamos o User fisicamente.
 *
 * Isso preserva:
 *
 * - histórico;
 * - auditoria;
 * - operações realizadas;
 * - rastreabilidade administrativa.
 *
 * A remoção:
 *
 * - define active = false;
 * - preenche removedAt;
 * - revoga todas as sessões;
 * - mantém o registro no banco.
 */

export async function DELETE(
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
     * Somente o Super Admin pode
     * remover funcionários.
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
     * ID
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

    /*
     * =====================================================
     * FUNCIONÁRIO
     * =====================================================
     *
     * O Super Admin não pode ser removido por esta rota.
     */

    const employee =
      await prisma.user.findFirst({
        where: {
          id:
            employeeId,

          role:
            "ADMIN",

          adminProfile: {
            is: {
              isSuperAdmin:
                false,

              removedAt:
                null,
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

              removedAt:
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

const employeeProfile =
  employee.adminProfile;

const removedAt =
  new Date();

await prisma.$transaction(
  async (tx) => {
    await tx.adminProfile.update({
      where: {
        userId:
          employee.id,
      },

      data: {
        active:
          false,

        removedAt,
      },

      select: {
        id:
          true,
      },
    });

    await tx.adminSession.updateMany({
      where: {
        userId:
          employee.id,

        revokedAt:
          null,
      },

      data: {
        revokedAt:
          removedAt,
      },
    });

    const auditChanges:
      Prisma.InputJsonValue =
        {
          name:
            employee.name,

          jobTitle:
            employeeProfile.jobTitle,

          status:
            "REMOVED",

          active:
            false,
        };

    await tx.adminAuditLog.create({
      data: {
        actorId:
          session.userId,

        module:
          "EMPLOYEES",

        action:
          "EMPLOYEE_DISABLED",

        entityType:
          "ADMIN_USER",

        entityId:
          employee.id,

        changes:
          auditChanges,
      },
    });
  }
);

    /*
     * =====================================================
     * SUCESSO
     * =====================================================
     */

    return jsonResponse({
      success:
        true,

      message:
        `Funcionário "${employee.name}" removido com sucesso.`,
    });
  } catch (error) {
    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     */

    const authResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authResponse
    ) {
      return authResponse;
    }

    /*
     * Não imprimimos dados do funcionário,
     * sessões ou informações internas.
     */

    console.error(
      "Erro ao remover funcionário:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível remover o funcionário.",
      },
      500
    );
  }
}