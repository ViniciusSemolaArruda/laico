import {
  NextResponse,
} from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  ShippingPackageError,
  type ShippingCartItemInput,
} from "@/lib/shipping/calculate-package";

import {
  MelhorEnvioApiError,
} from "@/lib/shipping/melhor-envio-client";

import {
  calculateMelhorEnvioQuote,
  ShippingQuoteError,
} from "@/lib/shipping/melhor-envio-quote";

export const dynamic =
  "force-dynamic";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type QuoteRequestBody = {
  destinationCep?:
    unknown;

  items?:
    unknown;
};

/*
 * =========================================================
 * CONSTANTES
 * =========================================================
 */

const MAXIMUM_REQUEST_SIZE =
  20_000;

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

/*
 * =========================================================
 * JSON
 * =========================================================
 */

function jsonResponse(
  body: Record<
    string,
    unknown
  >,
  status = 200,
  headers?: Record<
    string,
    string
  >
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

        "Referrer-Policy":
          "no-referrer",

        ...headers,
      },
    }
  );
}

/*
 * =========================================================
 * ORIGEM
 * =========================================================
 */

function isAllowedOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  const fetchSite =
    request.headers.get(
      "sec-fetch-site"
    );

  if (
    !origin
  ) {
    return (
      !fetchSite ||
      fetchSite ===
        "same-origin" ||
      fetchSite ===
        "same-site" ||
      fetchSite ===
        "none"
    );
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

/*
 * =========================================================
 * CARRINHO
 * =========================================================
 */

function normalizeItems(
  value: unknown
): ShippingCartItemInput[] {
  if (
    !Array.isArray(
      value
    )
  ) {
    throw new ShippingPackageError({
      message:
        "O carrinho informado é inválido.",

      code:
        "INVALID_CART",
    });
  }

  return value.map(
    (item) => {
      if (
        typeof item !==
          "object" ||
        item === null
      ) {
        throw new ShippingPackageError({
          message:
            "O carrinho informado é inválido.",

          code:
            "INVALID_CART",
        });
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      return {
        productId:
          typeof record.productId ===
            "string"
            ? record.productId
            : "",

        quantity:
          Number(
            record.quantity
          ),
      };
    }
  );
}

/*
 * =========================================================
 * POST
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
            "Formato da solicitação inválido.",
        },
        415
      );
    }

    /*
     * =====================================================
     * TAMANHO
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
        MAXIMUM_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "A solicitação é muito grande.",
        },
        413
      );
    }

    /*
     * =====================================================
     * RATE LIMIT
     * =====================================================
     */

    const clientIp =
      getClientIp(
        request
      );

    const rateLimit =
      await consumeRateLimit({
        scope:
          "shipping-quote-ip",

        identifier:
          clientIp,

        limit:
          30,

        windowMs:
          10 *
          60 *
          1000,

        blockMs:
          15 *
          60 *
          1000,
      });

    if (
      !rateLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas consultas de frete. Aguarde alguns minutos e tente novamente.",
        },
        429,
        {
          "Retry-After":
            String(
              rateLimit
                .retryAfterSeconds
            ),
        }
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
        MAXIMUM_REQUEST_SIZE
    ) {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        rawBody.length >
          MAXIMUM_REQUEST_SIZE
          ? 413
          : 400
      );
    }

    let body:
      QuoteRequestBody;

    try {
      body =
        JSON.parse(
          rawBody
        ) as QuoteRequestBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    const destinationCep =
      typeof body.destinationCep ===
        "string"
        ? body.destinationCep
        : "";

    const items =
      normalizeItems(
        body.items
      );

    /*
     * =====================================================
     * COTAÇÃO SEGURA
     * =====================================================
     *
     * A função consulta novamente no banco:
     *
     * - preço;
     * - preço promocional;
     * - estoque;
     * - peso;
     * - dimensões;
     * - status;
     * - arquivamento.
     */

    const quote =
      await calculateMelhorEnvioQuote({
        destinationCep,
        items,
      });

    /*
     * O CEP de origem e detalhes internos do pacote
     * não precisam ser enviados ao navegador.
     */
    return jsonResponse({
      success:
        true,

      quote: {
        destinationCep:
          quote.destinationCep,

        subtotal:
          quote.subtotal,

        totalQuantity:
          quote.totalQuantity,

        freeShippingEligible:
          quote.freeShippingEligible,

        freeShippingMinimum:
          quote.freeShippingMinimum,

        freeShippingDiscount:
          quote.freeShippingDiscount,

        options:
          quote.options.map(
            (option) => ({
              serviceId:
                option.serviceId,

              serviceName:
                option.serviceName,

              companyId:
                option.companyId,

              companyName:
                option.companyName,

              customerPrice:
                option.customerPrice,

              deliveryTime:
                option.deliveryTime,

              deliveryRange:
                option.deliveryRange,

              currency:
                option.currency,

              freeShipping:
                option.freeShipping,
            })
          ),

        quotedAt:
          quote.quotedAt,

        expiresAt:
          quote.expiresAt,
      },
    });
  } catch (error) {
    /*
     * =====================================================
     * ERROS DO CARRINHO
     * =====================================================
     */

    if (
      error instanceof
      ShippingPackageError
    ) {
      return jsonResponse(
        {
          error:
            error.message,

          code:
            error.code,
        },
        error.status
      );
    }

    /*
     * =====================================================
     * ERROS DA COTAÇÃO
     * =====================================================
     */

    if (
      error instanceof
      ShippingQuoteError
    ) {
      return jsonResponse(
        {
          error:
            error.message,

          code:
            error.code,
        },
        error.status
      );
    }

    /*
     * =====================================================
     * ERROS DO PROVEDOR
     * =====================================================
     */

    if (
      error instanceof
      MelhorEnvioApiError
    ) {
      /*
       * Não revelamos ao navegador detalhes sobre:
       *
       * - autorização;
       * - tokens;
       * - conta conectada;
       * - payload externo.
       */
      const publicStatus =
        error.status ===
          429
          ? 429
          : error.status >=
                400 &&
              error.status <
                500
            ? 422
            : 502;

      return jsonResponse(
        {
          error:
            error.status ===
              429
              ? "Muitas consultas de frete. Tente novamente em alguns minutos."
              : "Não foi possível calcular o frete agora.",

          code:
            "SHIPPING_PROVIDER_ERROR",
        },
        publicStatus
      );
    }

    /*
     * Nunca registramos:
     *
     * - CEP;
     * - IP;
     * - carrinho;
     * - dimensões;
     * - token;
     * - resposta externa;
     * - credenciais.
     */
    console.error(
      "Erro ao calcular frete:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return jsonResponse(
      {
        error:
          "Não foi possível calcular o frete agora.",
      },
      500
    );
  }
}