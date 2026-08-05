import { NextResponse } from "next/server";

import {
  revokeCurrentCustomerSession,
} from "@/lib/customer-auth";

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

      Pragma:
        "no-cache",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function isSameOrigin(
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
      new URL(request.url)
        .origin
    );
  } catch {
    return false;
  }
}

/*
 * Logout somente por POST.
 *
 * Não criamos GET /logout porque links,
 * crawlers e prefetch não devem conseguir
 * modificar uma sessão.
 */
export async function POST(
  request: Request
) {
  if (!isSameOrigin(request)) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      403
    );
  }

  try {
    /*
     * Revoga a sessão no banco e remove
     * o cookie HttpOnly.
     *
     * Apagar somente o cookie não seria
     * suficiente.
     */
    await revokeCurrentCustomerSession();

    return jsonResponse({
      success: true,

      redirectTo:
        "/entrar",
    });
  } catch (error) {
    console.error(
      "Erro no logout do cliente:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível encerrar a sessão.",
      },
      500
    );
  }
}