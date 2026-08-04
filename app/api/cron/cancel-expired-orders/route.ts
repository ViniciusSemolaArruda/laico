//app\api\cron\cancel-expired-orders\route.ts
import {
  createHash,
  timingSafeEqual,
} from "node:crypto";

import { NextResponse } from "next/server";

import { cancelExpiredOrders } from "@/lib/orders/cancelExpiredOrders";

export const dynamic =
  "force-dynamic";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function createSecretHash(
  value: string
) {
  return createHash("sha256")
    .update(value)
    .digest();
}

function isValidAuthorization(
  authorizationHeader: string | null,
  cronSecret: string
) {
  if (!authorizationHeader) {
    return false;
  }

  const expectedAuthorization =
    `Bearer ${cronSecret}`;

  const receivedHash =
    createSecretHash(
      authorizationHeader
    );

  const expectedHash =
    createSecretHash(
      expectedAuthorization
    );

  return timingSafeEqual(
    receivedHash,
    expectedHash
  );
}

export async function GET(
  request: Request
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (
    !cronSecret ||
    cronSecret.length < 32
  ) {
    console.error(
      "CRON_SECRET não foi configurado corretamente."
    );

    return jsonResponse(
      {
        error:
          "Serviço temporariamente indisponível.",
      },
      503
    );
  }

  const authorizationHeader =
    request.headers.get(
      "authorization"
    );

  if (
    !isValidAuthorization(
      authorizationHeader,
      cronSecret
    )
  ) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      401
    );
  }

  try {
    const canceled =
      await cancelExpiredOrders();

    return jsonResponse({
      success: true,
      canceled,
    });
  } catch (error) {
    console.error(
      "Erro ao cancelar pedidos expirados:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido."
    );

    return jsonResponse(
      {
        error:
          "Não foi possível executar o cancelamento automático.",
      },
      500
    );
  }
}