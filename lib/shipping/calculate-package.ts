import "server-only";

import {
  prisma,
} from "@/lib/prisma";

import {
  getMelhorEnvioConfig,
} from "@/lib/shipping/melhor-envio-config";

/*
 * =========================================================
 * TIPOS PÚBLICOS
 * =========================================================
 */

export type ShippingCartItemInput = {
  productId:
    string;

  quantity:
    number;
};

export type MelhorEnvioShippingProduct = {
  id: string;

  width: number;
  height: number;
  length: number;
  weight: number;

  insurance_value:
    number;

  quantity:
    number;
};

export type CalculatedShippingPackage = {
  products:
    MelhorEnvioShippingProduct[];

  subtotal:
    number;

  totalQuantity:
    number;

  totalWeight:
    number;

  freeShipping:
    boolean;

  freeShippingMinimum:
    number;
};

/*
 * =========================================================
 * ERROS
 * =========================================================
 */

export type ShippingPackageErrorCode =
  | "INVALID_CART"
  | "TOO_MANY_PRODUCTS"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "INVALID_PRODUCT_DIMENSIONS"
  | "INVALID_PRODUCT_WEIGHT"
  | "INVALID_PRODUCT_PRICE";

export class ShippingPackageError extends Error {
  readonly code:
    ShippingPackageErrorCode;

  readonly status:
    number;

  constructor({
    message,
    code,
    status = 400,
  }: {
    message: string;
    code:
      ShippingPackageErrorCode;
    status?:
      number;
  }) {
    super(
      message
    );

    this.name =
      "ShippingPackageError";

    this.code =
      code;

    this.status =
      status;
  }
}

/*
 * =========================================================
 * LIMITES
 * =========================================================
 */

const MAXIMUM_DISTINCT_PRODUCTS =
  50;

const MAXIMUM_QUANTITY_PER_PRODUCT =
  99;

const MAXIMUM_TOTAL_QUANTITY =
  200;

const MAXIMUM_PRODUCT_WEIGHT_KG =
  1_000;

const MAXIMUM_DIMENSION_CM =
  1_000;

const MAXIMUM_PRODUCT_PRICE =
  10_000_000;

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function roundMoney(
  value: number
) {
  return Number(
    value.toFixed(
      2
    )
  );
}

function roundMeasurement(
  value: number,
  decimalPlaces = 3
) {
  return Number(
    value.toFixed(
      decimalPlaces
    )
  );
}

function isValidProductId(
  value: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    value
  );
}

/*
 * =========================================================
 * NORMALIZAR CARRINHO
 * =========================================================
 */

function normalizeCartItems(
  items:
    ShippingCartItemInput[]
) {
  if (
    !Array.isArray(
      items
    ) ||
    items.length ===
      0 ||
    items.length >
      MAXIMUM_DISTINCT_PRODUCTS
  ) {
    throw new ShippingPackageError({
      message:
        "O carrinho informado é inválido.",

      code:
        items.length >
        MAXIMUM_DISTINCT_PRODUCTS
          ? "TOO_MANY_PRODUCTS"
          : "INVALID_CART",
    });
  }

  /*
   * Produtos repetidos são consolidados.
   */
  const quantityByProduct =
    new Map<
      string,
      number
    >();

  for (
    const item of
    items
  ) {
    if (
      typeof item !==
        "object" ||
      item === null ||
      typeof item.productId !==
        "string" ||
      !isValidProductId(
        item.productId
      ) ||
      !Number.isInteger(
        item.quantity
      ) ||
      item.quantity < 1 ||
      item.quantity >
        MAXIMUM_QUANTITY_PER_PRODUCT
    ) {
      throw new ShippingPackageError({
        message:
          "O carrinho informado é inválido.",

        code:
          "INVALID_CART",
      });
    }

    const currentQuantity =
      quantityByProduct.get(
        item.productId
      ) ?? 0;

    const nextQuantity =
      currentQuantity +
      item.quantity;

    if (
      nextQuantity >
      MAXIMUM_QUANTITY_PER_PRODUCT
    ) {
      throw new ShippingPackageError({
        message:
          "A quantidade de um produto é inválida.",

        code:
          "INVALID_CART",
      });
    }

    quantityByProduct.set(
      item.productId,
      nextQuantity
    );
  }

  const normalizedItems =
    Array.from(
      quantityByProduct,
      (
        [
          productId,
          quantity,
        ]
      ) => ({
        productId,
        quantity,
      })
    );

  const totalQuantity =
    normalizedItems.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  if (
    totalQuantity >
    MAXIMUM_TOTAL_QUANTITY
  ) {
    throw new ShippingPackageError({
      message:
        "O carrinho possui produtos demais para uma única cotação.",

      code:
        "TOO_MANY_PRODUCTS",
    });
  }

  return normalizedItems;
}

/*
 * =========================================================
 * NÚMEROS DO BANCO
 * =========================================================
 */

function getRequiredPositiveNumber({
  value,
  maximum,
  errorCode,
  errorMessage,
  decimalPlaces = 3,
}: {
  value: unknown;
  maximum:
    number;
  errorCode:
    ShippingPackageErrorCode;
  errorMessage:
    string;
  decimalPlaces?:
    number;
}) {
  const numberValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numberValue
    ) ||
    numberValue <= 0 ||
    numberValue >
      maximum
  ) {
    throw new ShippingPackageError({
      message:
        errorMessage,

      code:
        errorCode,

      status:
        409,
    });
  }

  return roundMeasurement(
    numberValue,
    decimalPlaces
  );
}

/*
 * =========================================================
 * PREÇO ATUAL
 * =========================================================
 */

function getCurrentProductPrice({
  price,
  salePrice,
}: {
  price: unknown;
  salePrice:
    unknown;
}) {
  const regularPrice =
    Number(
      price
    );

  const promotionalPrice =
    salePrice ===
      null ||
    salePrice ===
      undefined
      ? null
      : Number(
          salePrice
        );

  const currentPrice =
    promotionalPrice !==
        null &&
    Number.isFinite(
      promotionalPrice
    ) &&
    promotionalPrice >
      0 &&
    promotionalPrice <
      regularPrice
      ? promotionalPrice
      : regularPrice;

  if (
    !Number.isFinite(
      currentPrice
    ) ||
    currentPrice <= 0 ||
    currentPrice >
      MAXIMUM_PRODUCT_PRICE
  ) {
    throw new ShippingPackageError({
      message:
        "Um produto do carrinho possui preço inválido.",

      code:
        "INVALID_PRODUCT_PRICE",

      status:
        409,
    });
  }

  return roundMoney(
    currentPrice
  );
}

/*
 * =========================================================
 * CALCULAR PACOTE
 * =========================================================
 *
 * O navegador envia somente:
 *
 * - productId;
 * - quantity.
 *
 * Nome, preço, estoque, peso e dimensões
 * são consultados exclusivamente no banco.
 */

export async function calculateShippingPackage(
  inputItems:
    ShippingCartItemInput[]
): Promise<CalculatedShippingPackage> {
  const items =
    normalizeCartItems(
      inputItems
    );

  const productIds =
    items.map(
      (item) =>
        item.productId
    );

  /*
   * Somente produtos públicos e não arquivados
   * podem participar de uma cotação.
   */
  const databaseProducts =
    await prisma.product.findMany({
      where: {
        id: {
          in:
            productIds,
        },

        active:
          true,

        archivedAt:
          null,
      },

      select: {
        id: true,

        price:
          true,

        salePrice:
          true,

        stock:
          true,

        weight:
          true,

        height:
          true,

        width:
          true,

        length:
          true,
      },
    });

  /*
   * Não revelamos qual ID está inexistente,
   * arquivado ou desativado.
   */
  if (
    databaseProducts.length !==
    productIds.length
  ) {
    throw new ShippingPackageError({
      message:
        "Um ou mais produtos não estão disponíveis.",

      code:
        "PRODUCT_UNAVAILABLE",

      status:
        409,
    });
  }

  const productById =
    new Map(
      databaseProducts.map(
        (product) => [
          product.id,
          product,
        ]
      )
    );

  const shippingProducts:
    MelhorEnvioShippingProduct[] =
    [];

  let subtotal =
    0;

  let totalQuantity =
    0;

  let totalWeight =
    0;

  for (
    const item of
    items
  ) {
    const product =
      productById.get(
        item.productId
      );

    if (!product) {
      throw new ShippingPackageError({
        message:
          "Um ou mais produtos não estão disponíveis.",

        code:
          "PRODUCT_UNAVAILABLE",

        status:
          409,
      });
    }

    /*
     * Estoque é validado no servidor.
     */
    if (
      !Number.isInteger(
        product.stock
      ) ||
      product.stock <
        item.quantity
    ) {
      throw new ShippingPackageError({
        message:
          "Um ou mais produtos não possuem estoque suficiente.",

        code:
          "INSUFFICIENT_STOCK",

        status:
          409,
      });
    }

    const currentPrice =
      getCurrentProductPrice({
        price:
          product.price,

        salePrice:
          product.salePrice,
      });

    const weight =
      getRequiredPositiveNumber({
        value:
          product.weight,

        maximum:
          MAXIMUM_PRODUCT_WEIGHT_KG,

        errorCode:
          "INVALID_PRODUCT_WEIGHT",

        errorMessage:
          "Um produto não possui peso válido para o cálculo do frete.",

        decimalPlaces:
          3,
      });

    const height =
      getRequiredPositiveNumber({
        value:
          product.height,

        maximum:
          MAXIMUM_DIMENSION_CM,

        errorCode:
          "INVALID_PRODUCT_DIMENSIONS",

        errorMessage:
          "Um produto não possui dimensões válidas para o cálculo do frete.",

        decimalPlaces:
          2,
      });

    const width =
      getRequiredPositiveNumber({
        value:
          product.width,

        maximum:
          MAXIMUM_DIMENSION_CM,

        errorCode:
          "INVALID_PRODUCT_DIMENSIONS",

        errorMessage:
          "Um produto não possui dimensões válidas para o cálculo do frete.",

        decimalPlaces:
          2,
      });

    const length =
      getRequiredPositiveNumber({
        value:
          product.length,

        maximum:
          MAXIMUM_DIMENSION_CM,

        errorCode:
          "INVALID_PRODUCT_DIMENSIONS",

        errorMessage:
          "Um produto não possui dimensões válidas para o cálculo do frete.",

        decimalPlaces:
          2,
      });

    shippingProducts.push({
      id:
        product.id,

      width,
      height,
      length,
      weight,

      insurance_value:
        currentPrice,

      quantity:
        item.quantity,
    });

    subtotal +=
      currentPrice *
      item.quantity;

    totalQuantity +=
      item.quantity;

    totalWeight +=
      weight *
      item.quantity;
  }

  const normalizedSubtotal =
    roundMoney(
      subtotal
    );

  const normalizedTotalWeight =
    roundMeasurement(
      totalWeight,
      3
    );

  const config =
    getMelhorEnvioConfig();

  /*
   * A decisão do frete grátis é feita com
   * o subtotal verdadeiro do banco.
   */
  const freeShipping =
    config.freeShippingMinimum >
      0 &&
    normalizedSubtotal >=
      config.freeShippingMinimum;

  return {
    products:
      shippingProducts,

    subtotal:
      normalizedSubtotal,

    totalQuantity,

    totalWeight:
      normalizedTotalWeight,

    freeShipping,

    freeShippingMinimum:
      config.freeShippingMinimum,
  };
}