import {
  NextResponse,
} from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  createProductImageUploadSignature,
} from "@/lib/cloudinary";

export const dynamic =
  "force-dynamic";

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return true;
  }

  try {
    return (
      origin ===
      new URL(
        request.url
      ).origin
    );
  } catch {
    return false;
  }
}

function getAuthorizationResponse(
  error: unknown
) {
  if (
    !(error instanceof Error)
  ) {
    return null;
  }

  if (
    error.message ===
    "ADMIN_UNAUTHORIZED"
  ) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      401
    );
  }

  if (
    error.message ===
    "ADMIN_FORBIDDEN"
  ) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      403
    );
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    /*
     * Proteção contra requisição
     * cross-origin.
     */
    if (
      !isAllowedOrigin(
        request
      )
    ) {
      return jsonResponse(
        {
          error:
            ACCESS_DENIED_MESSAGE,
        },
        403
      );
    }

    /*
     * Somente funcionário com permissão
     * para editar produtos pode obter
     * assinatura de upload.
     */
    await requireAdminPermission(
      "PRODUCTS",
      "EDIT"
    );

    const upload =
      createProductImageUploadSignature();

    return jsonResponse({
      success:
        true,

      upload: {
        cloudName:
          upload.cloudName,

        apiKey:
          upload.apiKey,

        timestamp:
          upload.timestamp,

        folder:
          upload.folder,

        publicId:
          upload.publicId,

        signature:
          upload.signature,
      },
    });
  } catch (error) {
    const authorizationResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    console.error(
      "Erro ao gerar autorização de upload:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível preparar o envio da imagem.",
      },
      500
    );
  }
}