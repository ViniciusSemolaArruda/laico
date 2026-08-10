import "server-only";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

export type MelhorEnvioEnvironment =
  | "sandbox"
  | "production";

export type MelhorEnvioConfig = {
  environment:
    MelhorEnvioEnvironment;

  baseUrl: string;
  apiBaseUrl: string;
  authorizationUrl: string;
  tokenUrl: string;

  clientId: string;
  clientSecret: string;
  redirectUri: string;
  userAgent: string;

  originCep: string;

  freeShippingMinimum:
    number;

  requestTimeoutMs:
    number;
};

/*
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

const SANDBOX_BASE_URL =
  "https://sandbox.melhorenvio.com.br";

const PRODUCTION_BASE_URL =
  "https://melhorenvio.com.br";

const DEFAULT_REQUEST_TIMEOUT_MS =
  15_000;

const MAXIMUM_CLIENT_ID_LENGTH =
  100;

const MAXIMUM_CLIENT_SECRET_LENGTH =
  500;

const MAXIMUM_USER_AGENT_LENGTH =
  255;

const MAXIMUM_REDIRECT_URI_LENGTH =
  2_000;

/*
 * =========================================================
 * VARIÁVEIS OBRIGATÓRIAS
 * =========================================================
 */

function getRequiredEnvironmentVariable(
  name: string,
  maximumLength = 2_000
) {
  const value =
    process.env[
      name
    ]?.trim();

  if (!value) {
    throw new Error(
      `${name} não foi configurada.`
    );
  }

  if (
    value.length >
    maximumLength
  ) {
    throw new Error(
      `${name} possui um valor inválido.`
    );
  }

  return value;
}

/*
 * =========================================================
 * AMBIENTE
 * =========================================================
 */

function getEnvironment():
  MelhorEnvioEnvironment {
  const value =
    getRequiredEnvironmentVariable(
      "MELHOR_ENVIO_ENV",
      20
    ).toLowerCase();

  if (
    value ===
    "sandbox"
  ) {
    return "sandbox";
  }

  if (
    value ===
      "production" ||
    value ===
      "producao" ||
    value ===
      "produção"
  ) {
    return "production";
  }

  throw new Error(
    "MELHOR_ENVIO_ENV deve ser sandbox ou production."
  );
}

/*
 * =========================================================
 * URL
 * =========================================================
 */

function getSecureUrl(
  name: string
) {
  const value =
    getRequiredEnvironmentVariable(
      name,
      MAXIMUM_REDIRECT_URI_LENGTH
    );

  let parsedUrl: URL;

  try {
    parsedUrl =
      new URL(
        value
      );
  } catch {
    throw new Error(
      `${name} deve conter uma URL válida.`
    );
  }

  /*
   * O Melhor Envio exige callback HTTPS.
   */
  if (
    parsedUrl.protocol !==
    "https:"
  ) {
    throw new Error(
      `${name} deve utilizar HTTPS.`
    );
  }

  /*
   * Não permitimos usuário ou senha embutidos
   * dentro da URL.
   */
  if (
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error(
      `${name} não pode conter credenciais.`
    );
  }

  /*
   * Remove hash e parâmetros acidentais.
   */
  if (
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(
      `${name} não pode conter parâmetros ou fragmentos.`
    );
  }

  return parsedUrl.toString();
}

/*
 * =========================================================
 * CEP
 * =========================================================
 */

function normalizeCep(
  value: string
) {
  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.length !==
      8 ||
    /^(\d)\1{7}$/.test(
      digits
    )
  ) {
    throw new Error(
      "SHIPPING_ORIGIN_CEP possui um CEP inválido."
    );
  }

  return digits;
}

/*
 * =========================================================
 * VALORES MONETÁRIOS
 * =========================================================
 */

function getFreeShippingMinimum() {
  const rawValue =
    getRequiredEnvironmentVariable(
      "FREE_SHIPPING_MINIMUM",
      30
    );

  /*
   * Variáveis internas devem utilizar ponto:
   *
   * 1000.00
   */
  if (
    !/^\d{1,10}(\.\d{1,2})?$/.test(
      rawValue
    )
  ) {
    throw new Error(
      "FREE_SHIPPING_MINIMUM possui um valor inválido."
    );
  }

  const value =
    Number(
      rawValue
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value < 0 ||
    value >
      100_000_000
  ) {
    throw new Error(
      "FREE_SHIPPING_MINIMUM possui um valor inválido."
    );
  }

  return Number(
    value.toFixed(
      2
    )
  );
}

/*
 * =========================================================
 * USER AGENT
 * =========================================================
 */

function getUserAgent() {
  const value =
    getRequiredEnvironmentVariable(
      "MELHOR_ENVIO_USER_AGENT",
      MAXIMUM_USER_AGENT_LENGTH
    );

  /*
   * Formato recomendado:
   *
   * Laico E-commerce (email@dominio.com.br)
   */
  if (
    !value.includes(
      "@"
    ) ||
    !value.includes(
      "("
    ) ||
    !value.includes(
      ")"
    )
  ) {
    throw new Error(
      "MELHOR_ENVIO_USER_AGENT deve conter o nome da aplicação e um e-mail de contato."
    );
  }

  if (
    /[\r\n]/.test(
      value
    )
  ) {
    throw new Error(
      "MELHOR_ENVIO_USER_AGENT possui caracteres inválidos."
    );
  }

  return value;
}

/*
 * =========================================================
 * CONFIGURAÇÃO
 * =========================================================
 *
 * A validação é executada somente quando a integração
 * é realmente utilizada.
 *
 * Isso evita quebrar o build do Next.js durante a coleta
 * de páginas quando alguma variável ainda não estiver
 * disponível naquele processo.
 */

export function getMelhorEnvioConfig():
  MelhorEnvioConfig {
  const environment =
    getEnvironment();

  const baseUrl =
    environment ===
    "sandbox"
      ? SANDBOX_BASE_URL
      : PRODUCTION_BASE_URL;

  const clientId =
    getRequiredEnvironmentVariable(
      "MELHOR_ENVIO_CLIENT_ID",
      MAXIMUM_CLIENT_ID_LENGTH
    );

  if (
    !/^[a-zA-Z0-9_-]+$/.test(
      clientId
    )
  ) {
    throw new Error(
      "MELHOR_ENVIO_CLIENT_ID possui um formato inválido."
    );
  }

  const clientSecret =
    getRequiredEnvironmentVariable(
      "MELHOR_ENVIO_CLIENT_SECRET",
      MAXIMUM_CLIENT_SECRET_LENGTH
    );

  if (
    /[\r\n]/.test(
      clientSecret
    )
  ) {
    throw new Error(
      "MELHOR_ENVIO_CLIENT_SECRET possui caracteres inválidos."
    );
  }

  const redirectUri =
    getSecureUrl(
      "MELHOR_ENVIO_REDIRECT_URI"
    );

  const userAgent =
    getUserAgent();

  const originCep =
    normalizeCep(
      getRequiredEnvironmentVariable(
        "SHIPPING_ORIGIN_CEP",
        30
      )
    );

  const freeShippingMinimum =
    getFreeShippingMinimum();

  return Object.freeze({
    environment,

    baseUrl,

    apiBaseUrl:
      `${baseUrl}/api/v2`,

    authorizationUrl:
      `${baseUrl}/oauth/authorize`,

    tokenUrl:
      `${baseUrl}/oauth/token`,

    clientId,
    clientSecret,
    redirectUri,
    userAgent,
    originCep,
    freeShippingMinimum,

    requestTimeoutMs:
      DEFAULT_REQUEST_TIMEOUT_MS,
  });
}

/*
 * =========================================================
 * AUXILIARES
 * =========================================================
 */

export function isMelhorEnvioSandbox() {
  return (
    getMelhorEnvioConfig()
      .environment ===
    "sandbox"
  );
}