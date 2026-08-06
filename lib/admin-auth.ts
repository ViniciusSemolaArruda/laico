import "server-only";

import {
  createHash,
  randomBytes,
} from "node:crypto";

import type {
  AdminModule,
  PermissionLevel,
} from "@prisma/client";

import {
  cookies,
} from "next/headers";

import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE_NAME =
  "admin_session";

export const ADMIN_SESSION_MAX_AGE_SECONDS =
  60 * 60 * 8;

const ADMIN_SESSION_DURATION_MS =
  ADMIN_SESSION_MAX_AGE_SECONDS *
  1000;

const SESSION_TOKEN_BYTES =
  32;

const LAST_USED_UPDATE_INTERVAL =
  15 * 60 * 1000;

export type AdminSessionData = {
  sessionId: string;

  userId: string;

  role: "ADMIN";

  jobTitle: string;

  isSuperAdmin: boolean;
};

/*
 * =========================================================
 * COOKIE
 * =========================================================
 */

export function getAdminCookieOptions() {
  return {
    name:
      ADMIN_SESSION_COOKIE_NAME,

    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "strict" as const,

    path:
      "/",

    maxAge:
      ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

/*
 * =========================================================
 * TOKEN
 * =========================================================
 *
 * O token é aleatório com 256 bits.
 *
 * O navegador recebe o token puro.
 * O banco recebe SOMENTE SHA-256(token).
 */

function generateSessionToken() {
  return randomBytes(
    SESSION_TOKEN_BYTES
  ).toString(
    "base64url"
  );
}

function hashSessionToken(
  token: string
) {
  return createHash(
    "sha256"
  )
    .update(
      token,
      "utf8"
    )
    .digest(
      "hex"
    );
}

function isValidTokenFormat(
  token: string
) {
  return (
    token.length >= 32 &&
    token.length <= 200 &&
    /^[A-Za-z0-9_-]+$/.test(
      token
    )
  );
}

/*
 * =========================================================
 * CRIAR SESSÃO
 * =========================================================
 */

export async function createAdminSession(
  userId: string
): Promise<string> {
  if (!userId) {
    throw new Error(
      "ADMIN_INVALID_USER"
    );
  }

  /*
   * O usuário precisa:
   *
   * - existir;
   * - ser ADMIN;
   * - possuir AdminProfile;
   * - estar ativo.
   */

  const admin =
    await prisma.user.findFirst({
      where: {
        id:
          userId,

        role:
          "ADMIN",

        adminProfile: {
          is: {
            active:
              true,
          },
        },
      },

      select: {
        id:
          true,

        adminProfile: {
          select: {
            active:
              true,
          },
        },
      },
    });

  if (
    !admin ||
    !admin.adminProfile?.active
  ) {
    throw new Error(
      "ADMIN_INVALID_USER"
    );
  }

  const token =
    generateSessionToken();

  const tokenHash =
    hashSessionToken(
      token
    );

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        ADMIN_SESSION_DURATION_MS
    );

  await prisma.adminSession.create({
    data: {
      userId:
        admin.id,

      tokenHash,

      expiresAt,

      lastUsedAt:
        now,
    },

    select: {
      id:
        true,
    },
  });

  /*
   * O token puro NÃO é salvo.
   */

  return token;
}

/*
 * =========================================================
 * COMPATIBILIDADE
 * =========================================================
 *
 * O login administrativo atual chama createAdminToken().
 *
 * Temporariamente mantemos esse nome para não quebrar
 * a aplicação entre uma etapa e outra.
 *
 * Agora ele cria uma AdminSession, e não um JWT.
 */

export async function createAdminToken(
  userId: string
): Promise<string> {
  return createAdminSession(
    userId
  );
}

/*
 * =========================================================
 * OBTER SESSÃO
 * =========================================================
 */

export async function getAdminSession(): Promise<AdminSessionData | null> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        ADMIN_SESSION_COOKIE_NAME
      )?.value;

    if (
      !token ||
      !isValidTokenFormat(
        token
      )
    ) {
      return null;
    }

    const tokenHash =
      hashSessionToken(
        token
      );

    const now =
      new Date();

    /*
     * Importante:
     *
     * não basta possuir um cookie.
     *
     * A sessão precisa existir no banco
     * e continuar válida.
     */

    const session =
      await prisma.adminSession.findUnique({
        where: {
          tokenHash,
        },

        select: {
          id:
            true,

          userId:
            true,

          expiresAt:
            true,

          revokedAt:
            true,

          lastUsedAt:
            true,

          user: {
            select: {
              id:
                true,

              role:
                true,

              adminProfile: {
                select: {
                  jobTitle:
                    true,

                  active:
                    true,

                  isSuperAdmin:
                    true,
                },
              },
            },
          },
        },
      });

    if (!session) {
      return null;
    }

    /*
     * Sessão revogada.
     */

    if (
      session.revokedAt
    ) {
      return null;
    }

    /*
     * Sessão expirada.
     */

    if (
      session.expiresAt <=
      now
    ) {
      return null;
    }

    /*
     * O usuário continua precisando ser ADMIN.
     */

    if (
      session.user.role !==
      "ADMIN"
    ) {
      return null;
    }

    /*
     * Todo administrador/funcionário precisa
     * possuir AdminProfile ativo.
     *
     * Bloquear o funcionário no painel faz
     * suas sessões deixarem de funcionar
     * imediatamente.
     */

    const adminProfile =
      session.user
        .adminProfile;

    if (
      !adminProfile ||
      !adminProfile.active
    ) {
      return null;
    }

    /*
     * Atualizamos lastUsedAt apenas periodicamente.
     *
     * Assim não fazemos UPDATE no banco a cada
     * clique dentro do admin.
     */

    const shouldUpdateLastUsed =
      !session.lastUsedAt ||
      now.getTime() -
        session.lastUsedAt.getTime() >=
        LAST_USED_UPDATE_INTERVAL;

    if (
      shouldUpdateLastUsed
    ) {
      try {
        await prisma.adminSession.update({
          where: {
            id:
              session.id,
          },

          data: {
            lastUsedAt:
              now,
          },

          select: {
            id:
              true,
          },
        });
      } catch {
        /*
         * Uma falha apenas no lastUsedAt não
         * deve derrubar uma sessão válida.
         */
      }
    }

    return {
      sessionId:
        session.id,

      userId:
        session.userId,

      role:
        "ADMIN",

      jobTitle:
        adminProfile.jobTitle,

      isSuperAdmin:
        adminProfile.isSuperAdmin,
    };
  } catch {
    /*
     * Nunca imprimimos:
     *
     * - cookie;
     * - token;
     * - tokenHash.
     */

    return null;
  }
}

/*
 * =========================================================
 * EXIGIR LOGIN ADMINISTRATIVO
 * =========================================================
 */

export async function requireAdminSession(): Promise<AdminSessionData> {
  const session =
    await getAdminSession();

  if (!session) {
    throw new Error(
      "ADMIN_UNAUTHORIZED"
    );
  }

  return session;
}

/*
 * =========================================================
 * HIERARQUIA DAS PERMISSÕES
 * =========================================================
 *
 * NONE
 *  ↓
 * VIEW
 *  ↓
 * EDIT
 *  ↓
 * MANAGE
 */

const PERMISSION_RANK: Record<
  PermissionLevel,
  number
> = {
  NONE:
    0,

  VIEW:
    1,

  EDIT:
    2,

  MANAGE:
    3,
};

/*
 * =========================================================
 * PERMISSÃO ATUAL
 * =========================================================
 */

export async function getAdminPermissionLevel(
  module: AdminModule,
  providedSession?: AdminSessionData
): Promise<PermissionLevel> {
  const session =
    providedSession ??
    (await getAdminSession());

  if (!session) {
    return "NONE";
  }

  /*
   * SUPER ADMIN
   *
   * Possui acesso total.
   */

  if (
    session.isSuperAdmin
  ) {
    return "MANAGE";
  }

  /*
   * =======================================================
   * FUNCIONÁRIOS
   * =======================================================
   *
   * Neste primeiro momento somente Super Admin
   * pode administrar funcionários.
   *
   * Isso impede escalada de privilégio.
   */

  if (
    module ===
    "EMPLOYEES"
  ) {
    return "NONE";
  }

  const permission =
    await prisma.adminPermission.findUnique({
      where: {
        userId_module: {
          userId:
            session.userId,

          module,
        },
      },

      select: {
        level:
          true,
      },
    });

  return (
    permission?.level ??
    "NONE"
  );
}

/*
 * =========================================================
 * VERIFICAR PERMISSÃO
 * =========================================================
 */

export async function hasAdminPermission(
  module: AdminModule,
  requiredLevel: PermissionLevel
): Promise<boolean> {
  const session =
    await getAdminSession();

  if (!session) {
    return false;
  }

  if (
    session.isSuperAdmin
  ) {
    return true;
  }

  /*
   * NONE nunca deve ser utilizado como autorização
   * para entrar em uma área.
   */

  if (
    requiredLevel ===
    "NONE"
  ) {
    return false;
  }

  const currentLevel =
    await getAdminPermissionLevel(
      module,
      session
    );

  return (
    PERMISSION_RANK[
      currentLevel
    ] >=
    PERMISSION_RANK[
      requiredLevel
    ]
  );
}

/*
 * =========================================================
 * EXIGIR PERMISSÃO
 * =========================================================
 *
 * Exemplo:
 *
 * await requireAdminPermission(
 *   "PRODUCTS",
 *   "EDIT"
 * );
 */

export async function requireAdminPermission(
  module: AdminModule,
  requiredLevel: Exclude<
    PermissionLevel,
    "NONE"
  >
): Promise<AdminSessionData> {
  const session =
    await getAdminSession();

  if (!session) {
    throw new Error(
      "ADMIN_UNAUTHORIZED"
    );
  }

  /*
   * Super Admin ignora a tabela de permissões.
   */

  if (
    session.isSuperAdmin
  ) {
    return session;
  }

  /*
   * Gerenciamento de funcionários permanece
   * reservado ao Super Admin.
   */

  if (
    module ===
    "EMPLOYEES"
  ) {
    throw new Error(
      "ADMIN_FORBIDDEN"
    );
  }

  const currentLevel =
    await getAdminPermissionLevel(
      module,
      session
    );

  if (
    PERMISSION_RANK[
      currentLevel
    ] <
    PERMISSION_RANK[
      requiredLevel
    ]
  ) {
    throw new Error(
      "ADMIN_FORBIDDEN"
    );
  }

  return session;
}

/*
 * =========================================================
 * REVOGAR SESSÃO ATUAL
 * =========================================================
 */

export async function revokeCurrentAdminSession(): Promise<void> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        ADMIN_SESSION_COOKIE_NAME
      )?.value;

    if (
      !token ||
      !isValidTokenFormat(
        token
      )
    ) {
      return;
    }

    const tokenHash =
      hashSessionToken(
        token
      );

    await prisma.adminSession.updateMany({
      where: {
        tokenHash,

        revokedAt:
          null,
      },

      data: {
        revokedAt:
          new Date(),
      },
    });
  } catch {
    /*
     * Logout continua limpando o cookie
     * mesmo que a sessão já não exista.
     */
  }
}

/*
 * =========================================================
 * REVOGAR TODAS AS SESSÕES
 * =========================================================
 *
 * Utilizado quando:
 *
 * - funcionário é bloqueado;
 * - senha administrativa é alterada;
 * - há suspeita de comprometimento.
 */

export async function revokeAllAdminSessions(
  userId: string
): Promise<void> {
  if (!userId) {
    return;
  }

  await prisma.adminSession.updateMany({
    where: {
      userId,

      revokedAt:
        null,
    },

    data: {
      revokedAt:
        new Date(),
    },
  });
}

/*
 * =========================================================
 * LIMPAR COOKIE
 * =========================================================
 */

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore =
    await cookies();

  cookieStore.set({
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
  });
}