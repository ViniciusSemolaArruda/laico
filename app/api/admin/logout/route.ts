import {
  NextResponse,
} from "next/server";

import {
  createAdminAuditLog,
} from "@/lib/admin-audit";

import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSession,
  revokeCurrentAdminSession,
} from "@/lib/admin-auth";

export const dynamic =
  "force-dynamic";

/*
 * =========================================================
 * JSON
 * =========================================================
 */

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

/*
 * =========================================================
 * ORIGEM
 * =========================================================
 */

function isAllowedOrigin(
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
      new URL(
        request.url
      ).origin
    );
  } catch {
    return false;
  }
}

/*
 * =========================================================
 * APAGAR COOKIE
 * =========================================================
 */

function clearAdminCookie(
  response:
    NextResponse
) {
  response.cookies.set({
    name:
      ADMIN_SESSION_COOKIE_NAME,

    value:
      "",

    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "strict",

    path:
      "/",

    maxAge:
      0,

    expires:
      new Date(0),
  });

  return response;
}

/*
 * =========================================================
 * LOGOUT
 * =========================================================
 */

export async function POST(
  request: Request
) {
  /*
   * =======================================================
   * ORIGEM
   * =======================================================
   */

  if (
    !isAllowedOrigin(
      request
    )
  ) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      403
    );
  }

  /*
   * =======================================================
   * SESSÃO ATUAL
   * =======================================================
   *
   * Precisamos descobrir quem está saindo
   * ANTES de revogar a sessão.
   */

  const session =
    await getAdminSession();

  /*
   * =======================================================
   * AUDITORIA
   * =======================================================
   */

  if (
    session
  ) {
    try {
      await createAdminAuditLog({
        actorId:
          session.userId,

        module:
          "DASHBOARD",

        action:
          "ADMIN_LOGOUT",

        entityType:
          "ADMIN_USER",

        entityId:
          session.userId,

        changes: {
          event:
            "LOGOUT",

          sessionId:
            session.sessionId,

          jobTitle:
            session.jobTitle,

          isSuperAdmin:
            session.isSuperAdmin,
        },
      });
    } catch (
      auditError
    ) {
      /*
       * Um erro apenas no histórico não pode
       * impedir o usuário de sair.
       */

      console.error(
        "Falha ao registrar auditoria do logout administrativo:",
        auditError instanceof
          Error
          ? auditError.name
          : "UnknownError"
      );
    }
  }

  /*
   * =======================================================
   * REVOGAR SESSÃO
   * =======================================================
   */

  await revokeCurrentAdminSession();

  /*
   * =======================================================
   * RESPOSTA
   * =======================================================
   */

  const response =
    jsonResponse({
      success:
        true,

      message:
        "Logout realizado com sucesso.",

      redirectTo:
        "/admin/login",
    });

  /*
   * Remove o token do navegador.
   */

  return clearAdminCookie(
    response
  );
}