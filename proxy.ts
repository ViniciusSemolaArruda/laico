import {
  jwtVerify,
} from "jose";
import type {
  NextRequest,
} from "next/server";
import {
  NextResponse,
} from "next/server";

const ADMIN_SESSION_COOKIE_NAME =
  "admin_session";

const ADMIN_TOKEN_ISSUER =
  "laico-ecommerce";

const ADMIN_TOKEN_AUDIENCE =
  "laico-admin";

const PUBLIC_ADMIN_ROUTES = [
  "/admin/login",
  "/admin/acesso-negado",
];

function getAdminSecret() {
  const secret =
    process.env
      .ADMIN_JWT_SECRET
      ?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    return null;
  }

  return new TextEncoder().encode(
    secret
  );
}

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

async function hasValidAdminToken(
  token: string
) {
  const secret =
    getAdminSecret();

  if (!secret) {
    return false;
  }

  try {
    const { payload } =
      await jwtVerify(
        token,
        secret,
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

    return (
      payload.role === "ADMIN" &&
      typeof payload.sub ===
        "string" &&
      payload.sub.length > 0
    );
  } catch {
    return false;
  }
}

function createAccessDeniedResponse(
  request: NextRequest
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
    requestedPath.slice(0, 500)
  );

  const response =
    NextResponse.redirect(url);

  /*
   * Remove cookies falsos, inválidos
   * ou expirados.
   */
  response.cookies.set({
    name:
      ADMIN_SESSION_COOKIE_NAME,

    value: "",

    httpOnly: true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite: "strict",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function proxy(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  /*
   * Login e página de acesso negado
   * precisam permanecer públicas.
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

  if (!token) {
    return createAccessDeniedResponse(
      request
    );
  }

  const tokenIsValid =
    await hasValidAdminToken(
      token
    );

  if (!tokenIsValid) {
    return createAccessDeniedResponse(
      request
    );
  }

  /*
   * Esta é apenas a primeira barreira.
   * As páginas e APIs devem continuar
   * usando getAdminSession().
   */
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};