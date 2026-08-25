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

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function isValidBannerId(
  id: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    id
  );
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
  value: unknown,
  defaultValue: number
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
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

function isNotFoundError(
  error: unknown
) {
  return (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error &&
    error.code ===
      "P2025"
  );
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
 * Busca um banner pelo ID.
 * =========================================================
 */

export async function GET(
  _request: Request,
  { params }: RouteProps
) {
  try {
    await requireAdminPermission(
      "BANNERS",
      "VIEW"
    );

    const { id } =
      await params;

    if (
      !isValidBannerId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Banner inválido.",
        },
        400
      );
    }

    const banner =
      await prisma.banner.findUnique({
        where: {
          id,
        },

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

    if (!banner) {
      return jsonResponse(
        {
          error:
            "Banner não encontrado.",
        },
        404
      );
    }

    return jsonResponse({
      success: true,
      banner,
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
      "Erro ao buscar banner:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível carregar o banner.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * PATCH
 * Edita um banner existente.
 * =========================================================
 */

export async function PATCH(
  request: Request,
  { params }: RouteProps
) {
  let newDesktopPublicId:
    string | null = null;

  let newMobilePublicId:
    string | null = null;

  let updateCompleted =
    false;

  try {
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

    const session =
      await requireAdminPermission(
        "BANNERS",
        "EDIT"
      );

    const { id } =
      await params;

    if (
      !isValidBannerId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Banner inválido.",
        },
        400
      );
    }

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

    const currentBanner =
      await prisma.banner.findUnique({
        where: {
          id,
        },
      });

    if (!currentBanner) {
      return jsonResponse(
        {
          error:
            "Banner não encontrado.",
        },
        404
      );
    }

    /*
     * =====================================================
     * TEXTOS
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
        currentBanner.active
      );

    const sortOrder =
      parseSortOrder(
        body.sortOrder,
        currentBanner.sortOrder
      );

    /*
     * =====================================================
     * NOVAS IMAGENS
     * =====================================================
     *
     * PublicId vazio significa que a imagem atual
     * deve ser mantida.
     */

    const informedDesktopPublicId =
      normalizeText(
        body.desktopImagePublicId,
        500
      );

    const informedMobilePublicId =
      normalizeText(
        body.mobileImagePublicId,
        500
      );

    newDesktopPublicId =
      informedDesktopPublicId &&
      informedDesktopPublicId !==
        currentBanner.desktopImagePublicId
        ? informedDesktopPublicId
        : null;

    newMobilePublicId =
      informedMobilePublicId &&
      informedMobilePublicId !==
        currentBanner.mobileImagePublicId
        ? informedMobilePublicId
        : null;

    const finalDesktopPublicId =
      newDesktopPublicId ??
      currentBanner.desktopImagePublicId;

    const finalMobilePublicId =
      newMobilePublicId ??
      currentBanner.mobileImagePublicId;

    if (
      !finalDesktopPublicId
    ) {
      throw new ValidationError(
        "Envie a imagem para desktop."
      );
    }

    if (
      !finalMobilePublicId
    ) {
      throw new ValidationError(
        "Envie a imagem para celular."
      );
    }

    if (
      finalDesktopPublicId ===
      finalMobilePublicId
    ) {
      throw new ValidationError(
        "As imagens de desktop e celular devem ser diferentes."
      );
    }

    /*
     * Impede que as imagens pertençam a outro banner.
     */

    const publicIdsToCheck = [
      newDesktopPublicId,
      newMobilePublicId,
    ].filter(
      (
        publicId
      ): publicId is string =>
        Boolean(publicId)
    );

    if (
      publicIdsToCheck.length >
      0
    ) {
      const bannerUsingImages =
        await prisma.banner.findFirst({
          where: {
            id: {
              not: id,
            },

            OR: [
              {
                desktopImagePublicId:
                  {
                    in:
                      publicIdsToCheck,
                  },
              },
              {
                mobileImagePublicId:
                  {
                    in:
                      publicIdsToCheck,
                  },
              },
            ],
          },

          select: {
            id: true,
          },
        });

      if (
        bannerUsingImages
      ) {
        throw new ValidationError(
          "Uma das imagens já está sendo utilizada por outro banner."
        );
      }
    }

    /*
     * Valida as novas imagens diretamente no Cloudinary.
     */

    const [
      newDesktopResource,
      newMobileResource,
    ] = await Promise.all([
      newDesktopPublicId
        ? getBannerImageResource(
            newDesktopPublicId,
            "desktop"
          )
        : Promise.resolve(
            null
          ),

      newMobilePublicId
        ? getBannerImageResource(
            newMobilePublicId,
            "mobile"
          )
        : Promise.resolve(
            null
          ),
    ]);

    const desktopImageUrl =
      newDesktopResource?.url ??
      currentBanner.desktopImageUrl;

    const desktopImagePublicId =
      newDesktopResource?.publicId ??
      currentBanner.desktopImagePublicId;

    const mobileImageUrl =
      newMobileResource?.url ??
      currentBanner.mobileImageUrl;

    const mobileImagePublicId =
      newMobileResource?.publicId ??
      currentBanner.mobileImagePublicId;

    /*
     * =====================================================
     * ATUALIZAÇÃO E AUDITORIA
     * =====================================================
     */

    const updatedBanner =
      await prisma.$transaction(
        async (
          transaction
        ) => {
          const result =
            await transaction.banner.update({
              where: {
                id,
              },

              data: {
                title,
                alt,

                desktopImageUrl,
                desktopImagePublicId,

                mobileImageUrl,
                mobileImagePublicId,

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
                "BANNER_UPDATED",

              entityType:
                "BANNER",

              entityId:
                result.id,

              changes: {
                previous: {
                  title:
                    currentBanner.title,

                  href:
                    currentBanner.href,

                  active:
                    currentBanner.active,

                  sortOrder:
                    currentBanner.sortOrder,

                  desktopImagePublicId:
                    currentBanner.desktopImagePublicId,

                  mobileImagePublicId:
                    currentBanner.mobileImagePublicId,
                },

                current: {
                  title:
                    result.title,

                  href:
                    result.href,

                  active:
                    result.active,

                  sortOrder:
                    result.sortOrder,

                  desktopImagePublicId:
                    result.desktopImagePublicId,

                  mobileImagePublicId:
                    result.mobileImagePublicId,
                },
              },
            },
          });

          return result;
        }
      );

    updateCompleted =
      true;

    /*
     * O banco já está atualizado.
     * Agora podemos remover as imagens antigas.
     */

    const oldImagesToDelete: string[] =
      [];

    if (
      newDesktopResource &&
      currentBanner.desktopImagePublicId &&
      currentBanner.desktopImagePublicId !==
        newDesktopResource.publicId
    ) {
      oldImagesToDelete.push(
        currentBanner.desktopImagePublicId
      );
    }

    if (
      newMobileResource &&
      currentBanner.mobileImagePublicId &&
      currentBanner.mobileImagePublicId !==
        newMobileResource.publicId
    ) {
      oldImagesToDelete.push(
        currentBanner.mobileImagePublicId
      );
    }

    if (
      oldImagesToDelete.length >
      0
    ) {
      const deletionResults =
        await Promise.allSettled(
          oldImagesToDelete.map(
            (publicId) =>
              deleteBannerImage(
                publicId
              )
          )
        );

      if (
        deletionResults.some(
          (result) =>
            result.status ===
            "rejected"
        )
      ) {
        console.error(
          "Uma imagem antiga do banner não pôde ser removida."
        );
      }
    }

    return jsonResponse({
      success: true,
      banner:
        updatedBanner,
    });
  } catch (error) {
    /*
     * Se novas imagens foram enviadas, mas a atualização
     * do banco falhou, tentamos removê-las.
     */

    if (!updateCompleted) {
      const imagesToClean = [
        newDesktopPublicId,
        newMobilePublicId,
      ].filter(
        (
          publicId
        ): publicId is string =>
          Boolean(publicId)
      );

      if (
        imagesToClean.length >
        0
      ) {
        await Promise.allSettled(
          imagesToClean.map(
            (publicId) =>
              deleteBannerImage(
                publicId
              )
          )
        );
      }
    }

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
      isNotFoundError(
        error
      )
    ) {
      return jsonResponse(
        {
          error:
            "Banner não encontrado.",
        },
        404
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
      "Erro ao atualizar banner:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível atualizar o banner.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * DELETE
 * Exclui o banner e remove suas imagens.
 * =========================================================
 */

export async function DELETE(
  request: Request,
  { params }: RouteProps
) {
  try {
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

    const session =
      await requireAdminPermission(
        "BANNERS",
        "MANAGE"
      );

    const { id } =
      await params;

    if (
      !isValidBannerId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Banner inválido.",
        },
        400
      );
    }

    const banner =
      await prisma.banner.findUnique({
        where: {
          id,
        },
      });

    if (!banner) {
      return jsonResponse(
        {
          error:
            "Banner não encontrado.",
        },
        404
      );
    }

    await prisma.$transaction(
      async (
        transaction
      ) => {
        await transaction.banner.delete({
          where: {
            id,
          },
        });

        await transaction.adminAuditLog.create({
          data: {
            actorId:
              session.userId,

            module:
              "BANNERS",

            action:
              "BANNER_DELETED",

            entityType:
              "BANNER",

            entityId:
              banner.id,

            changes: {
              title:
                banner.title,

              href:
                banner.href,

              active:
                banner.active,

              sortOrder:
                banner.sortOrder,

              desktopImagePublicId:
                banner.desktopImagePublicId,

              mobileImagePublicId:
                banner.mobileImagePublicId,
            },
          },
        });
      }
    );

    /*
     * O banner já foi removido do banco.
     * Agora removemos seus arquivos.
     */

    const publicIds = [
      banner.desktopImagePublicId,
      banner.mobileImagePublicId,
    ].filter(
      (
        publicId
      ): publicId is string =>
        Boolean(publicId)
    );

    if (
      publicIds.length >
      0
    ) {
      const deletionResults =
        await Promise.allSettled(
          publicIds.map(
            (publicId) =>
              deleteBannerImage(
                publicId
              )
          )
        );

      if (
        deletionResults.some(
          (result) =>
            result.status ===
            "rejected"
        )
      ) {
        console.error(
          "Uma imagem do banner excluído não pôde ser removida."
        );
      }
    }

    return jsonResponse({
      success: true,

      message:
        "Banner excluído com sucesso.",
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

    if (
      isNotFoundError(
        error
      )
    ) {
      return jsonResponse(
        {
          error:
            "Banner não encontrado.",
        },
        404
      );
    }

    console.error(
      "Erro ao excluir banner:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível excluir o banner.",
      },
      500
    );
  }
}