import {
  NextResponse,
} from "next/server";

import {
  deleteProductImage,
  getProductImageResource,
} from "@/lib/cloudinary";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

const MAX_BODY_SIZE =
  100_000;

const MAX_IMAGES =
  8;

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

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

type ProductBody = {
  name?: unknown;

  shortDescription?: unknown;
  description?: unknown;

  price?: unknown;
  salePrice?: unknown;
  cost?: unknown;

  category?: unknown;
  religions?: unknown;

  stock?: unknown;
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
  name: string
) {
  const base =
    createSlug(name);

  if (!base) {
    throw new ValidationError(
      "Não foi possível gerar o slug do produto."
    );
  }

  let slug =
    base;

  for (
    let suffix = 2;
    suffix <= 1000;
    suffix += 1
  ) {
    const existing =
      await prisma.product.findUnique({
        where: {
          slug,
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

/*
 * =========================================================
 * SKU AUTOMÁTICO
 * =========================================================
 *
 * O SKU nunca vem do navegador.
 *
 * A sequence do PostgreSQL garante que dois cadastros
 * concorrentes não recebam o mesmo número.
 */
async function generateProductSku() {
  const result =
    await prisma.$queryRaw<
      Array<{
        value: bigint;
      }>
    >`
      SELECT nextval(
        'product_sku_seq'
      ) AS value
    `;

  const value =
    result[0]?.value;

  if (
    value === undefined
  ) {
    throw new Error(
      "PRODUCT_SKU_GENERATION_FAILED"
    );
  }

  return `LAI-${value
    .toString()
    .padStart(
      6,
      "0"
    )}`;
}

function parseDecimal(
  value: unknown,
  options: {
    required?: boolean;
    minimum?: number;
    maximum?: number;
    label: string;
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

function parseBoolean(
  value: unknown
) {
  return value ===
    true;
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

  const normalized =
    [
      ...new Set(
        value.filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
      ),
    ];

  if (
    normalized.length ===
    0
  ) {
    throw new ValidationError(
      "Selecione pelo menos uma religião."
    );
  }

  if (
    normalized.length >
      ALLOWED_RELIGIONS.size
  ) {
    throw new ValidationError(
      "Religiões inválidas."
    );
  }

  for (
    const religion of
    normalized
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

  return normalized;
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
      "Adicione pelo menos uma imagem."
    );
  }

  if (
    value.length >
    MAX_IMAGES
  ) {
    throw new ValidationError(
      `Adicione no máximo ${MAX_IMAGES} imagens.`
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

  const uniqueIds =
    new Set(
      images.map(
        (image) =>
          image.publicId
      )
    );

  if (
    uniqueIds.size !==
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

    const session =
      await requireAdminPermission(
        "PRODUCTS",
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
     * =====================================================
     * DADOS PRINCIPAIS
     * =====================================================
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

    const shortDescription =
      normalizeText(
        body.shortDescription,
        300
      );

    const category =
      normalizeText(
        body.category,
        120
      );

    if (
      category.length <
      2
    ) {
      throw new ValidationError(
        "Informe a categoria."
      );
    }

    const religions =
      parseReligions(
        body.religions
      );

    /*
     * =====================================================
     * PREÇOS
     * =====================================================
     */

    const price =
      parseDecimal(
        body.price,
        {
          required:
            true,
          minimum:
            0.01,
          maximum:
            99_999_999,
          label:
            "Preço",
        }
      );

    /*
     * required:true garante number.
     */
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
          minimum:
            0.01,
          maximum:
            99_999_999,
          label:
            "Preço promocional",
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
          minimum: 0,
          maximum:
            99_999_999,
          label:
            "Custo",
        }
      );

    /*
     * =====================================================
     * ESTOQUE
     * =====================================================
     */

    const stock =
      parseInteger(
        body.stock,
        "Estoque"
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

    /*
     * =====================================================
     * FRETE
     * =====================================================
     */

    const weight =
      parseDecimal(
        body.weight,
        {
          minimum: 0,
          maximum:
            100_000,
          label:
            "Peso",
        }
      );

    const height =
      parseDecimal(
        body.height,
        {
          minimum: 0,
          maximum:
            100_000,
          label:
            "Altura",
        }
      );

    const width =
      parseDecimal(
        body.width,
        {
          minimum: 0,
          maximum:
            100_000,
          label:
            "Largura",
        }
      );

    const length =
      parseDecimal(
        body.length,
        {
          minimum: 0,
          maximum:
            100_000,
          label:
            "Comprimento",
        }
      );

    /*
     * =====================================================
     * SEO
     * =====================================================
     */

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

    const featured =
      parseBoolean(
        body.featured
      );

    const active =
      parseBoolean(
        body.active
      );

    /*
     * =====================================================
     * IMAGENS
     * =====================================================
     *
     * Ignoramos totalmente a URL enviada pelo navegador.
     *
     * Cada publicId é conferido novamente diretamente
     * no Cloudinary.
     */

    const imageInputs =
      parseImages(
        body.images
      );

    /*
     * Impede reutilizar uma imagem que já pertence
     * a outro produto.
     */

    const existingImage =
      await prisma.productImage.findFirst({
        where: {
          publicId: {
            in:
              imageInputs.map(
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
      existingImage
    ) {
      throw new ValidationError(
        "Uma das imagens já está sendo utilizada."
      );
    }

    const verifiedImages =
      await Promise.all(
        imageInputs.map(
          async (
            image,
            position
          ) => {
            const resource =
              await getProductImageResource(
                image.publicId
              );

            return {
              url:
                resource.url,

              publicId:
                resource.publicId,

              position,

              isPrimary:
                image.isPrimary,
            };
          }
        )
      );

    const primaryImage =
      verifiedImages.find(
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
     * SLUG
     * =====================================================
     *
     * O navegador não decide o slug final.
     */

    const slug =
      await createAvailableSlug(
        name
      );

    /*
     * O código interno também é definido exclusivamente
     * pelo servidor, utilizando a sequence do PostgreSQL.
     */
    const sku =
      await generateProductSku();

    /*
     * =====================================================
     * PRODUTO
     * =====================================================
     */

    let product;

    try {
      product =
        await prisma.$transaction(
          async (
            transaction
          ) => {
            const createdProduct =
              await transaction.product.create({
                data: {
                  name,

                  slug,

                  sku,

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

                  /*
                   * Compatibilidade temporária
                   * com a loja atual.
                   */
                  image:
                    primaryImage.url,

                  religion:
                    religions[0],

                  /*
                   * Novo campo múltiplo.
                   */
                  religions,

                  category,

                  stock,

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

                  images: {
                    create:
                      verifiedImages.map(
                        (
                          image
                        ) => ({
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
                  },
                },

                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  active: true,
                  createdAt:
                    true,
                },
              });

            /*
             * Estoque inicial.
             *
             * O produto nasce com o saldo informado no cadastro,
             * e a primeira entrada é registrada dentro da mesma
             * transação. Se o saldo inicial for zero, não criamos
             * uma movimentação sem quantidade.
             */

            if (
              stock > 0
            ) {
              await transaction.productStockMovement.create({
                data: {
                  productId:
                    createdProduct.id,

                  actorId:
                    session.userId,

                  type:
                    "ENTRY",

                  quantity:
                    stock,

                  previousStock:
                    0,

                  newStock:
                    stock,

                  reason:
                    "Estoque inicial do produto",

                  note:
                    "Saldo informado durante o cadastro do produto.",
                },
              });
            }

            /*
             * Auditoria dentro da mesma transação.
             */

            await transaction.adminAuditLog.create({
              data: {
                actorId:
                  session.userId,

                module:
                  "PRODUCTS",

                action:
                  "PRODUCT_CREATED",

                entityType:
                  "PRODUCT",

                entityId:
                  createdProduct.id,

                changes: {
                  name:
                    createdProduct.name,

                  slug:
                    createdProduct.slug,

                  sku:
                    createdProduct.sku,

                  stock,

                  initialStockMovementCreated:
                    stock > 0,

                  price:
                    price.toFixed(
                      2
                    ),

                  active,

                  featured,
                },
              },
            });

            return createdProduct;
          }
        );
    } catch (error) {
      /*
       * O upload já aconteceu no Cloudinary.
       *
       * Se o banco falhar, tentamos remover os
       * arquivos recém-enviados para evitar órfãos.
       */

      await Promise.allSettled(
        verifiedImages.map(
          (image) =>
            deleteProductImage(
              image.publicId
            )
        )
      );

      throw error;
    }

    return jsonResponse(
      {
        success:
          true,

        product,
      },
      201
    );
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

    /*
     * SKU/slug/publicId duplicado.
     */

    if (
      isUniqueError(
        error
      )
    ) {
      return jsonResponse(
        {
          error:
            "Já existe um produto utilizando estes dados.",
        },
        409
      );
    }

    /*
     * Cloudinary.
     *
     * Não enviamos detalhes internos da conta
     * Cloudinary para o navegador.
     */

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

    /*
     * Nunca imprimimos:
     *
     * - API Secret;
     * - corpo da requisição;
     * - custo;
     * - credenciais;
     * - resposta completa do Cloudinary.
     */

    console.error(
      "Erro ao cadastrar produto:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível cadastrar o produto.",
      },
      500
    );
  }
}