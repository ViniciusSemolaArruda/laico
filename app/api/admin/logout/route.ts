import {
  NextResponse,
} from "next/server";

import {
  createAdminAuditLog,
} from "@/lib/admin-audit";

import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSession,
  revokeAllAdminSessions,
  revokeCurrentAdminSession,
} from "@/lib/admin-auth";

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
        "private, no-store, no-cache, must-revalidate",

      Pragma:
        "no-cache",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get("origin");

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

function clearAdminCookie(
  response: NextResponse
) {
  response.cookies.set({
    name:
      ADMIN_SESSION_COOKIE_NAME,

    value: "",

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "strict",

    path: "/",

    maxAge: 0,
    expires:
      new Date(0),
  });

  return response;
}

async function registerLogoutAudit({
  userId,
  jobTitle,
  scope,
}: {
  userId: string;
  jobTitle: string;
  scope:
    | "CURRENT_SESSION"
    | "ALL_SESSIONS";
}) {
  try {
    await createAdminAuditLog({
      actorId:
        userId,

      module:
        "DASHBOARD",

      action:
        "ADMIN_LOGOUT",

      entityType:
        "ADMIN_USER",

      entityId:
        userId,

      changes: {
        event:
          scope === "ALL_SESSIONS"
            ? "LOGOUT_ALL_DEVICES"
            : "LOGOUT",

        scope,

        jobTitle,
      },
    });
  } catch (
    auditError
  ) {
    /*
     * Auditoria não pode impedir o logout.
     * Não imprimimos sessão, cookie ou token.
     */
    console.error(
      "Falha ao registrar auditoria do logout administrativo:",
      auditError instanceof Error
        ? auditError.name
        : "UnknownError"
    );
  }
}

/*
 * =========================================================
 * POST
 * =========================================================
 *
 * Logout somente deste dispositivo.
 */
export async function POST(
  request: Request
) {
  if (
    !isAllowedOrigin(request)
  ) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      403
    );
  }

  const session =
    await getAdminSession();

  if (session) {
    await registerLogoutAudit({
      userId:
        session.userId,

      jobTitle:
        session.jobTitle,

      scope:
        "CURRENT_SESSION",
    });
  }

  await revokeCurrentAdminSession();

  const response =
    jsonResponse({
      success: true,

      message:
        "Logout realizado com sucesso.",

      redirectTo:
        "/admin/login",
    });

  return clearAdminCookie(
    response
  );
}

/*
 * =========================================================
 * DELETE
 * =========================================================
 *
 * Logout de TODOS os dispositivos.
 *
 * É obrigatório possuir uma sessão administrativa válida,
 * pois precisamos saber qual usuário terá todas as sessões
 * revogadas.
 */
export async function DELETE(
  request: Request
) {
  if (
    !isAllowedOrigin(request)
  ) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      403
    );
  }

  const session =
    await getAdminSession();

  if (!session) {
    return clearAdminCookie(
      jsonResponse(
        {
          error:
            "Sessão administrativa inválida ou expirada.",
        },
        401
      )
    );
  }

  /*
   * Registramos antes da revogação para manter a autoria.
   */
  await registerLogoutAudit({
    userId:
      session.userId,

    jobTitle:
      session.jobTitle,

    scope:
      "ALL_SESSIONS",
  });

  await revokeAllAdminSessions(
    session.userId
  );

  const response =
    jsonResponse({
      success: true,

      message:
        "Todas as sessões administrativas foram encerradas.",

      redirectTo:
        "/admin/login",
    });

  return clearAdminCookie(
    response
  );
}