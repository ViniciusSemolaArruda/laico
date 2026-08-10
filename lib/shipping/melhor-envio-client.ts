import "server-only";

import {
  getMelhorEnvioConfig,
} from "@/lib/shipping/melhor-envio-config";

import {
  getValidMelhorEnvioAccessToken,
  refreshMelhorEnvioAccessToken,
} from "@/lib/shipping/melhor-envio-oauth";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type MelhorEnvioMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE";

type MelhorEnvioRequestOptions = {
  method?:
    MelhorEnvioMethod;

  body?:
    unknown;

  retryOnUnauthorized?:
    boolean;
};

export class MelhorEnvioApiError extends Error {
  readonly status:
    number;

  readonly code:
    string;

  constructor({
    message,
    status,
    code,
  }: {
    message: string;
    status: number;
    code: string;
  }) {
    super(
      message
    );

    this.name =
      "MelhorEnvioApiError";

    this.status =
      status;

    this.code =
      code;
  }
}

/*
 * =========================================================
 * LIMITES
 * =========================================================
 */

const MAXIMUM_PATH_LENGTH =
  2_000;

const MAXIMUM_RESPONSE_SIZE =
  2 *
  1024 *
  1024;

/*
 * =========================================================
 * CAMINHO
 * =========================================================
 */

function createApiUrl(
  path: string
) {
  if (
    typeof path !==
      "string" ||
    !path.startsWith(
      "/"
    ) ||
    path.startsWith(
      "//"
    ) ||
    path.length >
      MAXIMUM_PATH_LENGTH ||
    /[\r\n]/.test(
      path
    )
  ) {
    throw new Error(
      "Caminho da API do Melhor Envio inválido."
    );
  }

  const config =
    getMelhorEnvioConfig();

  const apiUrl =
    new URL(
      `${config.apiBaseUrl}${path}`
    );

  const expectedBaseUrl =
    new URL(
      config.apiBaseUrl
    );

  /*
   * Impede que um caminho adulterado direcione
   * tokens para outro domínio.
   */
  if (
    apiUrl.origin !==
    expectedBaseUrl.origin ||
    !apiUrl.pathname.startsWith(
      `${expectedBaseUrl.pathname}/`
    )
  ) {
    throw new Error(
      "Caminho da API do Melhor Envio inválido."
    );
  }

  return apiUrl;
}

/*
 * =========================================================
 * RESPOSTA
 * =========================================================
 */

async function readResponseBody(
  response: Response
) {
  const contentLength =
    Number(
      response.headers.get(
        "content-length"
      ) ?? "0"
    );

  if (
    Number.isFinite(
      contentLength
    ) &&
    contentLength >
      MAXIMUM_RESPONSE_SIZE
  ) {
    throw new MelhorEnvioApiError({
      message:
        "O Melhor Envio retornou uma resposta muito grande.",

      status:
        502,

      code:
        "RESPONSE_TOO_LARGE",
    });
  }

  const rawBody =
    await response.text();

  if (
    rawBody.length >
    MAXIMUM_RESPONSE_SIZE
  ) {
    throw new MelhorEnvioApiError({
      message:
        "O Melhor Envio retornou uma resposta muito grande.",

      status:
        502,

      code:
        "RESPONSE_TOO_LARGE",
    });
  }

  if (
    !rawBody
  ) {
    return null;
  }

  try {
    return JSON.parse(
      rawBody
    ) as unknown;
  } catch {
    throw new MelhorEnvioApiError({
      message:
        "O Melhor Envio retornou uma resposta inválida.",

      status:
        502,

      code:
        "INVALID_RESPONSE",
    });
  }
}

/*
 * =========================================================
 * ERROS
 * =========================================================
 */

function getSafeError({
  responseStatus,
}: {
  responseStatus:
    number;
}) {
  if (
    responseStatus ===
    400
  ) {
    return new MelhorEnvioApiError({
      message:
        "Os dados enviados ao Melhor Envio são inválidos.",

      status:
        400,

      code:
        "INVALID_REQUEST",
    });
  }

  if (
    responseStatus ===
      401 ||
    responseStatus ===
      403
  ) {
    return new MelhorEnvioApiError({
      message:
        "A integração com o Melhor Envio não está autorizada.",

      status:
        responseStatus,

      code:
        "UNAUTHORIZED",
    });
  }

  if (
    responseStatus ===
    404
  ) {
    return new MelhorEnvioApiError({
      message:
        "O recurso solicitado não foi encontrado no Melhor Envio.",

      status:
        404,

      code:
        "NOT_FOUND",
    });
  }

  if (
    responseStatus ===
      408 ||
    responseStatus ===
      429
  ) {
    return new MelhorEnvioApiError({
      message:
        "O Melhor Envio está temporariamente indisponível. Tente novamente.",

      status:
        responseStatus,

      code:
        responseStatus ===
          429
          ? "RATE_LIMITED"
          : "TIMEOUT",
    });
  }

  if (
    responseStatus ===
    422
  ) {
    return new MelhorEnvioApiError({
      message:
        "O Melhor Envio não conseguiu processar os dados informados.",

      status:
        422,

      code:
        "UNPROCESSABLE_ENTITY",
    });
  }

  if (
    responseStatus >=
    500
  ) {
    return new MelhorEnvioApiError({
      message:
        "O Melhor Envio apresentou uma falha temporária.",

      status:
        502,

      code:
        "PROVIDER_ERROR",
    });
  }

  return new MelhorEnvioApiError({
    message:
      "Não foi possível concluir a comunicação com o Melhor Envio.",

    status:
      502,

    code:
      "UNKNOWN_PROVIDER_ERROR",
  });
}

/*
 * =========================================================
 * EXECUTAR REQUISIÇÃO
 * =========================================================
 */

async function executeRequest<T>({
  path,
  method,
  body,
  accessToken,
}: {
  path: string;
  method:
    MelhorEnvioMethod;
  body?:
    unknown;
  accessToken:
    string;
}): Promise<{
  response:
    Response;

  data:
    T | null;
}> {
  const config =
    getMelhorEnvioConfig();

  const apiUrl =
    createApiUrl(
      path
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, config.requestTimeoutMs);

  try {
    const headers:
      Record<
        string,
        string
      > = {
      Accept:
        "application/json",

      Authorization:
        `Bearer ${accessToken}`,

      "User-Agent":
        config.userAgent,
    };

    let serializedBody:
      string |
      undefined;

    if (
      body !==
      undefined
    ) {
      headers[
        "Content-Type"
      ] =
        "application/json";

      serializedBody =
        JSON.stringify(
          body
        );
    }

    const response =
      await fetch(
        apiUrl,
        {
          method,
          headers,

          body:
            serializedBody,

          cache:
            "no-store",

          signal:
            controller.signal,
        }
      );

    const data =
      await readResponseBody(
        response
      );

    return {
      response,

      data:
        data as
          | T
          | null,
    };
  } catch (error) {
    if (
      error instanceof
      MelhorEnvioApiError
    ) {
      throw error;
    }

    if (
      error instanceof
        Error &&
      error.name ===
        "AbortError"
    ) {
      throw new MelhorEnvioApiError({
        message:
          "O Melhor Envio demorou demais para responder.",

        status:
          504,

        code:
          "REQUEST_TIMEOUT",
      });
    }

    throw new MelhorEnvioApiError({
      message:
        "Não foi possível se comunicar com o Melhor Envio.",

      status:
        502,

      code:
        "NETWORK_ERROR",
    });
  } finally {
    clearTimeout(
      timeout
    );
  }
}

/*
 * =========================================================
 * CLIENTE AUTENTICADO
 * =========================================================
 */

export async function melhorEnvioRequest<T>(
  path: string,
  {
    method = "GET",
    body,
    retryOnUnauthorized =
      true,
  }: MelhorEnvioRequestOptions = {}
): Promise<T> {
  const accessToken =
    await getValidMelhorEnvioAccessToken();

  const firstAttempt =
    await executeRequest<T>({
      path,
      method,
      body,
      accessToken,
    });

  if (
    firstAttempt
      .response
      .ok
  ) {
    return firstAttempt
      .data as T;
  }

  /*
   * Se o provedor informar que o token expirou,
   * renovamos e repetimos somente uma vez.
   */
  if (
    firstAttempt
      .response
      .status ===
      401 &&
    retryOnUnauthorized
  ) {
    const refreshedToken =
      await refreshMelhorEnvioAccessToken();

    const secondAttempt =
      await executeRequest<T>({
        path,
        method,
        body,
        accessToken:
          refreshedToken,
      });

    if (
      secondAttempt
        .response
        .ok
    ) {
      return secondAttempt
        .data as T;
    }

    throw getSafeError({
      responseStatus:
        secondAttempt
          .response
          .status,
    });
  }

  throw getSafeError({
    responseStatus:
      firstAttempt
        .response
        .status,
  });
}