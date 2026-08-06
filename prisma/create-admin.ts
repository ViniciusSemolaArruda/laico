import {
  config,
} from "dotenv";

config({
  quiet: true,
});

import bcrypt from "bcryptjs";

import {
  PrismaClient,
} from "@prisma/client";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  Pool,
} from "pg";

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeText(
  value: string | undefined,
  maximumLength: number
): string {
  return (
    value
      ?.trim()
      .slice(
        0,
        maximumLength
      ) || ""
  );
}

/*
 * =========================================================
 * SENHA
 * =========================================================
 */

function validateAdminPassword(
  password: string
): void {
  if (
    password.length < 16
  ) {
    throw new Error(
      "CREATE_ADMIN_PASSWORD precisa ter pelo menos 16 caracteres."
    );
  }

  if (
    !/[a-z]/.test(
      password
    )
  ) {
    throw new Error(
      "A senha precisa ter pelo menos uma letra minúscula."
    );
  }

  if (
    !/[A-Z]/.test(
      password
    )
  ) {
    throw new Error(
      "A senha precisa ter pelo menos uma letra maiúscula."
    );
  }

  if (
    !/[0-9]/.test(
      password
    )
  ) {
    throw new Error(
      "A senha precisa ter pelo menos um número."
    );
  }

  if (
    !/[^a-zA-Z0-9]/.test(
      password
    )
  ) {
    throw new Error(
      "A senha precisa ter pelo menos um caractere especial."
    );
  }

  /*
   * bcrypt trabalha com no máximo
   * 72 bytes significativos.
   */
  if (
    Buffer.byteLength(
      password,
      "utf8"
    ) > 72
  ) {
    throw new Error(
      "CREATE_ADMIN_PASSWORD não pode ultrapassar 72 bytes."
    );
  }
}

/*
 * =========================================================
 * VARIÁVEIS
 * =========================================================
 */

const connectionString =
  process.env
    .DATABASE_URL
    ?.trim();

const adminName =
  normalizeText(
    process.env
      .CREATE_ADMIN_NAME,
    120
  ) ||
  "Administrador";

const adminEmail =
  normalizeText(
    process.env
      .CREATE_ADMIN_EMAIL,
    254
  ).toLowerCase();

const adminPassword =
  process.env
    .CREATE_ADMIN_PASSWORD ||
  "";

const adminJobTitle =
  "Administrador principal";

/*
 * =========================================================
 * VALIDAÇÃO
 * =========================================================
 */

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não foi configurada."
  );
}

if (
  !adminEmail ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    adminEmail
  )
) {
  throw new Error(
    "CREATE_ADMIN_EMAIL não foi configurado corretamente."
  );
}

validateAdminPassword(
  adminPassword
);

/*
 * =========================================================
 * PRISMA
 * =========================================================
 */

const pool =
  new Pool({
    connectionString,

    ssl: {
      rejectUnauthorized:
        true,
    },

    max:
      1,

    connectionTimeoutMillis:
      10_000,

    idleTimeoutMillis:
      10_000,

    allowExitOnIdle:
      true,
  });

const adapter =
  new PrismaPg(
    pool
  );

const prisma =
  new PrismaClient({
    adapter,

    log: [
      "error",
    ],
  });

/*
 * =========================================================
 * CRIAR / ATUALIZAR SUPER ADMIN
 * =========================================================
 */

async function main() {
  /*
   * Primeiro verificamos se já existe
   * alguém utilizando o e-mail.
   */

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email:
          adminEmail,
      },

      select: {
        id:
          true,

        role:
          true,
      },
    });

  /*
   * Proteção importante:
   *
   * Se CREATE_ADMIN_EMAIL for configurado
   * acidentalmente com o e-mail de um CLIENTE,
   * não transformamos esse cliente em ADMIN.
   */

  if (
    existingUser &&
    existingUser.role !==
      "ADMIN"
  ) {
    throw new Error(
      "CREATE_ADMIN_EMAIL pertence a uma conta de cliente. Por segurança, essa conta não foi promovida para administrador."
    );
  }

  /*
   * Hash seguro.
   */

  const hashedPassword =
    await bcrypt.hash(
      adminPassword,
      12
    );

  const now =
    new Date();

  /*
   * Usuário + perfil administrativo são
   * configurados em uma transação.
   */

  const result =
    await prisma.$transaction(
      async (tx) => {
        let adminId:
          string;

        if (
          existingUser
        ) {
          /*
           * ADMIN JÁ EXISTENTE
           */

          const admin =
            await tx.user.update({
              where: {
                id:
                  existingUser.id,
              },

              data: {
                name:
                  adminName,

                password:
                  hashedPassword,

                passwordChangedAt:
                  now,

                role:
                  "ADMIN",
              },

              select: {
                id:
                  true,
              },
            });

          adminId =
            admin.id;
        } else {
          /*
           * PRIMEIRA CRIAÇÃO
           */

          const admin =
            await tx.user.create({
              data: {
                name:
                  adminName,

                email:
                  adminEmail,

                password:
                  hashedPassword,

                role:
                  "ADMIN",

                passwordChangedAt:
                  now,
              },

              select: {
                id:
                  true,
              },
            });

          adminId =
            admin.id;
        }

        /*
         * =================================================
         * PERFIL DE SUPER ADMIN
         * =================================================
         *
         * Apenas esta conta inicial recebe
         * isSuperAdmin = true.
         *
         * Funcionários criados pelo painel
         * receberão false.
         */

        await tx.adminProfile.upsert({
          where: {
            userId:
              adminId,
          },

          update: {
            jobTitle:
              adminJobTitle,

            active:
              true,

            isSuperAdmin:
              true,
          },

          create: {
            userId:
              adminId,

            jobTitle:
              adminJobTitle,

            active:
              true,

            isSuperAdmin:
              true,

            createdById:
              null,
          },
        });

        /*
         * =================================================
         * REVOGAR SESSÕES ADMIN ANTIGAS
         * =================================================
         *
         * Estamos redefinindo a senha administrativa.
         *
         * Quando migrarmos para AdminSession,
         * nenhuma sessão antiga armazenada no banco
         * continuará válida.
         */

        await tx.adminSession.updateMany({
          where: {
            userId:
              adminId,

            revokedAt:
              null,
          },

          data: {
            revokedAt:
              now,
          },
        });

        return {
          adminId,
        };
      }
    );

  /*
   * Não exibimos:
   *
   * - senha;
   * - hash;
   * - DATABASE_URL;
   * - tokens;
   */

  console.log(
    "Super administrador configurado com sucesso.",
    {
      id:
        result.adminId,

      role:
        "ADMIN",

      isSuperAdmin:
        true,
    }
  );
}

/*
 * =========================================================
 * EXECUÇÃO
 * =========================================================
 */

main()
  .catch(
    (
      error:
        unknown
    ) => {
      const message =
        error instanceof
        Error
          ? error.message
          : "Erro desconhecido.";

      console.error(
        "Não foi possível configurar o super administrador:",
        message
      );

      process.exitCode =
        1;
    }
  )
  .finally(
    async () => {
      await prisma.$disconnect();

      await pool.end();
    }
  );