import {
  NextResponse,
} from "next/server";

import {
  createAdminAuditLog,
} from "@/lib/admin-audit";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  disconnectMelhorEnvio,
  getMelhorEnvioConnectionStatus,
} from "@/lib/shipping/melhor-envio-oauth";

export const dynamic =
  "force-dynamic";

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

/*
 * =========================================================
 * HEADERS
 * =========================================================
 */

function noStoreHeaders() {
  return {
    "Cache-Control":
      "private, no-store, no-cache, must-revalidate",

    Pragma:
      "no-cache",

    "X-Content-Type-Options":
      "nosniff",

    "Referrer-Policy":
      "no-referrer",
  };
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

  const fetchSite =
    request.headers.get(
      "sec-fetch-site"
    );

  /*
   * Navegadores modernos enviam Origin em POST.
   * Requisições internas podem não enviar.
   */
  if (
    !origin
  ) {
    return (
      !fetchSite ||
      fetchSite ===
        "same-origin" ||
      fetchSite ===
        "same-site" ||
      fetchSite ===
        "none"
    );
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
 * REDIRECIONAMENTOS
 * =========================================================
 */

function redirectToLogin(
  request: Request
) {
  const url =
    new URL(
      "/admin/login",
      request.url
    );

  url.searchParams.set(
    "redirect",
    "/admin/configuracoes"
  );

  return NextResponse.redirect(
    url,
    {
      status:
        303,

      headers:
        noStoreHeaders(),
    }
  );
}

function redirectToAccessDenied(
  request: Request
) {
  const url =
    new URL(
      "/admin/acesso-negado",
      request.url
    );

  url.searchParams.set(
    "redirect",
    "/admin/configuracoes"
  );

  return NextResponse.redirect(
    url,
    {
      status:
        303,

      headers:
        noStoreHeaders(),
    }
  );
}

function redirectToSettings(
  request: Request,
  parameters: Record<
    string,
    string
  >
) {
  const url =
    new URL(
      "/admin/configuracoes",
      request.url
    );

  for (
    const [
      key,
      value,
    ] of Object.entries(
      parameters
    )
  ) {
    url.searchParams.set(
      key,
      value
    );
  }

  return NextResponse.redirect(
    url,
    {
      status:
        303,

      headers:
        noStoreHeaders(),
    }
  );
}

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
  status: number
) {
  return NextResponse.json(
    body,
    {
      status,

      headers:
        noStoreHeaders(),
    }
  );
}

/*
 * =========================================================
 * DESCONEXÃO
 * =========================================================
 */

export async function POST(
  request: Request
) {
  /*
   * =====================================================
   * ORIGEM
   * =====================================================
   */

  if (
    !isAllowedOrigin(
      request
    )
  ) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      403
    );
  }

  try {
    /*
     * ===================================================
     * AUTORIZAÇÃO
     * ===================================================
     */

    const session =
      await requireAdminPermission(
        "SETTINGS",
        "MANAGE"
      );

    /*
     * Defesa adicional:
     *
     * Somente o Super Admin pode remover
     * credenciais de integrações externas.
     */
    if (
      !session.isSuperAdmin
    ) {
      return redirectToAccessDenied(
        request
      );
    }

    /*
     * ===================================================
     * STATUS ANTERIOR
     * ===================================================
     */

    const previousStatus =
      await getMelhorEnvioConnectionStatus();

    /*
     * ===================================================
     * REMOVER TOKENS
     * ===================================================
     *
     * Remove access token e refresh token
     * criptografados do banco.
     */

    await disconnectMelhorEnvio();

    /*
     * ===================================================
     * AUDITORIA
     * ===================================================
     *
     * Uma falha exclusivamente no histórico não
     * pode restaurar tokens ou impedir a desconexão.
     */

    try {
      await createAdminAuditLog({
        actorId:
          session.userId,

        module:
          "SETTINGS",

        action:
          "SHIPPING_INTEGRATION_DISCONNECTED",

        entityType:
          "SHIPPING_INTEGRATION",

        entityId:
          "MELHOR_ENVIO",

        changes: {
          provider:
            "MELHOR_ENVIO",

          previousConnected:
            previousStatus.connected,

          connected:
            false,

          environment:
            process.env
              .MELHOR_ENVIO_ENV ===
            "production"
              ? "production"
              : "sandbox",
        },
      });
    } catch (
      auditError
    ) {
      /*
       * Não registramos tokens, secrets,
       * cookies ou conteúdo do banco.
       */
      console.error(
        "Falha ao registrar auditoria da desconexão logística:",
        auditError instanceof
          Error
          ? auditError.name
          : "UnknownError"
      );
    }

    return redirectToSettings(
      request,
      {
        shipping_disconnected:
          "true",
      }
    );
  } catch (error) {
    /*
     * ===================================================
     * AUTORIZAÇÃO
     * ===================================================
     */

    if (
      error instanceof
        Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      return redirectToLogin(
        request
      );
    }

    if (
      error instanceof
        Error &&
      error.message ===
        "ADMIN_FORBIDDEN"
    ) {
      return redirectToAccessDenied(
        request
      );
    }

    /*
     * Nunca registramos access token, refresh token,
     * Client Secret, cookies ou credenciais.
     */
    console.error(
      "Erro ao desconectar o Melhor Envio:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return redirectToSettings(
      request,
      {
        shipping_error:
          "Não foi possível desconectar o Melhor Envio.",
      }
    );
  }
}