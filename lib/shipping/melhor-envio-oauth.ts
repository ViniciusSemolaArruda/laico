import "server-only";

import {
  decryptShippingToken,
  encryptShippingToken,
} from "@/lib/shipping/token-encryption";

import {
  getMelhorEnvioConfig,
} from "@/lib/shipping/melhor-envio-config";

import { prisma } from "@/lib/prisma";

/*
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

const PROVIDER =
  "MELHOR_ENVIO";

const TOKEN_REFRESH_MARGIN_MS =
  5 *
  60 *
  1000;

const DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS =
  30 *
  24 *
  60 *
  60;

const REFRESH_TOKEN_LIFETIME_MS =
  45 *
  24 *
  60 *
  60 *
  1000;

const MAXIMUM_AUTHORIZATION_CODE_LENGTH =
  2_000;

const MAXIMUM_STATE_LENGTH =
  500;

const MAXIMUM_TOKEN_LENGTH =
  20_000;

/*
 * Solicitamos somente as permissões necessárias
 * para a integração logística da loja.
 */
export const MELHOR_ENVIO_SCOPES = [
  "cart-read",
  "cart-write",
  "orders-read",
  "shipping-calculate",
  "shipping-cancel",
  "shipping-checkout",
  "shipping-companies",
  "shipping-generate",
  "shipping-preview",
  "shipping-print",
  "shipping-tracking",
] as const;

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type MelhorEnvioTokenResponse = {
  token_type?: unknown;
  expires_in?: unknown;
  access_token?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
};

type NormalizedTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scopes: string[];
};

type OAuthTokenRequestBody =
  | {
      grant_type:
        "authorization_code";

      client_id:
        string;

      client_secret:
        string;

      redirect_uri:
        string;

      code:
        string;
    }
  | {
      grant_type:
        "refresh_token";

      client_id:
        string;

      client_secret:
        string;

      refresh_token:
        string;
    };

/*
 * =========================================================
 * CONTROLE DE RENOVAÇÃO
 * =========================================================
 *
 * Evita várias renovações simultâneas dentro da mesma
 * instância do servidor.
 */

let refreshPromise:
  Promise<string> |
  null = null;

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeAuthorizationCode(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      "Código de autorização inválido."
    );
  }

  const code =
    value.trim();

  if (
    !code ||
    code.length >
      MAXIMUM_AUTHORIZATION_CODE_LENGTH ||
    /[\r\n]/.test(
      code
    )
  ) {
    throw new Error(
      "Código de autorização inválido."
    );
  }

  return code;
}

function normalizeOAuthState(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      "Estado OAuth inválido."
    );
  }

  const state =
    value.trim();

  if (
    state.length < 32 ||
    state.length >
      MAXIMUM_STATE_LENGTH ||
    !/^[a-zA-Z0-9_-]+$/.test(
      state
    )
  ) {
    throw new Error(
      "Estado OAuth inválido."
    );
  }

  return state;
}

function normalizeToken(
  value: unknown,
  fieldName: string
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new Error(
      `O Melhor Envio não retornou ${fieldName}.`
    );
  }

  const token =
    value.trim();

  if (
    !token ||
    token.length >
      MAXIMUM_TOKEN_LENGTH ||
    /[\r\n]/.test(
      token
    )
  ) {
    throw new Error(
      `O Melhor Envio retornou ${fieldName} inválido.`
    );
  }

  return token;
}

function normalizeExpiresIn(
  value: unknown
) {
  const parsedValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      parsedValue
    ) ||
    !Number.isInteger(
      parsedValue
    ) ||
    parsedValue <= 0 ||
    parsedValue >
      365 *
        24 *
        60 *
        60
  ) {
    return DEFAULT_ACCESS_TOKEN_LIFETIME_SECONDS;
  }

  return parsedValue;
}

function normalizeScopes(
  value: unknown
) {
  let scopes:
    string[] = [];

  if (
    typeof value ===
    "string"
  ) {
    scopes =
      value.split(
        /\s+/
      );
  } else if (
    Array.isArray(
      value
    )
  ) {
    scopes =
      value.filter(
        (
          item
        ): item is string =>
          typeof item ===
          "string"
      );
  }

  const normalizedScopes =
    Array.from(
      new Set(
        scopes
          .map(
            (scope) =>
              scope.trim()
          )
          .filter(
            (scope) =>
              /^[a-z0-9-]{1,100}$/.test(
                scope
              )
          )
      )
    );

  /*
   * Alguns retornos OAuth podem não devolver
   * explicitamente a propriedade scope.
   */
  if (
    normalizedScopes.length ===
    0
  ) {
    return [
      ...MELHOR_ENVIO_SCOPES,
    ];
  }

  return normalizedScopes;
}

function normalizeTokenResponse(
  data: MelhorEnvioTokenResponse,
  fallbackRefreshToken?: string
): NormalizedTokenResponse {
  const accessToken =
    normalizeToken(
      data.access_token,
      "o access token"
    );

  const refreshToken =
    typeof data.refresh_token ===
      "string" &&
    data.refresh_token.trim()
      ? normalizeToken(
          data.refresh_token,
          "o refresh token"
        )
      : fallbackRefreshToken
        ? normalizeToken(
            fallbackRefreshToken,
            "o refresh token"
          )
        : (() => {
            throw new Error(
              "O Melhor Envio não retornou o refresh token."
            );
          })();

  return {
    accessToken,
    refreshToken,

    expiresInSeconds:
      normalizeExpiresIn(
        data.expires_in
      ),

    scopes:
      normalizeScopes(
        data.scope
      ),
  };
}

/*
 * =========================================================
 * URL DE AUTORIZAÇÃO
 * =========================================================
 */

export function createMelhorEnvioAuthorizationUrl(
  state: string
) {
  const normalizedState =
    normalizeOAuthState(
      state
    );

  const config =
    getMelhorEnvioConfig();

  const authorizationUrl =
    new URL(
      config.authorizationUrl
    );

  authorizationUrl.searchParams.set(
    "client_id",
    config.clientId
  );

  authorizationUrl.searchParams.set(
    "redirect_uri",
    config.redirectUri
  );

  authorizationUrl.searchParams.set(
    "response_type",
    "code"
  );

  authorizationUrl.searchParams.set(
    "state",
    normalizedState
  );

  authorizationUrl.searchParams.set(
    "scope",
    MELHOR_ENVIO_SCOPES.join(
      " "
    )
  );

  return authorizationUrl.toString();
}

/*
 * =========================================================
 * REQUISIÇÃO DE TOKEN
 * =========================================================
 */

async function requestOAuthToken(
  body: OAuthTokenRequestBody,
  fallbackRefreshToken?: string
) {
  const config =
    getMelhorEnvioConfig();

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, config.requestTimeoutMs);

  try {
    const response =
      await fetch(
        config.tokenUrl,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "User-Agent":
              config.userAgent,
          },

          body:
            JSON.stringify(
              body
            ),

          cache:
            "no-store",

          signal:
            controller.signal,
        }
      );

    let responseData:
      MelhorEnvioTokenResponse =
      {};

    try {
      responseData =
        (await response.json()) as MelhorEnvioTokenResponse;
    } catch {
      /*
       * Não armazenamos nem exibimos o conteúdo bruto
       * de uma resposta inválida.
       */
    }

    if (
      !response.ok
    ) {
      throw new Error(
        `O Melhor Envio recusou a autenticação OAuth (${response.status}).`
      );
    }

    return normalizeTokenResponse(
      responseData,
      fallbackRefreshToken
    );
  } catch (error) {
    if (
      error instanceof
        Error &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        "O Melhor Envio demorou demais para responder."
      );
    }

    throw error;
  } finally {
    clearTimeout(
      timeout
    );
  }
}

/*
 * =========================================================
 * SALVAR TOKENS
 * =========================================================
 */

async function saveTokens({
  accessToken,
  refreshToken,
  expiresInSeconds,
  scopes,
  refreshed,
}: NormalizedTokenResponse & {
  refreshed: boolean;
}) {
  const now =
    new Date();

  const accessTokenExpiresAt =
    new Date(
      now.getTime() +
        expiresInSeconds *
          1000
    );

  const refreshTokenExpiresAt =
    new Date(
      now.getTime() +
        REFRESH_TOKEN_LIFETIME_MS
    );

  const accessTokenEncrypted =
    encryptShippingToken(
      accessToken
    );

  const refreshTokenEncrypted =
    encryptShippingToken(
      refreshToken
    );

  await prisma
    .shippingIntegrationCredential
    .upsert({
      where: {
        provider:
          PROVIDER,
      },

      create: {
        provider:
          PROVIDER,

        accessTokenEncrypted,
        refreshTokenEncrypted,

        accessTokenExpiresAt,
        refreshTokenExpiresAt,

        scopes,

        connectedAt:
          now,

        refreshedAt:
          refreshed
            ? now
            : null,
      },

      update: {
        accessTokenEncrypted,
        refreshTokenEncrypted,

        accessTokenExpiresAt,
        refreshTokenExpiresAt,

        scopes,

        refreshedAt:
          refreshed
            ? now
            : null,
      },

      select: {
        id: true,
      },
    });

  return accessToken;
}

/*
 * =========================================================
 * TROCAR CÓDIGO POR TOKENS
 * =========================================================
 */

export async function exchangeMelhorEnvioAuthorizationCode(
  code: string
) {
  const normalizedCode =
    normalizeAuthorizationCode(
      code
    );

  const config =
    getMelhorEnvioConfig();

  const tokens =
    await requestOAuthToken({
      grant_type:
        "authorization_code",

      client_id:
        config.clientId,

      client_secret:
        config.clientSecret,

      redirect_uri:
        config.redirectUri,

      code:
        normalizedCode,
    });

  await saveTokens({
    ...tokens,

    refreshed:
      false,
  });

  return {
    success:
      true,

    scopes:
      tokens.scopes,

    expiresAt:
      new Date(
        Date.now() +
          tokens
            .expiresInSeconds *
            1000
      ),
  };
}

/*
 * =========================================================
 * RENOVAR TOKEN
 * =========================================================
 */

async function refreshMelhorEnvioAccessTokenInternal() {
  const credential =
    await prisma
      .shippingIntegrationCredential
      .findUnique({
        where: {
          provider:
            PROVIDER,
        },

        select: {
          refreshTokenEncrypted:
            true,

          refreshTokenExpiresAt:
            true,
        },
      });

  if (!credential) {
    throw new Error(
      "A conta do Melhor Envio ainda não foi conectada."
    );
  }

  const now =
    new Date();

  if (
    credential
      .refreshTokenExpiresAt &&
    credential
      .refreshTokenExpiresAt <=
      now
  ) {
    throw new Error(
      "A autorização do Melhor Envio expirou. Reconecte a conta."
    );
  }

  const refreshToken =
    decryptShippingToken(
      credential
        .refreshTokenEncrypted
    );

  const config =
    getMelhorEnvioConfig();

  const tokens =
    await requestOAuthToken(
      {
        grant_type:
          "refresh_token",

        client_id:
          config.clientId,

        client_secret:
          config.clientSecret,

        refresh_token:
          refreshToken,
      },
      refreshToken
    );

  return saveTokens({
    ...tokens,

    refreshed:
      true,
  });
}

export async function refreshMelhorEnvioAccessToken() {
  if (
    refreshPromise
  ) {
    return refreshPromise;
  }

  refreshPromise =
    refreshMelhorEnvioAccessTokenInternal();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise =
      null;
  }
}

/*
 * =========================================================
 * OBTER TOKEN VÁLIDO
 * =========================================================
 */

export async function getValidMelhorEnvioAccessToken() {
  const credential =
    await prisma
      .shippingIntegrationCredential
      .findUnique({
        where: {
          provider:
            PROVIDER,
        },

        select: {
          accessTokenEncrypted:
            true,

          accessTokenExpiresAt:
            true,

          refreshTokenExpiresAt:
            true,
        },
      });

  if (!credential) {
    throw new Error(
      "A conta do Melhor Envio ainda não foi conectada."
    );
  }

  const now =
    Date.now();

  const accessTokenIsValid =
    credential
      .accessTokenExpiresAt
      .getTime() -
      TOKEN_REFRESH_MARGIN_MS >
    now;

  if (
    accessTokenIsValid
  ) {
    return decryptShippingToken(
      credential
        .accessTokenEncrypted
    );
  }

  if (
    credential
      .refreshTokenExpiresAt &&
    credential
      .refreshTokenExpiresAt
      .getTime() <=
      now
  ) {
    throw new Error(
      "A autorização do Melhor Envio expirou. Reconecte a conta."
    );
  }

  return refreshMelhorEnvioAccessToken();
}

/*
 * =========================================================
 * STATUS DA CONEXÃO
 * =========================================================
 */

export async function getMelhorEnvioConnectionStatus() {
  const credential =
    await prisma
      .shippingIntegrationCredential
      .findUnique({
        where: {
          provider:
            PROVIDER,
        },

        select: {
          scopes: true,

          connectedAt:
            true,

          refreshedAt:
            true,

          accessTokenExpiresAt:
            true,

          refreshTokenExpiresAt:
            true,
        },
      });

  if (!credential) {
    return {
      connected:
        false as const,
    };
  }

  return {
    connected:
      true as const,

    scopes:
      credential.scopes,

    connectedAt:
      credential.connectedAt,

    refreshedAt:
      credential.refreshedAt,

    accessTokenExpiresAt:
      credential
        .accessTokenExpiresAt,

    refreshTokenExpiresAt:
      credential
        .refreshTokenExpiresAt,

    requiresReconnect:
      Boolean(
        credential
          .refreshTokenExpiresAt &&
          credential
            .refreshTokenExpiresAt <=
            new Date()
      ),
  };
}

/*
 * =========================================================
 * DESCONECTAR
 * =========================================================
 */

export async function disconnectMelhorEnvio() {
  await prisma
    .shippingIntegrationCredential
    .deleteMany({
      where: {
        provider:
          PROVIDER,
      },
    });
}