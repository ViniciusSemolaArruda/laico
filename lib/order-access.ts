import "server-only";

import {
  createHmac,
  randomBytes,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

const COOKIE_PREFIX =
  "laico_order_access_";

const GUEST_TOKEN_DURATION_MS =
  1000 * 60 * 60 * 24 * 30;

export const ORDER_ACCESS_MAX_AGE_SECONDS =
  60 * 60 * 24 * 30;

type OrderAccessPayload = {
  orderId: string;
  userId: string;
  tokenId: string;
  type: "GUEST" | "EMAIL_LINK";
  expiresAt: Date;
};

function getSecret(): string {
  const secret =
    process.env.ORDER_ACCESS_SECRET?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "ORDER_ACCESS_SECRET precisa ter pelo menos 32 caracteres."
    );
  }

  return secret;
}

function generateSecureToken(): string {
  /*
   * Gera 256 bits de aleatoriedade.
   *
   * O token verdadeiro será entregue somente
   * ao navegador e nunca será salvo no banco.
   */
  return randomBytes(32).toString(
    "base64url"
  );
}

function hashToken(
  token: string
): string {
  /*
   * O HMAC impede que o valor salvo no banco
   * seja usado diretamente como token.
   */
  return createHmac(
    "sha256",
    getSecret()
  )
    .update(token)
    .digest("hex");
}

function isValidTokenFormat(
  token: string
): boolean {
  /*
   * Um token de 32 bytes convertido para
   * base64url possui exatamente 43 caracteres.
   *
   * Esta validação também impede que alguém
   * envie valores gigantes para a aplicação.
   */
  return /^[A-Za-z0-9_-]{43}$/.test(
    token
  );
}

export function getOrderAccessCookieName(
  orderId: string
): string {
  const safeOrderId =
    orderId.replace(
      /[^a-zA-Z0-9_-]/g,
      ""
    );

  return `${COOKIE_PREFIX}${safeOrderId}`;
}

export function getOrderAccessCookieOptions(
  orderId: string
) {
  return {
    name: getOrderAccessCookieName(
      orderId
    ),

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax" as const,

    /*
     * O cookie precisa funcionar nas páginas
     * /pedido, /meus-pedidos e nas APIs.
     */
    path: "/",

    maxAge:
      ORDER_ACCESS_MAX_AGE_SECONDS,
  };
}

export async function createOrderAccessToken({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}): Promise<string> {
  /*
   * Antes de gerar o acesso, confirmamos que
   * o pedido realmente pertence ao usuário
   * informado pelo checkout.
   */
  const order =
    await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },

      select: {
        id: true,
      },
    });

  if (!order) {
    throw new Error(
      "Não foi possível criar o acesso ao pedido."
    );
  }

  const token =
    generateSecureToken();

  const tokenHash =
    hashToken(token);

  const now = new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        GUEST_TOKEN_DURATION_MS
    );

  /*
   * Revoga tokens antigos e cria um token
   * exclusivo para esta compra.
   *
   * O token verdadeiro não é armazenado.
   */
  await prisma.$transaction([
    prisma.orderAccessToken.updateMany({
      where: {
        orderId,
        type: "GUEST",
        revokedAt: null,
      },

      data: {
        revokedAt: now,
      },
    }),

    prisma.orderAccessToken.create({
      data: {
        orderId,
        tokenHash,
        type: "GUEST",
        expiresAt,
      },
    }),
  ]);

  return token;
}

export async function verifyOrderAccessToken({
  token,
  expectedOrderId,
}: {
  token: string;
  expectedOrderId: string;
}): Promise<OrderAccessPayload | null> {
  if (
    !token ||
    !expectedOrderId ||
    !isValidTokenFormat(token)
  ) {
    return null;
  }

  try {
    const tokenHash =
      hashToken(token);

    const accessToken =
      await prisma.orderAccessToken.findFirst({
        where: {
          orderId:
            expectedOrderId,

          tokenHash,

          revokedAt: null,

          expiresAt: {
            gt: new Date(),
          },
        },

        select: {
          id: true,
          orderId: true,
          type: true,
          expiresAt: true,

          order: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!accessToken) {
      return null;
    }

    return {
      orderId:
        accessToken.orderId,

      userId:
        accessToken.order.userId,

      tokenId:
        accessToken.id,

      type:
        accessToken.type,

      expiresAt:
        accessToken.expiresAt,
    };
  } catch (error) {
    console.error(
      "Falha ao validar acesso ao pedido:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return null;
  }
}

export async function revokeOrderAccessToken({
  orderId,
  token,
}: {
  orderId: string;
  token: string;
}): Promise<boolean> {
  if (
    !orderId ||
    !isValidTokenFormat(token)
  ) {
    return false;
  }

  const result =
    await prisma.orderAccessToken.updateMany({
      where: {
        orderId,
        tokenHash:
          hashToken(token),
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

  return result.count > 0;
}

export async function revokeAllOrderAccessTokens(
  orderId: string
): Promise<number> {
  if (!orderId) {
    return 0;
  }

  const result =
    await prisma.orderAccessToken.updateMany({
      where: {
        orderId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

  return result.count;
}