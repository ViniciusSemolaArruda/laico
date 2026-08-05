import { NextResponse } from "next/server";

import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 8192;

type ProfileBody = {
  name?: unknown;
  phone?: unknown;
};

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
      new URL(request.url).origin
    );
  } catch {
    return false;
  }
}

function normalizeName(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

function normalizePhone(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\D/g, "")
    .slice(0, 11);
}

export async function PATCH(
  request: Request
) {
  /*
   * =====================================================
   * SESSÃO
   * =====================================================
   */

  const session =
    await getCustomerSession();

  if (!session) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      401
    );
  }

  try {
    /*
     * =====================================================
     * ORIGEM
     * =====================================================
     */

    if (!isSameOrigin(request)) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

    /*
     * =====================================================
     * CONTENT TYPE
     * =====================================================
     */

    const contentType =
      request.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da requisição inválido.",
        },
        415
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Dados inválidos.",
        },
        400
      );
    }

    let body: ProfileBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as ProfileBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Dados inválidos.",
        },
        400
      );
    }

    const name =
      normalizeName(
        body.name
      );

    const phone =
      normalizePhone(
        body.phone
      );

    if (
      name.length < 2
    ) {
      return jsonResponse(
        {
          error:
            "Informe seu nome completo.",
        },
        400
      );
    }

    /*
     * Telefone é opcional.
     *
     * Caso informado, precisa possuir
     * 10 ou 11 dígitos.
     */

    if (
      phone &&
      phone.length !== 10 &&
      phone.length !== 11
    ) {
      return jsonResponse(
        {
          error:
            "Informe um telefone válido com DDD.",
        },
        400
      );
    }

    /*
     * =====================================================
     * UPDATE
     * =====================================================
     *
     * userId vem exclusivamente da sessão.
     *
     * Nunca aceitamos:
     *
     * body.userId
     * query.userId
     * parâmetros do navegador.
     */

    const result =
      await prisma.user.updateMany({
        where: {
          id:
            session.userId,

          role:
            "USER",

          accountStatus:
            "ACTIVE",

          emailVerifiedAt: {
            not: null,
          },

          disabledAt:
            null,
        },

        data: {
          name,

          phone:
            phone || null,
        },
      });

    if (
      result.count !== 1
    ) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        401
      );
    }

    return jsonResponse({
      success: true,

      profile: {
        name,
        phone:
          phone || null,
      },

      message:
        "Dados atualizados com sucesso.",
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar perfil:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível atualizar seus dados.",
      },
      500
    );
  }
}