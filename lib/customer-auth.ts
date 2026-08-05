import "server-only";

import {
  createHmac,
  randomBytes,
} from "node:crypto";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const CUSTOMER_SESSION_COOKIE_NAME =
  "laico_customer_session";

const CUSTOMER_SESSION_DURATION_MS =
  1000 * 60 * 60 * 24 * 30;

export const CUSTOMER_SESSION_MAX_AGE_SECONDS =
  60 * 60 * 24 * 30;

const SESSION_TOKEN_BYTES = 32;

type CustomerSession = {
  sessionId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: Date;
  expiresAt: Date;
};

/*
 * Retorna o segredo usado para gerar o hash
 * dos tokens de sessão.
 *
 * O token real nunca é salvo no banco.
 */
function getCustomerSessionSecret() {
  const secret =
    process.env.CUSTOMER_SESSION_SECRET?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET precisa ter pelo menos 32 caracteres."
    );
  }

  return secret;
}

/*
 * Gera um token criptograficamente seguro.
 *
 * Esse valor ficará somente no cookie
 * HttpOnly do navegador.
 */
function generateSessionToken() {
  return randomBytes(
    SESSION_TOKEN_BYTES
  ).toString("base64url");
}

/*
 * Gera o hash que será armazenado
 * no banco de dados.
 *
 * Mesmo que alguém consiga visualizar
 * a tabela CustomerSession, não terá
 * acesso aos tokens reais das sessões.
 */
function hashSessionToken(
  token: string
) {
  return createHmac(
    "sha256",
    getCustomerSessionSecret()
  )
    .update(token)
    .digest("hex");
}

export function getCustomerSessionCookieOptions() {
  return {
    name:
      CUSTOMER_SESSION_COOKIE_NAME,

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax" as const,

    path: "/",

    maxAge:
      CUSTOMER_SESSION_MAX_AGE_SECONDS,
  };
}

/*
 * Cria uma nova sessão para um cliente.
 *
 * IMPORTANTE:
 *
 * Somente usuários com:
 *
 * accountStatus = ACTIVE
 * emailVerifiedAt != null
 * disabledAt = null
 *
 * podem receber uma sessão.
 */
export async function createCustomerSession(
  userId: string
) {
  if (!userId) {
    throw new Error(
      "Usuário não informado."
    );
  }

  const user =
    await prisma.user.findFirst({
      where: {
        id: userId,

        accountStatus:
          "ACTIVE",

        emailVerifiedAt: {
          not: null,
        },

        disabledAt: null,
      },

      select: {
        id: true,
      },
    });

  if (!user) {
    throw new Error(
      "CUSTOMER_ACCOUNT_NOT_ACTIVE"
    );
  }

  const token =
    generateSessionToken();

  const tokenHash =
    hashSessionToken(token);

  const expiresAt =
    new Date(
      Date.now() +
        CUSTOMER_SESSION_DURATION_MS
    );

  /*
   * Remove sessões expiradas antigas
   * deste usuário.
   *
   * Isso evita crescimento desnecessário
   * da tabela.
   */
  await prisma.customerSession.deleteMany({
    where: {
      userId: user.id,

      expiresAt: {
        lt: new Date(),
      },
    },
  });

  await prisma.customerSession.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  /*
   * O token puro é gravado somente
   * no cookie.
   */
  const cookieStore =
    await cookies();

  cookieStore.set({
    ...getCustomerSessionCookieOptions(),

    value: token,
  });

  return {
    expiresAt,
  };
}

/*
 * Obtém e valida a sessão atual.
 *
 * Essa função NÃO confia somente
 * na existência do cookie.
 *
 * Ela verifica:
 *
 * - hash no banco;
 * - sessão não revogada;
 * - sessão não expirada;
 * - usuário ainda existente;
 * - conta ativa;
 * - e-mail verificado;
 * - conta não desativada.
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        CUSTOMER_SESSION_COOKIE_NAME
      )?.value;

    if (!token) {
      return null;
    }

    /*
     * Impede processamento de cookies
     * claramente inválidos.
     */
    if (
      token.length < 20 ||
      token.length > 200
    ) {
      return null;
    }

    const tokenHash =
      hashSessionToken(token);

    const now =
      new Date();

    const session =
      await prisma.customerSession.findFirst({
        where: {
          tokenHash,

          revokedAt: null,

          expiresAt: {
            gt: now,
          },

          user: {
            accountStatus:
              "ACTIVE",

            emailVerifiedAt: {
              not: null,
            },

            disabledAt: null,
          },
        },

        select: {
          id: true,
          userId: true,
          expiresAt: true,
          lastUsedAt: true,

          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              emailVerifiedAt:
                true,
            },
          },
        },
      });

    if (
      !session ||
      !session.user.emailVerifiedAt
    ) {
      return null;
    }

    /*
     * Não atualizamos lastUsedAt em
     * absolutamente toda requisição,
     * evitando escrita excessiva no Neon.
     *
     * Atualizamos no máximo uma vez
     * a cada 15 minutos.
     */
    const shouldUpdateLastUsedAt =
      !session.lastUsedAt ||
      now.getTime() -
        session.lastUsedAt.getTime() >
        15 * 60 * 1000;

    if (
      shouldUpdateLastUsedAt
    ) {
      /*
       * Não precisamos bloquear a sessão
       * caso essa atualização secundária
       * falhe por uma condição de corrida.
       */
      try {
        await prisma.customerSession.updateMany({
          where: {
            id: session.id,
            revokedAt: null,

            expiresAt: {
              gt: now,
            },
          },

          data: {
            lastUsedAt: now,
          },
        });
      } catch {
        /*
         * Nenhum dado sensível é colocado
         * nos logs.
         */
      }
    }

    return {
      sessionId:
        session.id,

      userId:
        session.userId,

      name:
        session.user.name,

      email:
        session.user.email,

      phone:
        session.user.phone,

      emailVerifiedAt:
        session.user.emailVerifiedAt,

      expiresAt:
        session.expiresAt,
    };
  } catch {
    /*
     * Token inválido ou erro durante
     * a validação nunca deve revelar
     * detalhes internos ao cliente.
     */
    return null;
  }
}

/*
 * Versão para páginas/APIs onde
 * autenticação é obrigatória.
 */
export async function requireCustomerSession(): Promise<CustomerSession> {
  const session =
    await getCustomerSession();

  if (!session) {
    throw new Error(
      "CUSTOMER_UNAUTHORIZED"
    );
  }

  return session;
}

/*
 * Revoga exclusivamente a sessão
 * atualmente aberta no navegador.
 *
 * Será usada no logout.
 */
export async function revokeCurrentCustomerSession() {
  const cookieStore =
    await cookies();

  const token =
    cookieStore.get(
      CUSTOMER_SESSION_COOKIE_NAME
    )?.value;

  if (token) {
    try {
      const tokenHash =
        hashSessionToken(token);

      await prisma.customerSession.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },

        data: {
          revokedAt:
            new Date(),
        },
      });
    } catch {
      /*
       * Mesmo se a sessão já não existir,
       * continuamos removendo o cookie.
       */
    }
  }

  clearCustomerSessionCookie(
    cookieStore
  );
}

/*
 * Revoga TODAS as sessões de um usuário.
 *
 * Usaremos isso principalmente quando:
 *
 * - senha for alterada;
 * - senha for redefinida;
 * - conta for desativada;
 * - houver uma ação administrativa
 *   de segurança.
 */
export async function revokeAllCustomerSessions(
  userId: string
) {
  if (!userId) {
    return;
  }

  await prisma.customerSession.updateMany({
    where: {
      userId,

      revokedAt: null,
    },

    data: {
      revokedAt:
        new Date(),
    },
  });
}

/*
 * Apenas remove o cookie do navegador.
 *
 * Normalmente o logout deve usar
 * revokeCurrentCustomerSession(),
 * pois também revoga no banco.
 */
export async function clearCustomerSessionCookieOnly() {
  const cookieStore =
    await cookies();

  clearCustomerSessionCookie(
    cookieStore
  );
}

/*
 * Mantemos a operação de remoção
 * centralizada para que todas as rotas
 * utilizem exatamente as mesmas
 * propriedades do cookie.
 */
function clearCustomerSessionCookie(
  cookieStore: Awaited<
    ReturnType<typeof cookies>
  >
) {
  cookieStore.set({
    name:
      CUSTOMER_SESSION_COOKIE_NAME,

    value: "",

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "lax",

    path: "/",

    maxAge: 0,
  });
}