import {
  timingSafeEqual,
} from "node:crypto";

import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  exchangeMelhorEnvioAuthorizationCode,
} from "@/lib/shipping/melhor-envio-oauth";

export const dynamic =
  "force-dynamic";

const OAUTH_STATE_COOKIE_NAME =
  "laico_melhor_envio_oauth_state";

const MAXIMUM_CODE_LENGTH =
  2_000;

const MAXIMUM_STATE_LENGTH =
  500;

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
 * COOKIE OAUTH
 * =========================================================
 */

function clearOAuthStateCookie(
  response: NextResponse
) {
  response.cookies.set({
    name:
      OAUTH_STATE_COOKIE_NAME,

    value:
      "",

    httpOnly:
      true,

    secure:
      true,

    sameSite:
      "lax",

    path:
      "/api/integrations/melhor-envio/callback",

    maxAge:
      0,

    expires:
      new Date(0),
  });

  return response;
}

/*
 * =========================================================
 * REDIRECIONAMENTOS
 * =========================================================
 */

function redirectToConfiguration(
  request: NextRequest,
  parameters: Record<
    string,
    string
  >
) {
  const configurationUrl =
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
    configurationUrl.searchParams.set(
      key,
      value
    );
  }

  const response =
    NextResponse.redirect(
      configurationUrl,
      {
        status:
          303,

        headers:
          noStoreHeaders(),
      }
    );

  return clearOAuthStateCookie(
    response
  );
}

function redirectWithError(
  request: NextRequest,
  message: string
) {
  return redirectToConfiguration(
    request,
    {
      shipping_error:
        message,
    }
  );
}

function redirectWithSuccess(
  request: NextRequest
) {
  return redirectToConfiguration(
    request,
    {
      shipping_connected:
        "true",
    }
  );
}

/*
 * =========================================================
 * VALIDAÇÕES
 * =========================================================
 */

function normalizeQueryValue(
  value: string | null,
  maximumLength: number
) {
  if (
    typeof value !==
      "string" ||
    !value ||
    value.length >
      maximumLength ||
    /[\r\n]/.test(
      value
    )
  ) {
    return null;
  }

  return value;
}

function statesAreEqual(
  receivedState: string,
  expectedState: string
) {
  const receivedBuffer =
    Buffer.from(
      receivedState,
      "utf8"
    );

  const expectedBuffer =
    Buffer.from(
      expectedState,
      "utf8"
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  /*
   * Evita comparação comum caractere por caractere,
   * reduzindo diferenças de tempo na validação.
   */
  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

/*
 * =========================================================
 * CALLBACK
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  /*
   * O callback vem de outro domínio.
   *
   * Por isso, não validamos o header Origin.
   * A proteção desta operação é o state OAuth
   * aleatório armazenado em cookie HttpOnly.
   */

  const providerError =
    normalizeQueryValue(
      request.nextUrl
        .searchParams
        .get(
          "error"
        ),
      200
    );

  /*
   * O usuário pode negar a autorização no
   * próprio painel do Melhor Envio.
   */
  if (
    providerError
  ) {
    return redirectWithError(
      request,
      "A autorização do Melhor Envio foi cancelada ou recusada."
    );
  }

  const code =
    normalizeQueryValue(
      request.nextUrl
        .searchParams
        .get(
          "code"
        ),
      MAXIMUM_CODE_LENGTH
    );

  const receivedState =
    normalizeQueryValue(
      request.nextUrl
        .searchParams
        .get(
          "state"
        ),
      MAXIMUM_STATE_LENGTH
    );

  const expectedState =
    request.cookies.get(
      OAUTH_STATE_COOKIE_NAME
    )?.value;

  /*
   * Não diferenciamos estado ausente, expirado
   * ou adulterado na mensagem apresentada.
   */
  if (
    !code ||
    !receivedState ||
    !expectedState ||
    !statesAreEqual(
      receivedState,
      expectedState
    )
  ) {
    return redirectWithError(
      request,
      "Não foi possível validar a autorização do Melhor Envio. Inicie a conexão novamente."
    );
  }

  try {
    /*
     * O código OAuth é enviado diretamente
     * pelo servidor ao Melhor Envio.
     *
     * O navegador nunca recebe access token
     * nem refresh token.
     */
    await exchangeMelhorEnvioAuthorizationCode(
      code
    );

    return redirectWithSuccess(
      request
    );
  } catch (error) {
    /*
     * Nunca registramos:
     *
     * - código OAuth;
     * - Client Secret;
     * - access token;
     * - refresh token;
     * - state;
     * - cookies;
     * - resposta completa do provedor.
     */
    console.error(
      "Erro no callback OAuth do Melhor Envio:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return redirectWithError(
      request,
      "Não foi possível concluir a conexão com o Melhor Envio."
    );
  }
}