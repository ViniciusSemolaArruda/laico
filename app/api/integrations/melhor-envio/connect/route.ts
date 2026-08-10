import {
  randomBytes,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  createMelhorEnvioAuthorizationUrl,
} from "@/lib/shipping/melhor-envio-oauth";

export const dynamic =
  "force-dynamic";

const OAUTH_STATE_COOKIE_NAME =
  "laico_melhor_envio_oauth_state";

const OAUTH_STATE_MAX_AGE_SECONDS =
  10 *
  60;

/*
 * =========================================================
 * RESPOSTAS
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
  };
}

function redirectToAdminLogin(
  request: Request
) {
  const loginUrl =
    new URL(
      "/admin/login",
      request.url
    );

  loginUrl.searchParams.set(
    "redirect",
    "/admin/configuracoes"
  );

  return NextResponse.redirect(
    loginUrl,
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
  const accessDeniedUrl =
    new URL(
      "/admin/acesso-negado",
      request.url
    );

  accessDeniedUrl.searchParams.set(
    "redirect",
    "/admin/configuracoes"
  );

  return NextResponse.redirect(
    accessDeniedUrl,
    {
      status:
        303,

      headers:
        noStoreHeaders(),
    }
  );
}

function redirectToConfigurationError(
  request: Request
) {
  const configurationUrl =
    new URL(
      "/admin/configuracoes",
      request.url
    );

  configurationUrl.searchParams.set(
    "shipping_error",
    "Não foi possível iniciar a conexão com o Melhor Envio."
  );

  return NextResponse.redirect(
    configurationUrl,
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
 * AUTORIZAÇÃO
 * =========================================================
 */

function getAuthorizationError(
  error: unknown
) {
  if (
    !(error instanceof Error)
  ) {
    return null;
  }

  if (
    error.message ===
    "ADMIN_UNAUTHORIZED"
  ) {
    return "UNAUTHORIZED";
  }

  if (
    error.message ===
    "ADMIN_FORBIDDEN"
  ) {
    return "FORBIDDEN";
  }

  return null;
}

/*
 * =========================================================
 * INICIAR OAUTH
 * =========================================================
 */

export async function GET(
  request: Request
) {
  try {
    /*
     * Somente um administrador com permissão
     * para gerenciar configurações pode iniciar
     * a integração logística.
     */
    const session =
      await requireAdminPermission(
        "SETTINGS",
        "MANAGE"
      );

    /*
     * Defesa adicional:
     *
     * Mesmo que uma permissão seja cadastrada
     * incorretamente no banco, somente o Super
     * Admin pode conectar credenciais externas.
     */
    if (
      !session.isSuperAdmin
    ) {
      return redirectToAccessDenied(
        request
      );
    }

    /*
     * Estado imprevisível usado para impedir
     * ataques CSRF no callback OAuth.
     */
    const state =
      randomBytes(
        32
      ).toString(
        "base64url"
      );

    const authorizationUrl =
      createMelhorEnvioAuthorizationUrl(
        state
      );

    const response =
      NextResponse.redirect(
        authorizationUrl,
        {
          status:
            303,

          headers:
            noStoreHeaders(),
        }
      );

    /*
     * SameSite precisa ser "lax" porque o usuário
     * retornará ao site através de uma navegação
     * iniciada no domínio do Melhor Envio.
     *
     * Strict impediria o envio do cookie no callback.
     */
    response.cookies.set({
      name:
        OAUTH_STATE_COOKIE_NAME,

      value:
        state,

      httpOnly:
        true,

      secure:
        true,

      sameSite:
        "lax",

      path:
        "/api/integrations/melhor-envio/callback",

      maxAge:
        OAUTH_STATE_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    const authorizationError =
      getAuthorizationError(
        error
      );

    if (
      authorizationError ===
      "UNAUTHORIZED"
    ) {
      return redirectToAdminLogin(
        request
      );
    }

    if (
      authorizationError ===
      "FORBIDDEN"
    ) {
      return redirectToAccessDenied(
        request
      );
    }

    /*
     * Não registramos Client Secret, state,
     * tokens, cookies ou resposta OAuth.
     */
    console.error(
      "Erro ao iniciar integração com o Melhor Envio:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return redirectToConfigurationError(
      request
    );
  }
}