import { config } from "dotenv";
config();

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const password = "Admin@2026#Laico";

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: {
      email: "admin@laico.com.br",
    },
    update: {
      name: "Administrador",
      password: hashedPassword,
      role: "ADMIN",
    },
    create: {
      name: "Administrador",
      email: "admin@laico.com.br",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Admin criado com sucesso!");
  console.log("E-mail: admin@laico.com.br");
  console.log("Senha: Admin@2026#Laico");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });