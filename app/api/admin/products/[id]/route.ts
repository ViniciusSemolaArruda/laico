import { NextResponse } from "next/server";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import {
  deleteProductImage,
  getProductImageResource,
} from "@/lib/cloudinary";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

const MAX_BODY_SIZE =
  100_000;

const MAX_IMAGES = 8;

const ALLOWED_RELIGIONS =
  new Set([
    "Católicos e Protestantes",
    "Islamismo",
    "Judaísmo",
    "Hinduísmo",
    "Budismo",
    "Espiritismo",
    "Matriz Africana",
    "Povos Originários",
    "Quilombolas",
    "Ciganos",
    "Ortodoxos",
    "Anglicanismo",
  ]);

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type ProductBody = {
  name?: unknown;

  shortDescription?: unknown;
  description?: unknown;

  price?: unknown;
  salePrice?: unknown;
  cost?: unknown;

  category?: unknown;
  religions?: unknown;

  minimumStock?: unknown;

  weight?: unknown;
  height?: unknown;
  width?: unknown;
  length?: unknown;

  featured?: unknown;
  active?: unknown;

  seoTitle?: unknown;
  seoDescription?: unknown;

  images?: unknown;
};

type ImageInput = {
  publicId: string;
  isPrimary: boolean;
};

class ValidationError extends Error {}

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

function isValidProductId(
  id: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    id
  );
}

function normalizeText(
  value: unknown,
  maxLength: number
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
      maxLength
    );
}

function createSlug(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      180
    );
}

async function createAvailableSlug(
  name: string,
  currentProductId: string
) {
  const base =
    createSlug(name);

  if (!base) {
    throw new ValidationError(
      "Não foi possível gerar o slug."
    );
  }

  let slug = base;

  for (
    let suffix = 2;
    suffix <= 1000;
    suffix += 1
  ) {
    const existing =
      await prisma.product.findFirst({
        where: {
          slug,

          id: {
            not:
              currentProductId,
          },
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      return slug;
    }

    const suffixText =
      `-${suffix}`;

    slug =
      `${base.slice(
        0,
        180 -
          suffixText.length
      )}${suffixText}`;
  }

  throw new Error(
    "PRODUCT_SLUG_GENERATION_FAILED"
  );
}

function parseDecimal(
  value: unknown,
  options: {
    label: string;
    required?: boolean;
    minimum?: number;
    maximum?: number;
  }
) {
  const text =
    normalizeText(
      value,
      50
    ).replace(
      ",",
      "."
    );

  if (!text) {
    if (
      options.required
    ) {
      throw new ValidationError(
        `${options.label} é obrigatório.`
      );
    }

    return null;
  }

  const number =
    Number(text);

  if (
    !Number.isFinite(
      number
    )
  ) {
    throw new ValidationError(
      `${options.label} é inválido.`
    );
  }

  if (
    options.minimum !==
      undefined &&
    number <
      options.minimum
  ) {
    throw new ValidationError(
      `${options.label} é inválido.`
    );
  }

  if (
    options.maximum !==
      undefined &&
    number >
      options.maximum
  ) {
    throw new ValidationError(
      `${options.label} é inválido.`
    );
  }

  return number;
}

function parseInteger(
  value: unknown,
  label: string
) {
  const text =
    normalizeText(
      value,
      30
    );

  if (!text) {
    throw new ValidationError(
      `${label} é obrigatório.`
    );
  }

  const number =
    Number(text);

  if (
    !Number.isSafeInteger(
      number
    ) ||
    number < 0
  ) {
    throw new ValidationError(
      `${label} é inválido.`
    );
  }

  return number;
}

function parseReligions(
  value: unknown
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    throw new ValidationError(
      "Selecione pelo menos uma religião."
    );
  }

  const religions =
    [
      ...new Set(
        value.filter(
          (
            religion
          ): religion is string =>
            typeof religion ===
            "string"
        )
      ),
    ];

  if (
    religions.length ===
    0
  ) {
    throw new ValidationError(
      "Selecione pelo menos uma religião."
    );
  }

  for (
    const religion of
    religions
  ) {
    if (
      !ALLOWED_RELIGIONS.has(
        religion
      )
    ) {
      throw new ValidationError(
        "Uma das religiões selecionadas é inválida."
      );
    }
  }

  return religions;
}

function parseImages(
  value: unknown
): ImageInput[] {
  if (
    !Array.isArray(
      value
    ) ||
    value.length ===
      0
  ) {
    throw new ValidationError(
      "O produto precisa possuir pelo menos uma imagem."
    );
  }

  if (
    value.length >
    MAX_IMAGES
  ) {
    throw new ValidationError(
      `O produto pode possuir no máximo ${MAX_IMAGES} imagens.`
    );
  }

  const images =
    value.map(
      (
        item
      ): ImageInput => {
        if (
          typeof item !==
            "object" ||
          item === null
        ) {
          throw new ValidationError(
            "Imagem inválida."
          );
        }

        const data =
          item as Record<
            string,
            unknown
          >;

        const publicId =
          normalizeText(
            data.publicId,
            500
          );

        if (!publicId) {
          throw new ValidationError(
            "Imagem inválida."
          );
        }

        return {
          publicId,

          isPrimary:
            data.isPrimary ===
            true,
        };
      }
    );

  const unique =
    new Set(
      images.map(
        (image) =>
          image.publicId
      )
    );

  if (
    unique.size !==
    images.length
  ) {
    throw new ValidationError(
      "Existem imagens duplicadas."
    );
  }

  const primaryCount =
    images.filter(
      (image) =>
        image.isPrimary
    ).length;

  if (
    primaryCount !== 1
  ) {
    throw new ValidationError(
      "Escolha exatamente uma imagem principal."
    );
  }

  return images;
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
 * PATCH — EDITAR PRODUTO
 * =========================================================
 */

export async function PATCH(
  request: Request,
  {
    params,
  }: Props
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
        "PRODUCTS",
        "EDIT"
      );

    const {
      id,
    } =
      await params;

    if (
      !id ||
      !isValidProductId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Produto inválido.",
        },
        400
      );
    }

    /*
     * Content-Type.
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
      ProductBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as ProductBody;
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
     * O estoque não pode ser alterado pela edição geral.
     * Toda movimentação precisa passar pela rota dedicada,
     * que registra motivo, responsável, antes/depois e
     * protege contra alterações concorrentes.
     */

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "stock"
      )
    ) {
      return jsonResponse(
        {
          error:
            "Utilize o controle de estoque para alterar a quantidade do produto.",
        },
        400
      );
    }

    /*
     * Produto atual.
     */

    const currentProduct =
      await prisma.product.findFirst({
        where: {
          id,

          archivedAt:
            null,
        },

        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,

          shortDescription:
            true,

          description:
            true,

          price: true,
          salePrice: true,
          cost: true,

          category: true,
          religion: true,
          religions: true,

          stock: true,
          minimumStock:
            true,

          weight: true,
          height: true,
          width: true,
          length: true,

          featured: true,
          active: true,

          seoTitle: true,
          seoDescription:
            true,

          images: {
            select: {
              id: true,
              url: true,
              publicId: true,
              position: true,
              isPrimary: true,
            },

            orderBy: {
              position:
                "asc",
            },
          },
        },
      });

    if (
      !currentProduct
    ) {
      return jsonResponse(
        {
          error:
            "Produto não encontrado.",
        },
        404
      );
    }

    /*
     * Dados.
     */

    const name =
      normalizeText(
        body.name,
        200
      );

    if (
      name.length < 2
    ) {
      throw new ValidationError(
        "Informe o nome do produto."
      );
    }

    const shortDescription =
      normalizeText(
        body.shortDescription,
        300
      );

    const description =
      normalizeText(
        body.description,
        10_000
      );

    if (
      description.length <
      2
    ) {
      throw new ValidationError(
        "Informe a descrição do produto."
      );
    }

    const category =
      normalizeText(
        body.category,
        120
      );

    if (
      category.length < 2
    ) {
      throw new ValidationError(
        "Informe a categoria."
      );
    }

    const religions =
      parseReligions(
        body.religions
      );

    const price =
      parseDecimal(
        body.price,
        {
          label:
            "Preço",

          required:
            true,

          minimum:
            0.01,

          maximum:
            99_999_999,
        }
      );

    if (
      price === null
    ) {
      throw new ValidationError(
        "Preço inválido."
      );
    }

    const salePrice =
      parseDecimal(
        body.salePrice,
        {
          label:
            "Preço promocional",

          minimum:
            0.01,

          maximum:
            99_999_999,
        }
      );

    if (
      salePrice !==
        null &&
      salePrice >=
        price
    ) {
      throw new ValidationError(
        "O preço promocional deve ser menor que o preço normal."
      );
    }

    const cost =
      parseDecimal(
        body.cost,
        {
          label:
            "Custo",

          minimum: 0,

          maximum:
            99_999_999,
        }
      );

    const minimumStockText =
      normalizeText(
        body.minimumStock,
        30
      );

    const minimumStock =
      minimumStockText
        ? parseInteger(
            minimumStockText,
            "Estoque mínimo"
          )
        : 0;

    const weight =
      parseDecimal(
        body.weight,
        {
          label:
            "Peso",
          minimum:
            0,
          maximum:
            100_000,
        }
      );

    const height =
      parseDecimal(
        body.height,
        {
          label:
            "Altura",
          minimum:
            0,
          maximum:
            100_000,
        }
      );

    const width =
      parseDecimal(
        body.width,
        {
          label:
            "Largura",
          minimum:
            0,
          maximum:
            100_000,
        }
      );

    const length =
      parseDecimal(
        body.length,
        {
          label:
            "Comprimento",
          minimum:
            0,
          maximum:
            100_000,
        }
      );

    const featured =
      body.featured ===
      true;

    const active =
      body.active ===
      true;

    const seoTitle =
      normalizeText(
        body.seoTitle,
        70
      );

    const seoDescription =
      normalizeText(
        body.seoDescription,
        180
      );

    /*
     * SKU NÃO é recebido nem alterado.
     */

    const slug =
      await createAvailableSlug(
        name,
        currentProduct.id
      );

    /*
     * =====================================================
     * GALERIA
     * =====================================================
     */

    const requestedImages =
      parseImages(
        body.images
      );

    const requestedIds =
      new Set(
        requestedImages.map(
          (image) =>
            image.publicId
        )
      );

    /*
     * Imagens atuais removidas pelo funcionário.
     */

    const removedImages =
      currentProduct.images.filter(
        (image) =>
          image.publicId &&
          !requestedIds.has(
            image.publicId
          )
      );

    /*
     * Separa imagens já pertencentes ao produto
     * das imagens recém-enviadas ao Cloudinary.
     */

    const currentByPublicId =
      new Map(
        currentProduct.images
          .filter(
            (
              image
            ): image is typeof image & {
              publicId: string;
            } =>
              Boolean(
                image.publicId
              )
          )
          .map(
            (image) => [
              image.publicId,
              image,
            ]
          )
      );

    const newInputs =
      requestedImages.filter(
        (image) =>
          !currentByPublicId.has(
            image.publicId
          )
      );

    /*
     * Uma imagem nova não pode já pertencer
     * a outro produto.
     */

    if (
      newInputs.length >
      0
    ) {
      const alreadyUsed =
        await prisma.productImage.findFirst({
          where: {
            publicId: {
              in:
                newInputs.map(
                  (image) =>
                    image.publicId
                ),
            },
          },

          select: {
            id: true,
          },
        });

      if (
        alreadyUsed
      ) {
        throw new ValidationError(
          "Uma das imagens já pertence a outro produto."
        );
      }
    }

    /*
     * Confirma as imagens novas diretamente
     * no Cloudinary.
     */

    const verifiedNewImages =
      await Promise.all(
        newInputs.map(
          async (
            image
          ) => {
            const resource =
              await getProductImageResource(
                image.publicId
              );

            return {
              publicId:
                resource.publicId,

              url:
                resource.url,
            };
          }
        )
      );

    const newImageMap =
      new Map(
        verifiedNewImages.map(
          (image) => [
            image.publicId,
            image,
          ]
        )
      );

    /*
     * Constrói a galeria definitiva.
     *
     * URL de imagem existente vem do banco.
     * URL de imagem nova vem do Cloudinary.
     * URL enviada pelo browser é ignorada.
     */

    const finalImages =
      requestedImages.map(
        (
          requested,
          position
        ) => {
          const existing =
            currentByPublicId.get(
              requested.publicId
            );

          if (existing) {
            return {
              url:
                existing.url,

              publicId:
                requested.publicId,

              position,

              isPrimary:
                requested.isPrimary,
            };
          }

          const uploaded =
            newImageMap.get(
              requested.publicId
            );

          if (!uploaded) {
            throw new ValidationError(
              "Imagem inválida."
            );
          }

          return {
            url:
              uploaded.url,

            publicId:
              uploaded.publicId,

            position,

            isPrimary:
              requested.isPrimary,
          };
        }
      );

    const primaryImage =
      finalImages.find(
        (image) =>
          image.isPrimary
      );

    if (
      !primaryImage
    ) {
      throw new ValidationError(
        "Imagem principal inválida."
      );
    }

    /*
     * =====================================================
     * TRANSAÇÃO
     * =====================================================
     */

    let updatedProduct;

    try {
      updatedProduct =
        await prisma.$transaction(
          async (
            transaction
          ) => {
            /*
             * Produto.
             */

            const updated =
              await transaction.product.update({
                where: {
                  id:
                    currentProduct.id,

                  archivedAt:
                    null,
                },

                data: {
                  name,

                  slug,

                  /*
                   * SKU propositalmente ausente.
                   */

                  shortDescription:
                    shortDescription ||
                    null,

                  description,

                  price:
                    price.toFixed(
                      2
                    ),

                  salePrice:
                    salePrice ===
                    null
                      ? null
                      : salePrice.toFixed(
                          2
                        ),

                  cost:
                    cost ===
                    null
                      ? null
                      : cost.toFixed(
                          2
                        ),

                  image:
                    primaryImage.url,

                  religion:
                    religions[0],

                  religions,

                  category,

                  minimumStock,

                  weight:
                    weight ===
                    null
                      ? null
                      : weight.toFixed(
                          3
                        ),

                  height:
                    height ===
                    null
                      ? null
                      : height.toFixed(
                          2
                        ),

                  width:
                    width ===
                    null
                      ? null
                      : width.toFixed(
                          2
                        ),

                  length:
                    length ===
                    null
                      ? null
                      : length.toFixed(
                          2
                        ),

                  featured,

                  active,

                  seoTitle:
                    seoTitle ||
                    null,

                  seoDescription:
                    seoDescription ||
                    null,
                },

                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  active: true,
                  updatedAt:
                    true,
                },
              });

            /*
             * Substitui registros da galeria dentro
             * da mesma transação.
             */

            await transaction.productImage.deleteMany({
              where: {
                productId:
                  currentProduct.id,
              },
            });

            await transaction.productImage.createMany({
              data:
                finalImages.map(
                  (image) => ({
                    productId:
                      currentProduct.id,

                    url:
                      image.url,

                    publicId:
                      image.publicId,

                    alt:
                      name,

                    position:
                      image.position,

                    isPrimary:
                      image.isPrimary,
                  })
                ),
            });

            /*
             * Auditoria.
             */

            await transaction.adminAuditLog.create({
              data: {
                actorId:
                  session.userId,

                module:
                  "PRODUCTS",

                action:
                  "PRODUCT_UPDATED",

                entityType:
                  "PRODUCT",

                entityId:
                  currentProduct.id,

                changes: {
                  name: {
                    before:
                      currentProduct.name,

                    after:
                      name,
                  },

                  price: {
                    before:
                      String(
                        currentProduct.price
                      ),

                    after:
                      price.toFixed(
                        2
                      ),
                  },

                  salePrice: {
                    before:
                      currentProduct.salePrice
                        ? String(
                            currentProduct.salePrice
                          )
                        : null,

                    after:
                      salePrice ===
                      null
                        ? null
                        : salePrice.toFixed(
                            2
                          ),
                  },

                  category: {
                    before:
                      currentProduct.category,

                    after:
                      category,
                  },

                  religions: {
                    before:
                      currentProduct.religions,

                    after:
                      religions,
                  },

                  active: {
                    before:
                      currentProduct.active,

                    after:
                      active,
                  },

                  featured: {
                    before:
                      currentProduct.featured,

                    after:
                      featured,
                  },

                  imagesChanged:
                    finalImages.length !==
                      currentProduct.images.length ||
                    removedImages.length >
                      0 ||
                    newInputs.length >
                      0,
                },
              },
            });

            return updated;
          }
        );
    } catch (error) {
      /*
       * Se o banco falhar, apagamos SOMENTE imagens
       * novas que acabaram de ser enviadas.
       *
       * Imagens antigas continuam intactas.
       */

      await Promise.allSettled(
        verifiedNewImages.map(
          (image) =>
            deleteProductImage(
              image.publicId
            )
        )
      );

      throw error;
    }

    /*
     * Só depois da transação ter sido confirmada
     * removemos do Cloudinary imagens antigas que
     * o funcionário retirou da galeria.
     */

    if (
      removedImages.length >
      0
    ) {
      const deletionResults =
        await Promise.allSettled(
          removedImages
            .filter(
              (
                image
              ): image is typeof image & {
                publicId: string;
              } =>
                Boolean(
                  image.publicId
                )
            )
            .map(
              (image) =>
                deleteProductImage(
                  image.publicId
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
          "Uma ou mais imagens antigas não puderam ser removidas do Cloudinary."
        );
      }
    }

    return jsonResponse({
      success:
        true,

      product:
        updatedProduct,
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
            "Já existe outro produto utilizando estes dados.",
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
      ].includes(
        error.message
      )
    ) {
      return jsonResponse(
        {
          error:
            "Uma das imagens enviadas é inválida.",
        },
        400
      );
    }

    console.error(
      "Erro ao atualizar produto:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível atualizar o produto.",
      },
      500
    );
  }
}

/*
 * =========================================================
 * DELETE — ARQUIVAR PRODUTO
 * =========================================================
 */

export async function DELETE(
  request: Request,
  {
    params,
  }: Props
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

    /*
     * Somente MANAGE pode remover.
     */

    const session =
      await requireAdminPermission(
        "PRODUCTS",
        "MANAGE"
      );

    const {
      id,
    } =
      await params;

    if (
      !id ||
      !isValidProductId(
        id
      )
    ) {
      return jsonResponse(
        {
          error:
            "Produto inválido.",
        },
        400
      );
    }

    const product =
      await prisma.product.findFirst({
        where: {
          id,

          archivedAt:
            null,
        },

        select: {
          id: true,
          name: true,
          sku: true,
          active: true,
        },
      });

    if (
      !product
    ) {
      return jsonResponse(
        {
          error:
            "Produto não encontrado.",
        },
        404
      );
    }

    /*
     * Não apagamos fisicamente.
     */

    await prisma.$transaction(
      async (
        transaction
      ) => {
        await transaction.product.update({
          where: {
            id:
              product.id,
          },

          data: {
            active:
              false,

            archivedAt:
              new Date(),
          },

          select: {
            id: true,
          },
        });

        await transaction.adminAuditLog.create({
          data: {
            actorId:
              session.userId,

            module:
              "PRODUCTS",

            action:
              "PRODUCT_ARCHIVED",

            entityType:
              "PRODUCT",

            entityId:
              product.id,

            changes: {
              name:
                product.name,

              sku:
                product.sku,

              previousActive:
                product.active,

              active:
                false,

              archived:
                true,
            },
          },
        });
      }
    );

    return jsonResponse({
      success:
        true,

      message:
        "Produto removido da loja com sucesso.",
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
      "Erro ao remover produto:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível remover o produto.",
      },
      500
    );
  }
}
