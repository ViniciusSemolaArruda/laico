import { NextResponse } from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  createBannerImageUploadSignature,
} from "@/lib/cloudinary";

import type {
  BannerImageVariant,
} from "@/lib/cloudinary";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE =
  5_000;

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

type UploadSignatureBody = {
  variant?: unknown;
};

class ValidationError extends Error {}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,

    headers: {
      "Cache-Control":
        "private, no-store, no-cache, must-revalidate",

      Pragma:
        "no-cache",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  /*
   * Requisições internas do Next.js podem
   * não possuir o header Origin.
   */
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

function parseVariant(
  value: unknown
): BannerImageVariant {
  if (
    value ===
      "desktop" ||
    value ===
      "mobile"
  ) {
    return value;
  }

  throw new ValidationError(
    "O tipo da imagem é inválido."
  );
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

/*
 * =========================================================
 * POST
 * Gera uma assinatura temporária para upload no Cloudinary.
 * =========================================================
 */

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * ORIGEM
     * =====================================================
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
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     */

    await requireAdminPermission(
      "BANNERS",
      "EDIT"
    );

    /*
     * =====================================================
     * CONTENT TYPE
     * =====================================================
     */

    const contentType =
      request.headers.get(
        "content-type"
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {
      return jsonResponse(
        {
          error:
            "Formato da requisição inválido.",
        },
        415
      );
    }

    /*
     * =====================================================
     * TAMANHO DO BODY
     * =====================================================
     */

    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) ?? "0"
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Requisição muito grande.",
        },
        413
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    const rawBody =
      await request.text();

    if (
      !rawBody ||
      rawBody.length >
        MAX_BODY_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        400
      );
    }

    let body:
      UploadSignatureBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as UploadSignatureBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        400
      );
    }

    const variant =
      parseVariant(
        body.variant
      );

    /*
     * =====================================================
     * ASSINATURA
     * =====================================================
     *
     * O CLOUDINARY_API_SECRET permanece somente
     * no servidor e nunca é enviado ao navegador.
     */

    const upload =
      createBannerImageUploadSignature(
        variant
      );

    return jsonResponse({
      success: true,

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

        variant:
          upload.variant,
      },
    });
  } catch (error) {
    /*
     * =====================================================
     * AUTORIZAÇÃO
     * =====================================================
     */

    const authorizationResponse =
      getAuthorizationResponse(
        error
      );

    if (
      authorizationResponse
    ) {
      return authorizationResponse;
    }

    /*
     * =====================================================
     * VALIDAÇÃO
     * =====================================================
     */

    if (
      error instanceof
      ValidationError
    ) {
      return jsonResponse(
        {
          error:
            error.message,
        },
        400
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "CLOUDINARY_NOT_CONFIGURED"
    ) {
      console.error(
        "Cloudinary não configurado para upload de banners."
      );

      return jsonResponse(
        {
          error:
            "O serviço de imagens não está configurado.",
        },
        503
      );
    }

    console.error(
      "Erro ao gerar assinatura de upload de banner:",
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