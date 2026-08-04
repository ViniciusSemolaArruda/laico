import { NextResponse } from "next/server";

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    const requestOrigin =
      new URL(request.url).origin;

    return origin === requestOrigin;
  } catch {
    return false;
  }
}

export async function POST(
  request: Request
) {
  if (!isAllowedOrigin(request)) {
    return jsonResponse(
      {
        error:
          "Você não tem permissão para fazer isso! Acesso negado.",
      },
      403
    );
  }

  const response =
    jsonResponse({
      success: true,
      message:
        "Logout realizado com sucesso.",
    });

  /*
   * As opções precisam corresponder às
   * utilizadas na criação do cookie.
   */
  response.cookies.set({
    name: "admin_session",
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