import "server-only";

import {
  PrismaClient,
} from "@prisma/client";

import {
  PrismaPg,
} from "@prisma/adapter-pg";

import {
  Pool,
} from "pg";

const connectionString =
  process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(
    "DATABASE_URL não foi configurada nas variáveis de ambiente."
  );
}

const globalForPrisma =
  globalThis as unknown as {
    prisma?: PrismaClient;
    pool?: Pool;
  };

function createPostgresPool(): Pool {
  return new Pool({
    connectionString,

    /*
     * O projeto utiliza Neon com uma conexão
     * PostgreSQL protegida por TLS.
     */
    ssl: {
      rejectUnauthorized: true,
    },

    /*
     * Limita conexões abertas por instância
     * da aplicação na Vercel.
     */
    max: 5,

    connectionTimeoutMillis:
      10_000,

    idleTimeoutMillis:
      30_000,

    allowExitOnIdle: true,
  });
}

const pool =
  globalForPrisma.pool ??
  createPostgresPool();

const adapter =
  new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,

    /*
     * Nunca habilite log de queries em
     * produção, pois elas podem conter
     * informações pessoais dos clientes.
     */
    log:
      process.env.NODE_ENV ===
      "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalForPrisma.prisma =
    prisma;

  globalForPrisma.pool =
    pool;
}