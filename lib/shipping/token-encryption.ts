import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/*
 * =========================================================
 * CONFIGURAÇÃO
 * =========================================================
 */

const ENCRYPTION_ALGORITHM =
  "aes-256-gcm";

const ENCRYPTION_VERSION =
  "v1";

const INITIALIZATION_VECTOR_SIZE =
  12;

const AUTHENTICATION_TAG_SIZE =
  16;

const REQUIRED_KEY_SIZE =
  32;

const MAXIMUM_TOKEN_LENGTH =
  20_000;

/*
 * =========================================================
 * CHAVE
 * =========================================================
 */

function getEncryptionKey() {
  const encodedKey =
    process.env
      .SHIPPING_TOKEN_ENCRYPTION_KEY
      ?.trim();

  if (!encodedKey) {
    throw new Error(
      "SHIPPING_TOKEN_ENCRYPTION_KEY não foi configurada."
    );
  }

  let encryptionKey: Buffer;

  try {
    encryptionKey =
      Buffer.from(
        encodedKey,
        "base64"
      );
  } catch {
    throw new Error(
      "SHIPPING_TOKEN_ENCRYPTION_KEY possui formato inválido."
    );
  }

  /*
   * AES-256 exige exatamente 32 bytes.
   */
  if (
    encryptionKey.length !==
    REQUIRED_KEY_SIZE
  ) {
    throw new Error(
      "SHIPPING_TOKEN_ENCRYPTION_KEY deve possuir exatamente 32 bytes."
    );
  }

  return encryptionKey;
}

/*
 * =========================================================
 * VALIDAÇÃO
 * =========================================================
 */

function normalizeToken(
  token: unknown
) {
  if (
    typeof token !==
    "string"
  ) {
    throw new Error(
      "Token de integração inválido."
    );
  }

  const normalizedToken =
    token.trim();

  if (
    !normalizedToken ||
    normalizedToken.length >
      MAXIMUM_TOKEN_LENGTH
  ) {
    throw new Error(
      "Token de integração inválido."
    );
  }

  return normalizedToken;
}

function decodeBase64Url(
  value: string
) {
  if (
    !value ||
    !/^[a-zA-Z0-9_-]+$/.test(
      value
    )
  ) {
    throw new Error(
      "Conteúdo criptografado inválido."
    );
  }

  return Buffer.from(
    value,
    "base64url"
  );
}

/*
 * =========================================================
 * CRIPTOGRAFAR
 * =========================================================
 *
 * Formato armazenado:
 *
 * versão.iv.tag.conteúdo
 *
 * Cada parte binária utiliza base64url.
 */

export function encryptShippingToken(
  token: string
) {
  const normalizedToken =
    normalizeToken(
      token
    );

  const encryptionKey =
    getEncryptionKey();

  /*
   * Um IV novo e imprevisível é utilizado
   * em toda criptografia.
   */
  const initializationVector =
    randomBytes(
      INITIALIZATION_VECTOR_SIZE
    );

  const cipher =
    createCipheriv(
      ENCRYPTION_ALGORITHM,
      encryptionKey,
      initializationVector,
      {
        authTagLength:
          AUTHENTICATION_TAG_SIZE,
      }
    );

  /*
   * A versão também é autenticada.
   * Dessa forma, ela não pode ser alterada
   * sem invalidar a autenticação GCM.
   */
  cipher.setAAD(
    Buffer.from(
      ENCRYPTION_VERSION,
      "utf8"
    )
  );

  const encryptedContent =
    Buffer.concat([
      cipher.update(
        normalizedToken,
        "utf8"
      ),

      cipher.final(),
    ]);

  const authenticationTag =
    cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,

    initializationVector.toString(
      "base64url"
    ),

    authenticationTag.toString(
      "base64url"
    ),

    encryptedContent.toString(
      "base64url"
    ),
  ].join(".");
}

/*
 * =========================================================
 * DESCRIPTOGRAFAR
 * =========================================================
 */

export function decryptShippingToken(
  encryptedToken: string
) {
  if (
    typeof encryptedToken !==
      "string" ||
    !encryptedToken.trim() ||
    encryptedToken.length >
      MAXIMUM_TOKEN_LENGTH *
        2
  ) {
    throw new Error(
      "Token criptografado inválido."
    );
  }

  const parts =
    encryptedToken.split(
      "."
    );

  if (
    parts.length !== 4
  ) {
    throw new Error(
      "Token criptografado inválido."
    );
  }

  const [
    version,
    encodedInitializationVector,
    encodedAuthenticationTag,
    encodedContent,
  ] = parts;

  if (
    version !==
    ENCRYPTION_VERSION
  ) {
    throw new Error(
      "Versão de criptografia não suportada."
    );
  }

  const initializationVector =
    decodeBase64Url(
      encodedInitializationVector
    );

  const authenticationTag =
    decodeBase64Url(
      encodedAuthenticationTag
    );

  const encryptedContent =
    decodeBase64Url(
      encodedContent
    );

  if (
    initializationVector.length !==
      INITIALIZATION_VECTOR_SIZE ||
    authenticationTag.length !==
      AUTHENTICATION_TAG_SIZE ||
    encryptedContent.length ===
      0
  ) {
    throw new Error(
      "Token criptografado inválido."
    );
  }

  const encryptionKey =
    getEncryptionKey();

  try {
    const decipher =
      createDecipheriv(
        ENCRYPTION_ALGORITHM,
        encryptionKey,
        initializationVector,
        {
          authTagLength:
            AUTHENTICATION_TAG_SIZE,
        }
      );

    decipher.setAAD(
      Buffer.from(
        version,
        "utf8"
      )
    );

    decipher.setAuthTag(
      authenticationTag
    );

    const decryptedContent =
      Buffer.concat([
        decipher.update(
          encryptedContent
        ),

        decipher.final(),
      ]);

    const token =
      decryptedContent.toString(
        "utf8"
      );

    return normalizeToken(
      token
    );
  } catch {
    /*
     * Não revelamos se o problema está na chave,
     * no IV, na tag ou no conteúdo.
     */
    throw new Error(
      "Não foi possível descriptografar o token da integração."
    );
  }
}