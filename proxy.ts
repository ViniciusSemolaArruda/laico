import {
  createHash,
} from "node:crypto";

import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

const ADMIN_SESSION_COOKIE_NAME =
  "admin_session";

const PUBLIC_ADMIN_ROUTES = [
  "/admin/login",
  "/admin/acesso-negado",
];

type ProtectedAdminModule =
  | "DASHBOARD"
  | "PRODUCTS"
  | "ORDERS"
  | "CUSTOMERS"
  | "CATEGORIES"
  | "BANNERS"
  | "COUPONS"
  | "FINANCE"
  | "REPORTS"
  | "SETTINGS"
  | "EMPLOYEES";

/*
 * =========================================================
 * MAPEAMENTO DAS ROTAS
 * =========================================================
 */

function getAdminModuleFromPathname(
  pathname: string
): ProtectedAdminModule | null {
  if (
    pathname === "/admin"
  ) {
    return "DASHBOARD";
  }

  if (
    pathname.startsWith(
      "/admin/produtos"
    )
  ) {
    return "PRODUCTS";
  }

  if (
    pathname.startsWith(
      "/admin/pedidos"
    )
  ) {
    return "ORDERS";
  }

  if (
    pathname.startsWith(
      "/admin/clientes"
    )
  ) {
    return "CUSTOMERS";
  }

  if (
    pathname.startsWith(
      "/admin/categorias"
    )
  ) {
    return "CATEGORIES";
  }

  if (
    pathname.startsWith(
      "/admin/banners"
    )
  ) {
    return "BANNERS";
  }

  if (
    pathname.startsWith(
      "/admin/cupons"
    )
  ) {
    return "COUPONS";
  }

  if (
    pathname.startsWith(
      "/admin/financeiro"
    )
  ) {
    return "FINANCE";
  }

  if (
    pathname.startsWith(
      "/admin/relatorios"
    )
  ) {
    return "REPORTS";
  }

  if (
    pathname.startsWith(
      "/admin/configuracoes"
    )
  ) {
    return "SETTINGS";
  }

  if (
    pathname.startsWith(
      "/admin/funcionarios"
    )
  ) {
    return "EMPLOYEES";
  }

  return null;
}

/*
 * =========================================================
 * ROTAS PÚBLICAS
 * =========================================================
 */

function isPublicAdminRoute(
  pathname: string
) {
  return PUBLIC_ADMIN_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`
      )
  );
}

/*
 * =========================================================
 * TOKEN
 * =========================================================
 */

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

/*
 * =========================================================
 * SESSÃO + PERMISSÕES
 * =========================================================
 */

async function getAdminAccess(
  token: string
) {
  if (
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

  return prisma.adminSession.findFirst({
    where: {
      tokenHash,

      revokedAt:
        null,

      expiresAt: {
        gt: now,
      },

      user: {
        is: {
          role:
            "ADMIN",

          adminProfile: {
            is: {
              active:
                true,
            },
          },
        },
      },
    },

    select: {
      id: true,
      userId: true,

      user: {
        select: {
          adminProfile: {
            select: {
              active:
                true,

              isSuperAdmin:
                true,
            },
          },

          adminPermissions: {
            select: {
              module:
                true,

              level:
                true,
            },
          },
        },
      },
    },
  });
}

/*
 * =========================================================
 * VERIFICAR ACESSO AO MÓDULO
 * =========================================================
 */

function canAccessModule(
  adminAccess:
    NonNullable<
      Awaited<
        ReturnType<
          typeof getAdminAccess
        >
      >
    >,

  requiredModule:
    ProtectedAdminModule | null
) {
  /*
   * Rota administrativa ainda não
   * mapeada.
   *
   * Não liberamos silenciosamente.
   */
  if (
    !requiredModule
  ) {
    return false;
  }

  const profile =
    adminAccess.user
      .adminProfile;

  if (
    !profile ||
    !profile.active
  ) {
    return false;
  }

  /*
   * Super Admin possui acesso total.
   */
  if (
    profile.isSuperAdmin
  ) {
    return true;
  }

  /*
   * Funcionários nunca administram
   * outros funcionários.
   */
  if (
    requiredModule ===
    "EMPLOYEES"
  ) {
    return false;
  }

  const permission =
    adminAccess.user
      .adminPermissions.find(
        (item) =>
          item.module ===
          requiredModule
      );

  /*
   * NONE ou permissão inexistente =
   * acesso negado.
   */
  return (
    permission?.level ===
      "VIEW" ||
    permission?.level ===
      "EDIT" ||
    permission?.level ===
      "MANAGE"
  );
}

/*
 * =========================================================
 * ACESSO NEGADO
 * =========================================================
 */

function createAccessDeniedResponse(
  request: NextRequest,
  clearCookie = true
) {
  const url =
    request.nextUrl.clone();

  url.pathname =
    "/admin/acesso-negado";

  url.search = "";

  const requestedPath =
    `${request.nextUrl.pathname}${request.nextUrl.search}`;

  url.searchParams.set(
    "redirect",
    requestedPath.slice(
      0,
      500
    )
  );

  const response =
    NextResponse.redirect(
      url
    );

  /*
   * Cookie só é apagado quando a
   * autenticação é inválida.
   *
   * Falta de permissão NÃO deve
   * deslogar o funcionário.
   */
  if (
    clearCookie
  ) {
    response.cookies.set({
      name:
        ADMIN_SESSION_COOKIE_NAME,

      value: "",

      httpOnly:
        true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite:
        "strict",

      path: "/",

      maxAge: 0,

      expires:
        new Date(0),
    });
  }

  return response;
}

/*
 * =========================================================
 * PROXY
 * =========================================================
 */

export async function proxy(
  request: NextRequest
) {
  const {
    pathname,
  } =
    request.nextUrl;

  /*
   * Login e acesso negado permanecem
   * públicos.
   */
  if (
    isPublicAdminRoute(
      pathname
    )
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(
      ADMIN_SESSION_COOKIE_NAME
    )?.value;

  if (
    !token ||
    !isValidTokenFormat(
      token
    )
  ) {
    return createAccessDeniedResponse(
      request
    );
  }

  try {
    const adminAccess =
      await getAdminAccess(
        token
      );

    /*
     * Sessão inválida.
     */
    if (
      !adminAccess
    ) {
      return createAccessDeniedResponse(
        request
      );
    }

    const requiredModule =
      getAdminModuleFromPathname(
        pathname
      );

    /*
     * Sessão válida, porém sem
     * permissão.
     *
     * NÃO removemos o cookie.
     */
    if (
      !canAccessModule(
        adminAccess,
        requiredModule
      )
    ) {
      return createAccessDeniedResponse(
        request,
        false
      );
    }

    return NextResponse.next();
  } catch {
    /*
     * Fail closed.
     *
     * Falha no banco não libera
     * acesso e também não destrói
     * a sessão.
     */
    return createAccessDeniedResponse(
      request,
      false
    );
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};