import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import {
  createAdminToken,
} from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const MAXIMUM_REQUEST_SIZE = 5_000;
const ADMIN_SESSION_DURATION =
  60 * 60 * 8;

/*
 * Hash válido usado somente para manter o
 * tempo da resposta semelhante quando o
 * e-mail não existe.
 */
const DUMMY_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

type AdminLoginBody = {
  email?: unknown;
  password?: unknown;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function normalizeEmail(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

function normalizePassword(
  value: unknown
) {
  if (typeof value !== "string") {
    return "";
  }

  /*
   * Senhas não recebem trim porque espaços
   * podem fazer parte da senha.
   */
  return value.slice(0, 200);
}

function isValidEmail(
  email: string
) {
  return (
    email.length >= 5 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  );
}

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get("origin");

  /*
   * Alguns clientes HTTP podem não enviar
   * Origin. Navegadores enviam no POST.
   */
  if (!origin) {
    return true;
  }

  try {
    const requestOrigin =
      new URL(request.url).origin;

    return origin === requestOrigin;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request
) {
  try {
    if (!isAllowedOrigin(request)) {
      return jsonResponse(
        {
          error:
            "Você não tem permissão para fazer isso! Acesso negado.",
        },
        403
      );
    }

    const contentType =
      request.headers.get(
        "content-type"
      );

    if (
      !contentType
        ?.toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da solicitação inválido.",
        },
        415
      );
    }

    const contentLength = Number(
      request.headers.get(
        "content-length"
      ) || 0
    );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAXIMUM_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "A solicitação é muito grande.",
        },
        413
      );
    }

    let body: AdminLoginBody;

    try {
      const rawBody =
        await request.text();

      if (
        rawBody.length >
        MAXIMUM_REQUEST_SIZE
      ) {
        return jsonResponse(
          {
            error:
              "A solicitação é muito grande.",
          },
          413
        );
      }

      body = JSON.parse(
        rawBody
      ) as AdminLoginBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    const email =
      normalizeEmail(
        body.email
      );

    const password =
      normalizePassword(
        body.password
      );

    if (
      !isValidEmail(email) ||
      password.length < 8
    ) {
      return jsonResponse(
        {
          error:
            "E-mail ou senha inválidos.",
        },
        401
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },

        select: {
          id: true,
          role: true,
          password: true,
        },
      });

    /*
     * Sempre executamos bcrypt.compare,
     * mesmo quando o e-mail não existe.
     * Isso dificulta descobrir quais
     * contas administrativas existem.
     */
    const passwordHash =
      user?.password ||
      DUMMY_PASSWORD_HASH;

    const passwordIsValid =
      await bcrypt.compare(
        password,
        passwordHash
      );

    if (
      !user ||
      user.role !== "ADMIN" ||
      !user.password ||
      !passwordIsValid
    ) {
      return jsonResponse(
        {
          error:
            "E-mail ou senha inválidos.",
        },
        401
      );
    }

    const token =
      await createAdminToken(
        user.id
      );

    const response =
      jsonResponse({
        success: true,
      });

    /*
     * Sobrescreve qualquer sessão anterior,
     * evitando reutilização da sessão antiga.
     */
    response.cookies.set({
      name: "admin_session",
      value: token,
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "strict",
      path: "/",

      maxAge:
        ADMIN_SESSION_DURATION,
    });

    return response;
  } catch (error) {
    console.error(
      "Erro no login administrativo:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido."
    );

    return jsonResponse(
      {
        error:
          "Não foi possível realizar o login.",
      },
      500
    );
  }
}