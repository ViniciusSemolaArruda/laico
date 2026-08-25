import { NextResponse } from "next/server";

import {
  deleteBannerImage,
  getBannerImageResource,
} from "@/lib/cloudinary";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 30_000;

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

type BannerBody = {
  title?: unknown;
  alt?: unknown;

  desktopImagePublicId?: unknown;
  mobileImagePublicId?: unknown;

  href?: unknown;
  active?: unknown;
  sortOrder?: unknown;
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

      Pragma: "no-cache",

      "X-Content-Type-Options":
        "nosniff",
    },
  });
}

function getAuthorizationResponse(
  error: unknown
) {
  if (!(error instanceof Error)) {
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

function normalizeText(
  value: unknown,
  maximumLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function parseBoolean(
  value: unknown,
  defaultValue: boolean
) {
  if (
    typeof value ===
    "boolean"
  ) {
    return value;
  }

  return defaultValue;
}

function parseSortOrder(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number =
    typeof value ===
    "number"
      ? value
      : Number(value);

  if (
    !Number.isSafeInteger(
      number
    ) ||
    number < 0 ||
    number > 10_000
  ) {
    throw new ValidationError(
      "A posição do banner é inválida."
    );
  }

  return number;
}

function normalizeHref(
  value: unknown
) {
  const href =
    normalizeText(
      value,
      500
    );

  if (!href) {
    return null;
  }

  /*
   * Nesta primeira versão, permitimos apenas
   * links internos do próprio site.
   *
   * Exemplos válidos:
   * /catalogo
   * /produtos/imagem-nossa-senhora
   * /categorias/presentes
   */
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.includes("\\")
  ) {
    throw new ValidationError(
      "O link do banner deve ser uma página interna iniciada por /."
    );
  }

  return href;
}

function isUniqueError(
  error: unknown
) {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    error.code ===
      "P2002"
  );
}

/*
 * =========================================================
 * GET
 * Lista os banners no painel administrativo.
 * =========================================================
 */

export async function GET() {
  try {
    await requireAdminPermission(
      "BANNERS",
      "VIEW"
    );

    const banners =
      await prisma.banner.findMany({
        orderBy: [
          {
            sortOrder:
              "asc",
          },
          {
            createdAt:
              "desc",
          },
        ],

        select: {
          id: true,

          title: true,
          alt: true,

          desktopImageUrl:
            true,

          desktopImagePublicId:
            true,

          mobileImageUrl:
            true,

          mobileImagePublicId:
            true,

          href: true,
          active: true,
          sortOrder: true,

          createdAt: true,
          updatedAt: true,
        },
      });

    return jsonResponse({
      success: true,
      banners,
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
      "Erro ao listar banners:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar os banners.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * POST
 * Cadastra um novo banner.
 * =========================================================
 */

export async function POST(
  request: Request
) {
  const uploadedPublicIds: string[] =
    [];

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

    const session =
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

    let body: BannerBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as BannerBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Requisição inválida.",
        },
        400
      );
    }

    /*
     * =====================================================
     * VALIDAÇÃO DOS TEXTOS
     * =====================================================
     */

    const title =
      normalizeText(
        body.title,
        150
      );

    if (
      title.length < 2
    ) {
      throw new ValidationError(
        "Informe um nome para identificar o banner."
      );
    }

    const alt =
      normalizeText(
        body.alt,
        250
      );

    if (
      alt.length < 2
    ) {
      throw new ValidationError(
        "Informe a descrição da imagem."
      );
    }

    const href =
      normalizeHref(
        body.href
      );

    const active =
      parseBoolean(
        body.active,
        true
      );

    const informedSortOrder =
      parseSortOrder(
        body.sortOrder
      );

    /*
     * =====================================================
     * IMAGENS
     * =====================================================
     */

    const desktopImagePublicId =
      normalizeText(
        body.desktopImagePublicId,
        500
      );

    const mobileImagePublicId =
      normalizeText(
        body.mobileImagePublicId,
        500
      );

    if (
      !desktopImagePublicId
    ) {
      throw new ValidationError(
        "Envie a imagem para desktop."
      );
    }

    if (
      !mobileImagePublicId
    ) {
      throw new ValidationError(
        "Envie a imagem para celular."
      );
    }

    if (
      desktopImagePublicId ===
      mobileImagePublicId
    ) {
      throw new ValidationError(
        "As imagens de desktop e celular devem ser diferentes."
      );
    }

    uploadedPublicIds.push(
      desktopImagePublicId,
      mobileImagePublicId
    );

    /*
     * Impede reutilizar imagens que já pertencem
     * a outro banner.
     */

    const existingBanner =
      await prisma.banner.findFirst({
        where: {
          OR: [
            {
              desktopImagePublicId:
                {
                  in: [
                    desktopImagePublicId,
                    mobileImagePublicId,
                  ],
                },
            },
            {
              mobileImagePublicId:
                {
                  in: [
                    desktopImagePublicId,
                    mobileImagePublicId,
                  ],
                },
            },
          ],
        },

        select: {
          id: true,
        },
      });

    if (
      existingBanner
    ) {
      throw new ValidationError(
        "Uma das imagens já está sendo utilizada por outro banner."
      );
    }

    /*
     * As URLs enviadas pelo navegador são ignoradas.
     *
     * O servidor consulta diretamente o Cloudinary
     * por meio dos publicIds recebidos.
     */

    const [
      desktopResource,
      mobileResource,
    ] = await Promise.all([
      getBannerImageResource(
        desktopImagePublicId,
        "desktop"
      ),

      getBannerImageResource(
        mobileImagePublicId,
        "mobile"
      ),
    ]);

    /*
     * =====================================================
     * ORDEM
     * =====================================================
     */

    let sortOrder =
      informedSortOrder;

    if (
      sortOrder === null
    ) {
      const lastBanner =
        await prisma.banner.findFirst({
          orderBy: {
            sortOrder:
              "desc",
          },

          select: {
            sortOrder:
              true,
          },
        });

      sortOrder =
        (lastBanner?.sortOrder ??
          -1) + 1;
    }

    /*
     * =====================================================
     * CADASTRO E AUDITORIA
     * =====================================================
     */

    let banner;

    try {
      banner =
        await prisma.$transaction(
          async (
            transaction
          ) => {
            const createdBanner =
              await transaction.banner.create({
                data: {
                  title,
                  alt,

                  desktopImageUrl:
                    desktopResource.url,

                  desktopImagePublicId:
                    desktopResource.publicId,

                  mobileImageUrl:
                    mobileResource.url,

                  mobileImagePublicId:
                    mobileResource.publicId,

                  href,
                  active,
                  sortOrder,
                },
              });

            await transaction.adminAuditLog.create({
              data: {
                actorId:
                  session.userId,

                module:
                  "BANNERS",

                action:
                  "BANNER_CREATED",

                entityType:
                  "BANNER",

                entityId:
                  createdBanner.id,

                changes: {
                  title:
                    createdBanner.title,

                  href:
                    createdBanner.href,

                  active:
                    createdBanner.active,

                  sortOrder:
                    createdBanner.sortOrder,

                  desktopImagePublicId:
                    createdBanner.desktopImagePublicId,

                  mobileImagePublicId:
                    createdBanner.mobileImagePublicId,
                },
              },
            });

            return createdBanner;
          }
        );
    } catch (error) {
      /*
       * Se o cadastro falhar depois do upload,
       * remove as imagens para evitar arquivos órfãos.
       */

      await Promise.allSettled([
        deleteBannerImage(
          desktopResource.publicId
        ),

        deleteBannerImage(
          mobileResource.publicId
        ),
      ]);

      throw error;
    }

    return jsonResponse(
      {
        success: true,
        banner,
      },
      201
    );
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
      isUniqueError(
        error
      )
    ) {
      return jsonResponse(
        {
          error:
            "Uma das imagens já está sendo utilizada.",
        },
        409
      );
    }

    if (
      error instanceof Error &&
      [
        "INVALID_CLOUDINARY_PUBLIC_ID",
        "CLOUDINARY_RESOURCE_NOT_FOUND",
        "INVALID_CLOUDINARY_RESOURCE",
        "INVALID_IMAGE_FORMAT",
        "BANNER_IMAGE_TOO_LARGE",
        "INVALID_DESKTOP_BANNER_DIMENSIONS",
        "INVALID_MOBILE_BANNER_DIMENSIONS",
      ].includes(
        error.message
      )
    ) {
      return jsonResponse(
        {
          error:
            error.message ===
            "INVALID_DESKTOP_BANNER_DIMENSIONS"
              ? "A imagem desktop precisa ter exatamente 1738 × 905 px."
              : error.message ===
                  "INVALID_MOBILE_BANNER_DIMENSIONS"
                ? "A imagem mobile precisa ter exatamente 1254 × 1254 px."
                : error.message ===
                    "BANNER_IMAGE_TOO_LARGE"
                  ? "A imagem não pode ultrapassar 8 MB."
                  : "Uma das imagens enviadas é inválida.",
        },
        400
      );
    }

    console.error(
      "Erro ao cadastrar banner:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível cadastrar o banner.",
      },
      500
    );
  }
}