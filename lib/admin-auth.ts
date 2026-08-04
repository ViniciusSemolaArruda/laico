import "server-only";

import { randomUUID } from "node:crypto";

import {
  jwtVerify,
  SignJWT,
} from "jose";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const ADMIN_SESSION_COOKIE_NAME =
  "admin_session";

const ADMIN_TOKEN_ISSUER =
  "laico-ecommerce";

const ADMIN_TOKEN_AUDIENCE =
  "laico-admin";

const ADMIN_TOKEN_DURATION =
  "8h";

export const ADMIN_SESSION_MAX_AGE_SECONDS =
  60 * 60 * 8;

type AdminSession = {
  userId: string;
  role: "ADMIN";
};

function getAdminSecret(): Uint8Array {
  const secret =
    process.env.ADMIN_JWT_SECRET?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    throw new Error(
      "ADMIN_JWT_SECRET precisa ter pelo menos 32 caracteres."
    );
  }

  return new TextEncoder().encode(
    secret
  );
}

export function getAdminCookieOptions() {
  return {
    name:
      ADMIN_SESSION_COOKIE_NAME,

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "strict" as const,

    path: "/",

    maxAge:
      ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

export async function createAdminToken(
  userId: string
): Promise<string> {
  if (!userId) {
    throw new Error(
      "Usuário administrativo não informado."
    );
  }

  /*
   * Confirma no banco que o usuário existe
   * e continua sendo administrador.
   */
  const admin =
    await prisma.user.findFirst({
      where: {
        id: userId,
        role: "ADMIN",
      },

      select: {
        id: true,
      },
    });

  if (!admin) {
    throw new Error(
      "Usuário administrativo inválido."
    );
  }

  return new SignJWT({
    role: "ADMIN",
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuer(
      ADMIN_TOKEN_ISSUER
    )
    .setAudience(
      ADMIN_TOKEN_AUDIENCE
    )
    .setSubject(admin.id)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(
      ADMIN_TOKEN_DURATION
    )
    .sign(getAdminSecret());
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore =
      await cookies();

    const token =
      cookieStore.get(
        ADMIN_SESSION_COOKIE_NAME
      )?.value;

    if (!token) {
      return null;
    }

    const { payload } =
      await jwtVerify(
        token,
        getAdminSecret(),
        {
          issuer:
            ADMIN_TOKEN_ISSUER,

          audience:
            ADMIN_TOKEN_AUDIENCE,

          algorithms: [
            "HS256",
          ],
        }
      );

    if (
      payload.role !== "ADMIN" ||
      typeof payload.sub !==
        "string" ||
      !payload.sub
    ) {
      return null;
    }

    /*
     * Mesmo com JWT válido, confirmamos no
     * banco que a conta continua como ADMIN.
     *
     * Assim, se o funcionário for removido
     * ou perder o cargo, o acesso é bloqueado.
     */
    const admin =
      await prisma.user.findFirst({
        where: {
          id: payload.sub,
          role: "ADMIN",
        },

        select: {
          id: true,
          role: true,
        },
      });

    if (
      !admin ||
      admin.role !== "ADMIN"
    ) {
      return null;
    }

    return {
      userId: admin.id,
      role: "ADMIN",
    };
  } catch {
    /*
     * Não mostramos informações internas
     * da sessão nem imprimimos o JWT.
     */
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminSession> {
  const session =
    await getAdminSession();

  if (!session) {
    throw new Error(
      "ADMIN_UNAUTHORIZED"
    );
  }

  return session;
}