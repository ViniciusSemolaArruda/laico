import "server-only";

import {
  createHmac,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
  blockMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function getRateLimitSecret() {
  const secret =
    process.env
      .CUSTOMER_TOKEN_SECRET
      ?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "CUSTOMER_TOKEN_SECRET não configurado corretamente."
    );
  }

  return secret;
}

function hashRateLimitKey(
  scope: string,
  identifier: string
) {
  const normalizedScope =
    scope
      .trim()
      .toLowerCase()
      .slice(0, 100);

  const normalizedIdentifier =
    identifier
      .trim()
      .toLowerCase()
      .slice(0, 500);

  return createHmac(
    "sha256",
    getRateLimitSecret()
  )
    .update(
      `rate-limit:${normalizedScope}:${normalizedIdentifier}`
    )
    .digest("hex");
}

export function getClientIp(
  request: Request
) {
  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return firstIp.slice(
        0,
        100
      );
    }
  }

  const realIp =
    request.headers
      .get("x-real-ip")
      ?.trim();

  if (realIp) {
    return realIp.slice(
      0,
      100
    );
  }

  /*
   * Nunca usamos o IP diretamente como
   * chave no banco.
   *
   * Ele será transformado em HMAC antes
   * de ser persistido.
   */
  return "unknown";
}

export async function consumeRateLimit({
  scope,
  identifier,
  limit,
  windowMs,
  blockMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  if (
    !scope ||
    !identifier ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    windowMs < 1000 ||
    blockMs < 1000
  ) {
    throw new Error(
      "Configuração de rate limit inválida."
    );
  }

  const keyHash =
    hashRateLimitKey(
      scope,
      identifier
    );

  const now =
    new Date();

  const windowLimit =
    new Date(
      now.getTime() -
        windowMs
    );

  /*
   * Se a janela anterior terminou e
   * qualquer bloqueio também terminou,
   * zeramos o contador.
   */
  await prisma.loginRateLimit.updateMany({
    where: {
      keyHash,

      windowStartedAt: {
        lte:
          windowLimit,
      },

      OR: [
        {
          blockedUntil:
            null,
        },

        {
          blockedUntil: {
            lte: now,
          },
        },
      ],
    },

    data: {
      attempts: 0,

      windowStartedAt:
        now,

      blockedUntil:
        null,

      expiresAt:
        new Date(
          now.getTime() +
            Math.max(
              windowMs,
              blockMs
            )
        ),
    },
  });

  /*
   * Increment é executado pelo próprio
   * PostgreSQL.
   *
   * Isso é importante na Vercel, onde
   * diferentes Functions podem receber
   * requisições simultaneamente.
   */
  const record =
    await prisma.loginRateLimit.upsert({
      where: {
        keyHash,
      },

      create: {
        keyHash,
        attempts: 1,

        windowStartedAt:
          now,

        expiresAt:
          new Date(
            now.getTime() +
              Math.max(
                windowMs,
                blockMs
              )
          ),
      },

      update: {
        attempts: {
          increment: 1,
        },
      },

      select: {
        attempts: true,
        blockedUntil: true,
        windowStartedAt:
          true,
      },
    });

  /*
   * Já estava bloqueado.
   */
  if (
    record.blockedUntil &&
    record.blockedUntil >
      now
  ) {
    return {
      allowed: false,

      retryAfterSeconds:
        Math.max(
          1,

          Math.ceil(
            (
              record.blockedUntil.getTime() -
              now.getTime()
            ) /
              1000
          )
        ),
    };
  }

  /*
   * Permitimos até `limit`
   * requisições na janela.
   *
   * A seguinte já causa bloqueio.
   */
  if (
    record.attempts >
    limit
  ) {
    const blockedUntil =
      new Date(
        now.getTime() +
          blockMs
      );

    await prisma.loginRateLimit.updateMany({
      where: {
        keyHash,

        OR: [
          {
            blockedUntil:
              null,
          },

          {
            blockedUntil: {
              lte: now,
            },
          },
        ],
      },

      data: {
        blockedUntil,

        expiresAt:
          blockedUntil,
      },
    });

    return {
      allowed: false,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            blockMs / 1000
          )
        ),
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}