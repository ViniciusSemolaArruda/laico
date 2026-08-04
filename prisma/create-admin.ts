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

function normalizeText(
  value: string | undefined,
  maximumLength: number
): string {
  return value
    ?.trim()
    .slice(0, maximumLength) || "";
}

function validateAdminPassword(
  password: string
): void {
  if (password.length < 16) {
    throw new Error(
      "CREATE_ADMIN_PASSWORD precisa ter pelo menos 16 caracteres."
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new Error(
      "A senha precisa ter pelo menos uma letra minúscula."
    );
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error(
      "A senha precisa ter pelo menos uma letra maiúscula."
    );
  }

  if (!/[0-9]/.test(password)) {
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
}

const connectionString =
  process.env.DATABASE_URL?.trim();

const adminName =
  normalizeText(
    process.env.CREATE_ADMIN_NAME,
    120
  ) || "Administrador";

const adminEmail =
  normalizeText(
    process.env.CREATE_ADMIN_EMAIL,
    254
  ).toLowerCase();

const adminPassword =
  process.env.CREATE_ADMIN_PASSWORD ||
  "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não foi configurada."
  );
}

if (
  !adminEmail ||
  !adminEmail.includes("@")
) {
  throw new Error(
    "CREATE_ADMIN_EMAIL não foi configurado corretamente."
  );
}

validateAdminPassword(
  adminPassword
);

const pool =
  new Pool({
    connectionString,

    ssl: {
      rejectUnauthorized: true,
    },

    max: 1,

    connectionTimeoutMillis:
      10_000,

    idleTimeoutMillis:
      10_000,

    allowExitOnIdle: true,
  });

const adapter =
  new PrismaPg(pool);

const prisma =
  new PrismaClient({
    adapter,
    log: ["error"],
  });

async function main() {
  /*
   * O custo 12 oferece uma proteção maior
   * do que o custo 10 anteriormente utilizado.
   */
  const hashedPassword =
    await bcrypt.hash(
      adminPassword,
      12
    );

  const admin =
    await prisma.user.upsert({
      where: {
        email: adminEmail,
      },

      update: {
        name: adminName,
        password:
          hashedPassword,
        role: "ADMIN",
      },

      create: {
        name: adminName,
        email: adminEmail,
        password:
          hashedPassword,
        role: "ADMIN",
      },

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

  console.log(
    "Administrador criado ou atualizado com sucesso:",
    {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    }
  );

  /*
   * A senha não é exibida no terminal.
   */
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido.";

    console.error(
      "Não foi possível criar o administrador:",
      message
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });