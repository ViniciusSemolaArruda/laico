import "server-only";

import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

export const ADMIN_2FA_CHALLENGE_COOKIE_NAME =
  "admin_2fa_challenge";

export const ADMIN_2FA_CHALLENGE_MAX_AGE_SECONDS =
  5 * 60;

export const ADMIN_2FA_MAX_ATTEMPTS =
  5;

const ADMIN_2FA_TOKEN_BYTES =
  32;

type CreatedAdminTwoFactorChallenge = {
  token: string;
  code: string;
  email: string;
  expiresAt: Date;
};

function sha256(
  value: string
) {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

function createCodeHash(
  token: string,
  code: string
) {
  /*
   * O código possui apenas seis dígitos, portanto não
   * deve ser armazenado como um hash simples isolado.
   *
   * Incluímos o token aleatório de 256 bits, que existe
   * somente no cookie HttpOnly do navegador. Assim um
   * vazamento somente do banco não permite testar offline
   * os 1.000.000 de códigos possíveis.
   */
  return sha256(
    `${token}:${code}`
  );
}

function isValidChallengeToken(
  token: string
) {
  return (
    token.length >= 32 &&
    token.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

function isValidCode(
  code: string
) {
  return /^\d{6}$/.test(code);
}

function safeHashEqual(
  first: string,
  second: string
) {
  try {
    const firstBuffer =
      Buffer.from(first, "hex");

    const secondBuffer =
      Buffer.from(second, "hex");

    return (
      firstBuffer.length ===
        secondBuffer.length &&
      timingSafeEqual(
        firstBuffer,
        secondBuffer
      )
    );
  } catch {
    return false;
  }
}

export function getAdminTwoFactorCookieOptions() {
  return {
    name:
      ADMIN_2FA_CHALLENGE_COOKIE_NAME,

    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "strict" as const,

    path:
      "/api/admin",

    maxAge:
      ADMIN_2FA_CHALLENGE_MAX_AGE_SECONDS,
  };
}

export async function createAdminTwoFactorChallenge(
  userId: string
): Promise<CreatedAdminTwoFactorChallenge> {
  const admin =
    await prisma.user.findFirst({
      where: {
        id: userId,
        role: "ADMIN",

        adminProfile: {
          is: {
            active: true,
            removedAt: null,
          },
        },
      },

      select: {
        id: true,
        email: true,
      },
    });

  if (!admin) {
    throw new Error(
      "ADMIN_2FA_INVALID_USER"
    );
  }

  const token =
    randomBytes(
      ADMIN_2FA_TOKEN_BYTES
    ).toString("base64url");

  const code =
    randomInt(0, 1_000_000)
      .toString()
      .padStart(6, "0");

  const tokenHash =
    sha256(token);

  const codeHash =
    createCodeHash(
      token,
      code
    );

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        ADMIN_2FA_CHALLENGE_MAX_AGE_SECONDS *
          1000
    );

  await prisma.$transaction(
    async (transaction) => {
      /*
       * Um novo desafio invalida qualquer desafio
       * anterior ainda aberto para este administrador.
       */
      await transaction.adminTwoFactorChallenge.updateMany({
        where: {
          userId:
            admin.id,

          usedAt:
            null,
        },

        data: {
          usedAt:
            now,
        },
      });

      await transaction.adminTwoFactorChallenge.create({
        data: {
          userId:
            admin.id,

          tokenHash,
          codeHash,
          expiresAt,
        },

        select: {
          id: true,
        },
      });
    }
  );

  return {
    token,
    code,
    email:
      admin.email,
    expiresAt,
  };
}

export async function revokeAdminTwoFactorChallenge(
  token: string
) {
  if (
    !isValidChallengeToken(
      token
    )
  ) {
    return;
  }

  await prisma.adminTwoFactorChallenge.updateMany({
    where: {
      tokenHash:
        sha256(token),

      usedAt:
        null,
    },

    data: {
      usedAt:
        new Date(),
    },
  });
}

export async function verifyAdminTwoFactorChallenge({
  token,
  code,
}: {
  token: string;
  code: string;
}): Promise<string | null> {
  if (
    !isValidChallengeToken(token) ||
    !isValidCode(code)
  ) {
    return null;
  }

  const tokenHash =
    sha256(token);

  const challenge =
    await prisma.adminTwoFactorChallenge.findUnique({
      where: {
        tokenHash,
      },

      select: {
        id: true,
        userId: true,
        codeHash: true,
        attempts: true,
        expiresAt: true,
        usedAt: true,

        user: {
          select: {
            role: true,

            adminProfile: {
              select: {
                active: true,
                removedAt: true,
              },
            },
          },
        },
      },
    });

  const now =
    new Date();

  if (
    !challenge ||
    challenge.usedAt ||
    challenge.expiresAt <= now ||
    challenge.attempts >=
      ADMIN_2FA_MAX_ATTEMPTS ||
    challenge.user.role !==
      "ADMIN" ||
    !challenge.user.adminProfile?.active ||
    challenge.user.adminProfile.removedAt !==
      null
  ) {
    return null;
  }

  const receivedCodeHash =
    createCodeHash(
      token,
      code
    );

  if (
    !safeHashEqual(
      receivedCodeHash,
      challenge.codeHash
    )
  ) {
    await prisma.adminTwoFactorChallenge.updateMany({
      where: {
        id:
          challenge.id,

        usedAt:
          null,

        expiresAt: {
          gt: now,
        },

        attempts: {
          lt:
            ADMIN_2FA_MAX_ATTEMPTS,
        },
      },

      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    return null;
  }

  /*
   * Reivindicação atômica: duas requisições com o
   * mesmo código não conseguem criar duas sessões.
   */
  const consumed =
    await prisma.adminTwoFactorChallenge.updateMany({
      where: {
        id:
          challenge.id,

        usedAt:
          null,

        expiresAt: {
          gt: now,
        },

        attempts: {
          lt:
            ADMIN_2FA_MAX_ATTEMPTS,
        },
      },

      data: {
        usedAt:
          now,
      },
    });

  if (
    consumed.count !== 1
  ) {
    return null;
  }

  return challenge.userId;
}