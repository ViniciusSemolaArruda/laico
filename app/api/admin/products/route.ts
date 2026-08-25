import { NextResponse } from "next/server";

import {
  deleteProductImage,
  getProductImageResource,
} from "@/lib/cloudinary";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_BODY_SIZE = 150_000;
const MAX_IMAGES = 8;
const MAX_VARIANTS = 5;

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

const ALLOWED_RELIGIONS = new Set([
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

const ALLOWED_PRODUCT_TYPES = new Set([
  "STANDARD",
  "ACCESSORY",
  "RELIGIOUS_IMAGE",
  "CLOTHING_TOP",
  "CLOTHING_BOTTOM",
]);

const ALLOWED_CLOTHING_SIZES = new Set([
  "P",
  "M",
  "G",
  "GG",
  "XG",
]);

type ProductType =
  | "STANDARD"
  | "ACCESSORY"
  | "RELIGIOUS_IMAGE"
  | "CLOTHING_TOP"
  | "CLOTHING_BOTTOM";

type ClothingSize =
  | "P"
  | "M"
  | "G"
  | "GG"
  | "XG";

type ProductBody = {
  name?: unknown;

  shortDescription?: unknown;
  description?: unknown;

  price?: unknown;
  salePrice?: unknown;
  cost?: unknown;

  category?: unknown;
  religions?: unknown;

  productType?: unknown;
  materialComposition?: unknown;

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
  variants?: unknown;
};

type ImageInput = {
  publicId: string;
  isPrimary: boolean;
};

type VariantInput = {
  size: ClothingSize;

  stock: number;
  minimumStock: number;

  pieceLength: number | null;
  sleeveLength: number | null;
  shoulderWidth: number | null;
  chestCircumference: number | null;

  waistCircumference: number | null;
  hipCircumference: number | null;
  thighCircumference: number | null;
  inseamLength: number | null;

  bodyChestMinimum: number | null;
  bodyChestMaximum: number | null;
  bodyWaistMinimum: number | null;
  bodyWaistMaximum: number | null;
  bodyHipMinimum: number | null;
  bodyHipMaximum: number | null;
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

  let slug = base;

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
 * O SKU é gerado somente no servidor.
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
  label: string,
  required = true
) {
  const text =
    typeof value ===
      "number"
      ? String(value)
      : normalizeText(
          value,
          30
        );

  if (!text) {
    if (required) {
      throw new ValidationError(
        `${label} é obrigatório.`
      );
    }

    return 0;
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
  return value === true;
}

function parseProductType(
  value: unknown
): ProductType {
  const normalized =
    normalizeText(
      value,
      50
    );

  /*
   * Mantém compatibilidade com formulários
   * antigos que ainda não enviam productType.
   */
  if (!normalized) {
    return "STANDARD";
  }

  if (
    !ALLOWED_PRODUCT_TYPES.has(
      normalized
    )
  ) {
    throw new ValidationError(
      "O tipo do produto é inválido."
    );
  }

  return normalized as ProductType;
}

function isClothingProduct(
  productType: ProductType
) {
  return (
    productType ===
      "CLOTHING_TOP" ||
    productType ===
      "CLOTHING_BOTTOM"
  );
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

  const normalized = [
    ...new Set(
      value
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            "string"
        )
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
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
    value.length === 0
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

function parseVariantMeasurement(
  data: Record<
    string,
    unknown
  >,
  field: string,
  label: string
) {
  return parseDecimal(
    data[field],
    {
      required: true,
      minimum: 0.01,
      maximum: 10_000,
      label,
    }
  );
}

function parseVariants(
  value: unknown,
  productType: ProductType
): VariantInput[] {
  if (
    !isClothingProduct(
      productType
    )
  ) {
    /*
     * Produtos sem vestuário não podem criar
     * variações por tamanho acidentalmente.
     */
    return [];
  }

  if (
    !Array.isArray(
      value
    ) ||
    value.length === 0
  ) {
    throw new ValidationError(
      "Adicione pelo menos um tamanho para o vestuário."
    );
  }

  if (
    value.length >
      MAX_VARIANTS
  ) {
    throw new ValidationError(
      `Adicione no máximo ${MAX_VARIANTS} tamanhos.`
    );
  }

  const variants =
    value.map(
      (
        item,
        index
      ): VariantInput => {
        if (
          typeof item !==
            "object" ||
          item === null
        ) {
          throw new ValidationError(
            `O tamanho ${index + 1} é inválido.`
          );
        }

        const data =
          item as Record<
            string,
            unknown
          >;

        const size =
          normalizeText(
            data.size,
            10
          ).toUpperCase();

        if (
          !ALLOWED_CLOTHING_SIZES.has(
            size
          )
        ) {
          throw new ValidationError(
            `O tamanho ${index + 1} é inválido.`
          );
        }

        const stock =
          parseInteger(
            data.stock,
            `Estoque do tamanho ${size}`
          );

        const minimumStock =
          parseInteger(
            data.minimumStock,
            `Estoque mínimo do tamanho ${size}`,
            false
          );

        if (
          productType ===
          "CLOTHING_TOP"
        ) {
          const pieceLength =
            parseVariantMeasurement(
              data,
              "pieceLength",
              `Comprimento da peça do tamanho ${size}`
            );

          const sleeveLength =
            parseVariantMeasurement(
              data,
              "sleeveLength",
              `Comprimento da manga do tamanho ${size}`
            );

          const shoulderWidth =
            parseVariantMeasurement(
              data,
              "shoulderWidth",
              `Medida de ombro a ombro do tamanho ${size}`
            );

          const chestCircumference =
            parseVariantMeasurement(
              data,
              "chestCircumference",
              `Circunferência do tórax do tamanho ${size}`
            );

          const bodyChest =
            parseBodyMeasurementRange({
              data,
              minimumField:
                "bodyChestMinimum",
              maximumField:
                "bodyChestMaximum",
              label:
                "Tórax corporal",
              size,
            });

          const bodyWaist =
            parseBodyMeasurementRange({
              data,
              minimumField:
                "bodyWaistMinimum",
              maximumField:
                "bodyWaistMaximum",
              label:
                "Cintura corporal",
              size,
            });

          return {
            size:
              size as ClothingSize,

            stock,
            minimumStock,

            pieceLength,
            sleeveLength,
            shoulderWidth,
            chestCircumference,

            waistCircumference:
              null,

            hipCircumference:
              null,

            thighCircumference:
              null,

            inseamLength:
              null,

            bodyChestMinimum:
              bodyChest.minimum,

            bodyChestMaximum:
              bodyChest.maximum,

            bodyWaistMinimum:
              bodyWaist.minimum,

            bodyWaistMaximum:
              bodyWaist.maximum,

            bodyHipMinimum:
              null,

            bodyHipMaximum:
              null,
          };
        }

        const pieceLength =
          parseVariantMeasurement(
            data,
            "pieceLength",
            `Comprimento total do tamanho ${size}`
          );

        const waistCircumference =
          parseVariantMeasurement(
            data,
            "waistCircumference",
            `Circunferência da cintura do tamanho ${size}`
          );

        const hipCircumference =
          parseVariantMeasurement(
            data,
            "hipCircumference",
            `Circunferência do quadril do tamanho ${size}`
          );

        const thighCircumference =
          parseVariantMeasurement(
            data,
            "thighCircumference",
            `Circunferência da coxa do tamanho ${size}`
          );

        const inseamLength =
          parseVariantMeasurement(
            data,
            "inseamLength",
            `Comprimento interno da perna do tamanho ${size}`
          );

        const bodyWaist =
          parseBodyMeasurementRange({
            data,
            minimumField:
              "bodyWaistMinimum",
            maximumField:
              "bodyWaistMaximum",
            label:
              "Cintura corporal",
            size,
          });

        const bodyHip =
          parseBodyMeasurementRange({
            data,
            minimumField:
              "bodyHipMinimum",
            maximumField:
              "bodyHipMaximum",
            label:
              "Quadril corporal",
            size,
          });

        return {
          size:
            size as ClothingSize,

          stock,
          minimumStock,

          pieceLength,

          sleeveLength:
            null,

          shoulderWidth:
            null,

          chestCircumference:
            null,

          waistCircumference,
          hipCircumference,
          thighCircumference,
          inseamLength,

          bodyChestMinimum:
            null,

          bodyChestMaximum:
            null,

          bodyWaistMinimum:
            bodyWaist.minimum,

          bodyWaistMaximum:
            bodyWaist.maximum,

          bodyHipMinimum:
            bodyHip.minimum,

          bodyHipMaximum:
            bodyHip.maximum,
        };
      }
    );

  const sizes =
    variants.map(
      (variant) =>
        variant.size
    );

  if (
    new Set(
      sizes
    ).size !==
      sizes.length
  ) {
    throw new ValidationError(
      "Existem tamanhos repetidos."
    );
  }

  return variants;
}

function decimalToDatabase(
  value: number | null,
  decimalPlaces = 2
) {
  return value === null
    ? null
    : value.toFixed(
        decimalPlaces
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
     * ORIGEM E AUTORIZAÇÃO
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

    const session =
      await requireAdminPermission(
        "PRODUCTS",
        "EDIT"
      );

    /*
     * =====================================================
     * CONTENT TYPE E TAMANHO
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

    let body: ProductBody;

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
      description.length < 2
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

    const productType =
      parseProductType(
        body.productType
      );

    const clothing =
      isClothingProduct(
        productType
      );

    const materialComposition =
      normalizeText(
        body.materialComposition,
        500
      );

    if (
      !clothing &&
      materialComposition
    ) {
      throw new ValidationError(
        "A composição do material é permitida apenas para vestuário."
      );
    }

    /*
     * =====================================================
     * PREÇOS
     * =====================================================
     */

    const price =
      parseDecimal(
        body.price,
        {
          required: true,
          minimum: 0.01,
          maximum:
            99_999_999,
          label: "Preço",
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
          minimum: 0.01,
          maximum:
            99_999_999,
          label:
            "Preço promocional",
        }
      );

    if (
      salePrice !== null &&
      salePrice >= price
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
          label: "Custo",
        }
      );

    /*
     * =====================================================
     * VARIAÇÕES E ESTOQUE
     * =====================================================
     */

    const variants =
      parseVariants(
        body.variants,
        productType
      );

    const stock =
      clothing
        ? variants.reduce(
            (
              total,
              variant
            ) =>
              total +
              variant.stock,
            0
          )
        : parseInteger(
            body.stock,
            "Estoque"
          );

    const minimumStock =
      clothing
        ? variants.reduce(
            (
              total,
              variant
            ) =>
              total +
              variant.minimumStock,
            0
          )
        : parseInteger(
            body.minimumStock,
            "Estoque mínimo",
            false
          );

    /*
     * =====================================================
     * PESO E DIMENSÕES
     * =====================================================
     *
     * Para imagens e esculturas religiosas,
     * essas informações são obrigatórias.
     *
     * Nos outros tipos permanecem opcionais,
     * pois também podem representar a embalagem
     * utilizada no cálculo do frete.
     */

    const religiousImage =
      productType ===
      "RELIGIOUS_IMAGE";

    const weight =
      parseDecimal(
        body.weight,
        {
          required:
            religiousImage,
          minimum:
            religiousImage
              ? 0.001
              : 0,
          maximum:
            100_000,
          label: "Peso",
        }
      );

    const height =
      parseDecimal(
        body.height,
        {
          required:
            religiousImage,
          minimum:
            religiousImage
              ? 0.01
              : 0,
          maximum:
            100_000,
          label: "Altura",
        }
      );

    const width =
      parseDecimal(
        body.width,
        {
          required:
            religiousImage,
          minimum:
            religiousImage
              ? 0.01
              : 0,
          maximum:
            100_000,
          label: "Largura",
        }
      );

    const length =
      parseDecimal(
        body.length,
        {
          required:
            religiousImage,
          minimum:
            religiousImage
              ? 0.01
              : 0,
          maximum:
            100_000,
          label: "Comprimento",
        }
      );

    /*
     * =====================================================
     * SEO E EXIBIÇÃO
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
     */

    const imageInputs =
      parseImages(
        body.images
      );

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
     * SLUG E SKU
     * =====================================================
     */

    const slug =
      await createAvailableSlug(
        name
      );

    const sku =
      await generateProductSku();

    /*
     * =====================================================
     * CADASTRO
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
                   * Compatibilidade com a loja atual.
                   */
                  image:
                    primaryImage.url,

                  religion:
                    religions[0],

                  religions,

                  category,

                  productType,

                  materialComposition:
                    clothing &&
                    materialComposition
                      ? materialComposition
                      : null,

                  /*
                   * Para vestuário, stock é a soma
                   * dos estoques dos tamanhos.
                   */
                  stock,

                  minimumStock,

                  weight:
                    decimalToDatabase(
                      weight,
                      3
                    ),

                  height:
                    decimalToDatabase(
                      height
                    ),

                  width:
                    decimalToDatabase(
                      width
                    ),

                  length:
                    decimalToDatabase(
                      length
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

                  variants:
                    clothing
                      ? {
                          create:
                            variants.map(
                              (
                                variant
                              ) => ({
                                size:
                                  variant.size,

                                sku:
                                  `${sku}-${variant.size}`,

                                stock:
                                  variant.stock,

                                minimumStock:
                                  variant.minimumStock,

                                active:
                                  true,

                                pieceLength:
                                  decimalToDatabase(
                                    variant.pieceLength
                                  ),

                                sleeveLength:
                                  decimalToDatabase(
                                    variant.sleeveLength
                                  ),

                                shoulderWidth:
                                  decimalToDatabase(
                                    variant.shoulderWidth
                                  ),

                                chestCircumference:
                                  decimalToDatabase(
                                    variant.chestCircumference
                                  ),

                                waistCircumference:
                                  decimalToDatabase(
                                    variant.waistCircumference
                                  ),

                                hipCircumference:
                                  decimalToDatabase(
                                    variant.hipCircumference
                                  ),

                                thighCircumference:
                                  decimalToDatabase(
                                    variant.thighCircumference
                                  ),

                                inseamLength:
                                  decimalToDatabase(
                                    variant.inseamLength
                                  ),

                                bodyChestMinimum:
                                  decimalToDatabase(
                                    variant.bodyChestMinimum
                                  ),

                                bodyChestMaximum:
                                  decimalToDatabase(
                                    variant.bodyChestMaximum
                                  ),

                                bodyWaistMinimum:
                                  decimalToDatabase(
                                    variant.bodyWaistMinimum
                                  ),

                                bodyWaistMaximum:
                                  decimalToDatabase(
                                    variant.bodyWaistMaximum
                                  ),

                                bodyHipMinimum:
                                  decimalToDatabase(
                                    variant.bodyHipMinimum
                                  ),

                                bodyHipMaximum:
                                  decimalToDatabase(
                                    variant.bodyHipMaximum
                                  ),
                              })
                            ),
                        }
                      : undefined,
                },

                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  productType:
                    true,
                  active: true,
                  stock: true,
                  createdAt:
                    true,

                  variants: {
                    orderBy: {
                      createdAt:
                        "asc",
                    },

                    select: {
                      id: true,
                      size: true,
                      sku: true,
                      stock: true,
                      minimumStock:
                        true,
                    },
                  },
                },
              });

            /*
             * A movimentação inicial utiliza o
             * estoque total do produto.
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
                    clothing
                      ? "Estoque inicial das variações"
                      : "Estoque inicial do produto",

                  note:
                    clothing
                      ? "Saldo total calculado a partir dos tamanhos cadastrados."
                      : "Saldo informado durante o cadastro do produto.",
                },
              });
            }

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

                  productType,

                  stock,

                  variants:
                    variants.map(
                      (
                        variant
                      ) => ({
                        size:
                          variant.size,

                        stock:
                          variant.stock,

                        minimumStock:
                          variant.minimumStock,
                      })
                    ),

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
       * Se o banco falhar depois do upload,
       * remove as imagens recém-enviadas.
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
        success: true,
        product,
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
            "Já existe um produto utilizando estes dados.",
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

    /*
     * Não exibe dados sensíveis, corpo da
     * requisição ou credenciais no log.
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

function parseBodyMeasurementRange({
  data,
  minimumField,
  maximumField,
  label,
  size,
}: {
  data: Record<string, unknown>;
  minimumField: string;
  maximumField: string;
  label: string;
  size: string;
}) {
  const minimum =
    parseVariantMeasurement(
      data,
      minimumField,
      `${label} mínima do tamanho ${size}`
    );

  const maximum =
    parseVariantMeasurement(
      data,
      maximumField,
      `${label} máxima do tamanho ${size}`
    );

  if (
    minimum === null ||
    maximum === null
  ) {
    throw new ValidationError(
      `Informe a faixa de ${label.toLowerCase()} do tamanho ${size}.`
    );
  }

  if (maximum < minimum) {
    throw new ValidationError(
      `${label} máxima do tamanho ${size} não pode ser menor que a mínima.`
    );
  }

  return {
    minimum,
    maximum,
  };
}