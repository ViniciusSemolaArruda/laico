import "server-only";

import {
  calculateShippingPackage,
  type ShippingCartItemInput,
} from "@/lib/shipping/calculate-package";

import {
  melhorEnvioRequest,
} from "@/lib/shipping/melhor-envio-client";

import {
  getMelhorEnvioConfig,
} from "@/lib/shipping/melhor-envio-config";

/*
 * =========================================================
 * TIPOS PÚBLICOS
 * =========================================================
 */

export type ShippingQuoteOption = {
  serviceId:
    string;

  serviceName:
    string;

  companyId:
    string | null;

  companyName:
    string;

  providerPrice:
    number;

  customerPrice:
    number;

  discount:
    number;

  deliveryTime:
    number;

  deliveryRange: {
    minimum:
      number;

    maximum:
      number;
  };

  currency:
    "BRL";

  freeShipping:
    boolean;
};

export type ShippingQuoteResult = {
  originCep:
    string;

  destinationCep:
    string;

  subtotal:
    number;

  totalQuantity:
    number;

  totalWeight:
    number;

  freeShippingEligible:
    boolean;

  freeShippingMinimum:
    number;

  freeShippingDiscount:
    number;

  options:
    ShippingQuoteOption[];

  quotedAt:
    string;

  expiresAt:
    string;
};

/*
 * =========================================================
 * RESPOSTA DO MELHOR ENVIO
 * =========================================================
 */

type MelhorEnvioQuoteItem = {
  id?: unknown;
  name?: unknown;

  price?: unknown;
  custom_price?:
    unknown;

  delivery_time?:
    unknown;

  custom_delivery_time?:
    unknown;

  delivery_range?: {
    min?: unknown;
    max?: unknown;
  } | null;

  custom_delivery_range?: {
    min?: unknown;
    max?: unknown;
  } | null;

  company?: {
    id?: unknown;
    name?: unknown;
  } | null;

  error?: unknown;
};

/*
 * =========================================================
 * ERROS
 * =========================================================
 */

export type ShippingQuoteErrorCode =
  | "INVALID_DESTINATION_CEP"
  | "NO_SHIPPING_OPTIONS"
  | "INVALID_PROVIDER_RESPONSE";

export class ShippingQuoteError extends Error {
  readonly code:
    ShippingQuoteErrorCode;

  readonly status:
    number;

  constructor({
    message,
    code,
    status = 400,
  }: {
    message: string;
    code:
      ShippingQuoteErrorCode;
    status?:
      number;
  }) {
    super(
      message
    );

    this.name =
      "ShippingQuoteError";

    this.code =
      code;

    this.status =
      status;
  }
}

/*
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

const QUOTE_VALIDITY_MS =
  15 *
  60 *
  1000;

const MAXIMUM_SHIPPING_PRICE =
  100_000;

const MAXIMUM_DELIVERY_DAYS =
  365;

/*
 * =========================================================
 * CEP
 * =========================================================
 */

function normalizeDestinationCep(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    throw new ShippingQuoteError({
      message:
        "Informe um CEP de destino válido.",

      code:
        "INVALID_DESTINATION_CEP",
    });
  }

  const digits =
    value.replace(
      /\D/g,
      ""
    );

  if (
    digits.length !==
      8 ||
    /^(\d)\1{7}$/.test(
      digits
    )
  ) {
    throw new ShippingQuoteError({
      message:
        "Informe um CEP de destino válido.",

      code:
        "INVALID_DESTINATION_CEP",
    });
  }

  return digits;
}

/*
 * =========================================================
 * NÚMEROS
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

function getPositivePrice(
  value: unknown
) {
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
      MAXIMUM_SHIPPING_PRICE
  ) {
    return null;
  }

  return roundMoney(
    numberValue
  );
}

function getDeliveryDays(
  value: unknown
) {
  const numberValue =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numberValue
    ) ||
    !Number.isInteger(
      numberValue
    ) ||
    numberValue < 0 ||
    numberValue >
      MAXIMUM_DELIVERY_DAYS
  ) {
    return null;
  }

  return numberValue;
}

/*
 * =========================================================
 * TEXTOS
 * =========================================================
 */

function normalizeProviderText(
  value: unknown,
  fallback: string,
  maximumLength = 120
) {
  if (
    typeof value !==
    "string"
  ) {
    return fallback;
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        maximumLength
      );

  return (
    normalized ||
    fallback
  );
}

function normalizeIdentifier(
  value: unknown
) {
  if (
    typeof value !==
      "string" &&
    typeof value !==
      "number"
  ) {
    return null;
  }

  const normalized =
    String(
      value
    )
      .trim()
      .slice(
        0,
        100
      );

  if (
    !normalized ||
    !/^[a-zA-Z0-9_-]+$/.test(
      normalized
    )
  ) {
    return null;
  }

  return normalized;
}

/*
 * =========================================================
 * NORMALIZAR OPÇÕES
 * =========================================================
 */

function normalizeQuoteOptions(
  response: unknown
) {
  if (
    !Array.isArray(
      response
    )
  ) {
    throw new ShippingQuoteError({
      message:
        "O serviço de frete retornou uma resposta inválida.",

      code:
        "INVALID_PROVIDER_RESPONSE",

      status:
        502,
    });
  }

  const options:
    Array<
      Omit<
        ShippingQuoteOption,
        | "customerPrice"
        | "discount"
        | "freeShipping"
      >
    > = [];

  const usedServiceIds =
    new Set<
      string
    >();

  for (
    const rawItem of
    response
  ) {
    if (
      typeof rawItem !==
        "object" ||
      rawItem === null
    ) {
      continue;
    }

    const item =
      rawItem as MelhorEnvioQuoteItem;

    /*
     * O Melhor Envio pode devolver um item com
     * a propriedade error para um serviço
     * indisponível. Esses itens são ignorados.
     */
    if (item.error) {
  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    console.error(
      "Serviço de frete recusado:",
      {
        id:
          item.id,

        name:
          item.name,

        error:
          typeof item.error ===
          "string"
            ? item.error
              .trim()
              .slice(
                0,
                300
              )
            : "Erro não informado",
      }
    );
  }

  continue;
}

    const serviceId =
      normalizeIdentifier(
        item.id
      );

    if (
      !serviceId ||
      usedServiceIds.has(
        serviceId
      )
    ) {
      continue;
    }

    /*
     * custom_price pode incluir configurações
     * comerciais cadastradas no Melhor Envio.
     */
    const providerPrice =
      getPositivePrice(
        item.custom_price
      ) ??
      getPositivePrice(
        item.price
      );

    if (
      providerPrice ===
      null
    ) {
      continue;
    }

    const deliveryTime =
      getDeliveryDays(
        item
          .custom_delivery_time
      ) ??
      getDeliveryDays(
        item.delivery_time
      );

    if (
      deliveryTime ===
      null
    ) {
      continue;
    }

    const selectedRange =
      item
        .custom_delivery_range ??
      item
        .delivery_range;

    const minimumDelivery =
      getDeliveryDays(
        selectedRange?.min
      ) ??
      deliveryTime;

    const maximumDelivery =
      getDeliveryDays(
        selectedRange?.max
      ) ??
      deliveryTime;

    const companyId =
      normalizeIdentifier(
        item.company?.id
      );

    const companyName =
      normalizeProviderText(
        item.company?.name,
        "Transportadora"
      );

    const serviceName =
      normalizeProviderText(
        item.name,
        "Serviço de entrega"
      );

    usedServiceIds.add(
      serviceId
    );

    options.push({
      serviceId,
      serviceName,
      companyId,
      companyName,

      providerPrice,

      deliveryTime,

      deliveryRange: {
        minimum:
          Math.min(
            minimumDelivery,
            maximumDelivery
          ),

        maximum:
          Math.max(
            minimumDelivery,
            maximumDelivery
          ),
      },

      currency:
        "BRL",
    });
  }

  if (
    options.length ===
    0
  ) {
    throw new ShippingQuoteError({
      message:
        "Nenhuma opção de entrega está disponível para o CEP informado.",

      code:
        "NO_SHIPPING_OPTIONS",

      status:
        422,
    });
  }

  return options;
}

/*
 * =========================================================
 * REGRA DE FRETE GRÁTIS
 * =========================================================
 *
 * Quando o carrinho atinge o limite:
 *
 * - o serviço mais barato fica gratuito;
 * - serviços mais caros recebem o mesmo desconto;
 * - o cliente paga somente a diferença.
 *
 * Exemplo:
 *
 * PAC:   R$ 25,00 → grátis
 * SEDEX: R$ 40,00 → cliente paga R$ 15,00
 *
 * Assim a loja não precisa oferecer gratuitamente
 * a modalidade expressa mais cara.
 */

function applyFreeShippingRule({
  options,
  freeShippingEligible,
}: {
  options:
    Array<
      Omit<
        ShippingQuoteOption,
        | "customerPrice"
        | "discount"
        | "freeShipping"
      >
    >;

  freeShippingEligible:
    boolean;
}) {
  const cheapestPrice =
    Math.min(
      ...options.map(
        (option) =>
          option.providerPrice
      )
    );

  const freeShippingDiscount =
    freeShippingEligible
      ? cheapestPrice
      : 0;

  const normalizedOptions:
    ShippingQuoteOption[] =
    options.map(
      (option) => {
        const discount =
          freeShippingEligible
            ? Math.min(
                option.providerPrice,
                freeShippingDiscount
              )
            : 0;

        const customerPrice =
          roundMoney(
            Math.max(
              0,
              option.providerPrice -
                discount
            )
          );

        return {
          ...option,

          customerPrice,

          discount:
            roundMoney(
              discount
            ),

          freeShipping:
            customerPrice ===
              0 &&
            freeShippingEligible,
        };
      }
    );

  normalizedOptions.sort(
    (
      first,
      second
    ) => {
      if (
        first.customerPrice !==
        second.customerPrice
      ) {
        return (
          first.customerPrice -
          second.customerPrice
        );
      }

      return (
        first.deliveryTime -
        second.deliveryTime
      );
    }
  );

  return {
    options:
      normalizedOptions,

    freeShippingDiscount:
      roundMoney(
        freeShippingDiscount
      ),
  };
}

/*
 * =========================================================
 * COTAÇÃO
 * =========================================================
 */

export async function calculateMelhorEnvioQuote({
  destinationCep,
  items,
}: {
  destinationCep:
    string;

  items:
    ShippingCartItemInput[];
}): Promise<ShippingQuoteResult> {
  const normalizedDestinationCep =
    normalizeDestinationCep(
      destinationCep
    );

  const calculatedPackage =
    await calculateShippingPackage(
      items
    );

  const config =
    getMelhorEnvioConfig();

  /*
   * O Melhor Envio recebe os produtos unitários
   * e realiza a organização dos volumes.
   */
  const providerResponse =
    await melhorEnvioRequest<
      unknown
    >(
      "/me/shipment/calculate",
      {
        method:
          "POST",

        body: {
  from: {
    postal_code:
      config.originCep,
  },

  to: {
    postal_code:
      normalizedDestinationCep,
  },

  /*
   * 1 = PAC
   * 2 = SEDEX
   * 3 = Jadlog .Package
   * 4 = Jadlog .Com
   */
  services:
    "1,2,3,4",

  products:
    calculatedPackage.products,

  options: {
    receipt:
      false,

    own_hand:
      false,

    collect:
      false,

    use_own_contract:
      false,
  },
},
      }
    );

  const providerOptions =
    normalizeQuoteOptions(
      providerResponse
    );

  const {
    options,
    freeShippingDiscount,
  } =
    applyFreeShippingRule({
      options:
        providerOptions,

      freeShippingEligible:
        calculatedPackage
          .freeShipping,
    });

  const quotedAt =
    new Date();

  const expiresAt =
    new Date(
      quotedAt.getTime() +
        QUOTE_VALIDITY_MS
    );

  return {
    originCep:
      config.originCep,

    destinationCep:
      normalizedDestinationCep,

    subtotal:
      calculatedPackage
        .subtotal,

    totalQuantity:
      calculatedPackage
        .totalQuantity,

    totalWeight:
      calculatedPackage
        .totalWeight,

    freeShippingEligible:
      calculatedPackage
        .freeShipping,

    freeShippingMinimum:
      calculatedPackage
        .freeShippingMinimum,

    freeShippingDiscount,

    options,

    quotedAt:
      quotedAt.toISOString(),

    expiresAt:
      expiresAt.toISOString(),
  };
}