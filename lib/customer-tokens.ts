import "server-only";

import {
  createHmac,
  randomBytes,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;

const EMAIL_VERIFICATION_DURATION_MS =
  1000 * 60 * 60 * 24;

const PASSWORD_RESET_DURATION_MS =
  1000 * 60 * 60;

function getCustomerTokenSecret() {
  const secret =
    process.env.CUSTOMER_TOKEN_SECRET?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "CUSTOMER_TOKEN_SECRET precisa ter pelo menos 32 caracteres."
    );
  }

  return secret;
}

function generateToken() {
  return randomBytes(
    TOKEN_BYTES
  ).toString("base64url");
}

export function hashCustomerToken(
  token: string
) {
  return createHmac(
    "sha256",
    getCustomerTokenSecret()
  )
    .update(token)
    .digest("hex");
}

/*
 * =========================================================
 * CONFIRMAÇÃO DE E-MAIL
 * =========================================================
 */

export async function createEmailVerificationToken({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const normalizedEmail =
    email.trim().toLowerCase();

  if (
    !userId ||
    !normalizedEmail
  ) {
    throw new Error(
      "Dados inválidos para confirmação de e-mail."
    );
  }

  const now =
    new Date();

  /*
   * Invalida tokens de confirmação anteriores.
   *
   * Assim somente o link mais recente funciona.
   */
  await prisma.emailVerificationToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },

    data: {
      usedAt: now,
    },
  });

  const token =
    generateToken();

  const tokenHash =
    hashCustomerToken(token);

  const expiresAt =
    new Date(
      now.getTime() +
        EMAIL_VERIFICATION_DURATION_MS
    );

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      email:
        normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  /*
   * O token puro é devolvido somente para
   * ser colocado no link enviado por e-mail.
   *
   * Nunca grave esse valor no banco ou logs.
   */
  return {
    token,
    expiresAt,
  };
}

/*
 * =========================================================
 * RECUPERAÇÃO DE SENHA
 * =========================================================
 */

export async function createPasswordResetToken(
  userId: string
) {
  if (!userId) {
    throw new Error(
      "Usuário não informado."
    );
  }

  const now =
    new Date();

  /*
   * Invalida os links anteriores de
   * redefinição de senha.
   */
  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
    },

    data: {
      usedAt: now,
    },
  });

  const token =
    generateToken();

  const tokenHash =
    hashCustomerToken(token);

  const expiresAt =
    new Date(
      now.getTime() +
        PASSWORD_RESET_DURATION_MS
    );

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}