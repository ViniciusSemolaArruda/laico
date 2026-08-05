import {
  createHash,
} from "node:crypto";

import {
  cookies,
} from "next/headers";

import {
  NextResponse,
} from "next/server";

import {
  MercadoPagoConfig,
  Order as MercadoPagoOrder,
} from "mercadopago";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

import {
  getOrderAccessCookieName,
  verifyOrderAccessToken,
} from "@/lib/order-access";

import {
  getPaymentExpirationDate,
} from "@/lib/payments/paymentExpiration";

import {
  prisma,
} from "@/lib/prisma";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type SelectedPayment =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "ticket";

type PaymentFormData = {
  token?: string;

  payment_method_id?:
    string;

  installments?:
    number | string;

  payer?: {
    email?: string;

    identification?: {
      type?: string;
      number?: string;
    };
  };
};

type PaymentRequestBody = {
  orderId?: string;

  paymentMethod?:
    SelectedPayment;

  formData?:
    PaymentFormData;
};

type MercadoPagoErrorItem = {
  code?: unknown;
  message?: unknown;
  description?: unknown;
  detail?: unknown;
};

type MercadoPagoErrorResult = {
  message: string;
  status: number;
};

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

const MAXIMUM_REQUEST_SIZE =
  20_000;

/*
 * =========================================================
 * RESPOSTA
 * =========================================================
 */

function jsonResponse(
  body: Record<string, unknown>,
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

/*
 * =========================================================
 * NORMALIZAÇÃO
 * =========================================================
 */

function normalizeText(
  value: unknown,
  maximumLength = 255
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

function normalizeDigits(
  value: unknown,
  maximumLength: number
) {
  return normalizeText(
    value,
    maximumLength + 20
  )
    .replace(/\D/g, "")
    .slice(
      0,
      maximumLength
    );
}

/*
 * =========================================================
 * SEGURANÇA HTTP
 * =========================================================
 */

function isSameOrigin(
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
      new URL(origin)
        .origin ===
      new URL(request.url)
        .origin
    );
  } catch {
    return false;
  }
}

function isValidOrderId(
  orderId: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    orderId
  );
}

/*
 * =========================================================
 * PAGAMENTO
 * =========================================================
 */

function isSelectedPayment(
  value: unknown
): value is SelectedPayment {
  return (
    value === "pix" ||
    value ===
      "credit_card" ||
    value ===
      "debit_card" ||
    value === "ticket"
  );
}

function isApprovedPaymentStatus(
  status:
    | string
    | null
    | undefined
) {
  const normalizedStatus =
    status?.toLowerCase();

  return (
    normalizedStatus ===
      "approved" ||
    normalizedStatus ===
      "processed" ||
    normalizedStatus ===
      "accredited"
  );
}

function isRejectedPaymentStatus(
  status:
    | string
    | null
    | undefined
) {
  const normalizedStatus =
    status?.toLowerCase();

  return (
    normalizedStatus ===
      "rejected" ||
    normalizedStatus ===
      "cancelled" ||
    normalizedStatus ===
      "canceled"
  );
}

function getDatabasePaymentStatus(
  status:
    | string
    | null
    | undefined
):
  | "APPROVED"
  | "REJECTED"
  | "PENDING" {
  if (
    isApprovedPaymentStatus(
      status
    )
  ) {
    return "APPROVED";
  }

  if (
    isRejectedPaymentStatus(
      status
    )
  ) {
    return "REJECTED";
  }

  return "PENDING";
}

function getPaymentMethodType(
  selectedPayment:
    SelectedPayment
) {
  switch (
    selectedPayment
  ) {
    case "credit_card":
      return "credit_card";

    case "debit_card":
      return "debit_card";

    case "ticket":
      return "ticket";

    case "pix":
      return "bank_transfer";
  }
}

/*
 * =========================================================
 * IDEMPOTÊNCIA
 * =========================================================
 */

function createIdempotencyKey({
  orderId,
  paymentMethodId,
  token,
}: {
  orderId: string;
  paymentMethodId: string;
  token?: string;
}) {
  /*
   * O token do cartão nunca é armazenado.
   *
   * Ele é utilizado somente como entrada para
   * este hash de idempotência.
   */
  return createHash(
    "sha256"
  )
    .update(
      [
        orderId,
        paymentMethodId,
        token ||
          "payment-without-token",
      ].join(":")
    )
    .digest("hex");
}

/*
 * =========================================================
 * ERROS DO MERCADO PAGO
 * =========================================================
 */

function getFirstErrorItem(
  value: unknown
): MercadoPagoErrorItem | null {
  if (
    Array.isArray(
      value
    ) &&
    value.length > 0 &&
    typeof value[0] ===
      "object" &&
    value[0] !== null
  ) {
    return value[0] as MercadoPagoErrorItem;
  }

  if (
    typeof value ===
      "object" &&
    value !== null
  ) {
    return value as MercadoPagoErrorItem;
  }

  return null;
}

function getMercadoPagoError(
  error: unknown
): MercadoPagoErrorResult {
  if (
    typeof error !==
      "object" ||
    error === null
  ) {
    return {
      message:
        typeof error ===
          "string" &&
        error.trim()
          ? error
          : "Erro desconhecido.",

      status: 500,
    };
  }

  const data =
    error as {
      message?: unknown;
      error?: unknown;
      status?: unknown;
      statusCode?: unknown;
      cause?: unknown;
      errors?: unknown;

      response?: {
        status?: unknown;
        data?: unknown;
      };
    };

  const responseData =
    typeof data.response
      ?.data === "object" &&
    data.response.data !==
      null
      ? (data.response
          .data as {
          message?: unknown;
          error?: unknown;
          status?: unknown;
          cause?: unknown;
          errors?: unknown;
        })
      : null;

  const firstCause =
    getFirstErrorItem(
      data.cause
    ) ||
    getFirstErrorItem(
      responseData?.cause
    );

  const firstError =
    getFirstErrorItem(
      data.errors
    ) ||
    getFirstErrorItem(
      responseData?.errors
    );

  const possibleMessages:
    unknown[] = [
    data.message,
    data.error,
    responseData?.message,
    responseData?.error,
    firstError?.message,
    firstError?.description,
    firstError?.detail,
    firstCause?.message,
    firstCause?.description,
    firstCause?.detail,
  ];

  const message =
    possibleMessages.find(
      (
        value
      ): value is string =>
        typeof value ===
          "string" &&
        value.trim()
          .length > 0
    ) ||
    "Erro desconhecido.";

  const possibleStatuses:
    unknown[] = [
    data.status,
    data.statusCode,
    data.response?.status,
    responseData?.status,
  ];

  const status =
    possibleStatuses.find(
      (
        value
      ): value is number =>
        typeof value ===
          "number" &&
        Number.isInteger(
          value
        )
    ) || 500;

  return {
    message,
    status,
  };
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
     * CONFIGURAÇÃO
     * =====================================================
     */

    const accessToken =
      process.env
        .MERCADO_PAGO_ACCESS_TOKEN;

    const isTestMode =
      process.env
        .MERCADO_PAGO_TEST_MODE ===
      "true";

    if (!accessToken) {
      return jsonResponse(
        {
          error:
            "O serviço de pagamento não foi configurado.",
        },
        500
      );
    }

    /*
     * =====================================================
     * ORIGEM
     * =====================================================
     */

    if (
      !isSameOrigin(
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
     * CONTENT-TYPE
     * =====================================================
     */

    const contentType =
      request.headers.get(
        "content-type"
      );

    if (
      !contentType
        ?.toLowerCase()
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
        ) || 0
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
     * RATE LIMIT POR IP
     * =====================================================
     */

    const clientIp =
      getClientIp(request);

    const ipLimit =
      await consumeRateLimit({
        scope:
          "payment-process-ip",

        identifier:
          clientIp,

        limit: 40,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (
      !ipLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",

          retryAfterSeconds:
            ipLimit.retryAfterSeconds,
        },
        429
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

    let body:
      PaymentRequestBody;

    try {
      const rawBody =
        await request.text();

      if (
        rawBody.length >
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

      body =
        JSON.parse(
          rawBody
        ) as PaymentRequestBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    const orderId =
      normalizeText(
        body.orderId,
        100
      );

    /*
     * O comportamento não revela se
     * determinado ID existe.
     */
    if (
      !orderId ||
      !isValidOrderId(
        orderId
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
     *
     * REGRA:
     *
     * Cliente logado:
     * CustomerSession é a autoridade.
     *
     * Visitante:
     * OrderAccessToken é a autoridade.
     *
     * Se existe CustomerSession válida,
     * NÃO fazemos fallback para token de
     * visitante.
     */

    const customerSession =
      await getCustomerSession();

    let authorizedUserId:
      string;

    if (
      customerSession
    ) {
      /*
       * O getCustomerSession() já verifica:
       *
       * - hash da sessão;
       * - expiração;
       * - revokedAt;
       * - conta ACTIVE;
       * - e-mail verificado;
       * - conta não desativada.
       */
      authorizedUserId =
        customerSession.userId;
    } else {
      /*
       * Nenhuma sessão de cliente:
       * exigimos o token secreto daquele pedido.
       */

      const cookieStore =
        await cookies();

      const orderAccessToken =
        cookieStore.get(
          getOrderAccessCookieName(
            orderId
          )
        )?.value;

      if (
        !orderAccessToken
      ) {
        return jsonResponse(
          {
            error:
              ACCESS_DENIED_MESSAGE,
          },
          403
        );
      }

      const orderAccess =
        await verifyOrderAccessToken({
          token:
            orderAccessToken,

          expectedOrderId:
            orderId,
        });

      if (
        !orderAccess
      ) {
        return jsonResponse(
          {
            error:
              ACCESS_DENIED_MESSAGE,
          },
          403
        );
      }

      authorizedUserId =
        orderAccess.userId;
    }

    /*
     * =====================================================
     * RATE LIMIT DO PEDIDO AUTORIZADO
     * =====================================================
     *
     * Aqui já sabemos que existe uma credencial
     * válida. Não usamos somente o ID público.
     */

    const orderLimit =
      await consumeRateLimit({
        scope:
          "payment-process-order",

        identifier:
          `${authorizedUserId}:${orderId}`,

        limit: 20,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (
      !orderLimit.allowed
    ) {
      return jsonResponse(
        {
          error:
            "Muitas tentativas de pagamento. Aguarde alguns minutos e tente novamente.",

          retryAfterSeconds:
            orderLimit.retryAfterSeconds,
        },
        429
      );
    }

    /*
     * =====================================================
     * FORMA DE PAGAMENTO
     * =====================================================
     */

    const selectedPayment =
      body.paymentMethod;

    if (
      !isSelectedPayment(
        selectedPayment
      )
    ) {
      return jsonResponse(
        {
          error:
            "A forma de pagamento é inválida.",
        },
        400
      );
    }

    const formData =
      body.formData;

    const paymentMethodId =
      normalizeText(
        formData
          ?.payment_method_id,
        50
      ).toLowerCase();

    if (
      !paymentMethodId
    ) {
      return jsonResponse(
        {
          error:
            "A forma de pagamento não foi informada pelo Mercado Pago.",
        },
        400
      );
    }

    /*
     * =====================================================
     * PEDIDO
     * =====================================================
     *
     * Essa consulta já contém simultaneamente:
     *
     * - orderId solicitado;
     * - userId autorizado.
     *
     * Portanto não carregamos os dados sensíveis
     * de um pedido de outra pessoa.
     */

    const order =
      await prisma.order.findFirst({
        where: {
          id:
            orderId,

          userId:
            authorizedUserId,
        },

        select: {
          id: true,
          userId: true,
          status: true,
          total: true,

          user: {
            select: {
              email:
                true,

              cpf:
                true,
            },
          },

          payment: {
            select: {
              status:
                true,

              mercadoPagoPaymentId:
                true,

              mercadoPagoPreferenceId:
                true,
            },
          },

          items: {
            select: {
              name:
                true,

              price:
                true,

              quantity:
                true,

              productId:
                true,
            },
          },
        },
      });

    /*
     * Inexistente e pertencente a outra
     * pessoa produzem a mesma resposta.
     */
    if (!order) {
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
     * ESTADO DO PEDIDO
     * =====================================================
     */

    if (
      order.status ===
        "PAID" ||
      order.payment
        ?.status ===
        "APPROVED"
    ) {
      return jsonResponse(
        {
          error:
            "Este pedido já está pago.",
        },
        409
      );
    }

    if (
      order.status ===
        "CANCELED" ||
      order.status ===
        "REFUNDED" ||
      order.status ===
        "RETURNED"
    ) {
      return jsonResponse(
        {
          error:
            "Este pedido não está disponível para pagamento.",
        },
        409
      );
    }

    if (
      order.items.length ===
      0
    ) {
      return jsonResponse(
        {
          error:
            "O pedido não possui produtos.",
        },
        409
      );
    }

    /*
     * =====================================================
     * VALOR
     * =====================================================
     *
     * Sempre vem do banco.
     */

    const transactionAmount =
      Number(
        order.total
      );

    if (
      !Number.isFinite(
        transactionAmount
      ) ||
      transactionAmount <= 0
    ) {
      return jsonResponse(
        {
          error:
            "O pedido possui um valor inválido.",
        },
        400
      );
    }

    /*
     * =====================================================
     * CARTÃO
     * =====================================================
     */

    const isCard =
      selectedPayment ===
        "credit_card" ||
      selectedPayment ===
        "debit_card";

    /*
     * Este token existe apenas na memória
     * desta requisição.
     */
    const paymentToken =
      normalizeText(
        formData?.token,
        500
      );

    if (
      isCard &&
      !paymentToken
    ) {
      return jsonResponse(
        {
          error:
            "Os dados do cartão não foram preenchidos corretamente.",
        },
        400
      );
    }

    const installments =
      Number(
        formData
          ?.installments
      );

    const normalizedInstallments =
      isCard &&
      Number.isInteger(
        installments
      ) &&
      installments >= 1 &&
      installments <= 24
        ? installments
        : 1;

    /*
     * =====================================================
     * PAGADOR
     * =====================================================
     *
     * E-mail e CPF vêm do banco.
     *
     * formData.payer não controla estes
     * valores no servidor.
     */

    const payerEmail =
      normalizeText(
        order.user.email,
        254
      ).toLowerCase();

    if (
      !payerEmail ||
      !payerEmail.includes(
        "@"
      )
    ) {
      return jsonResponse(
        {
          error:
            "O pedido não possui um e-mail válido.",
        },
        400
      );
    }

    const identificationNumber =
      normalizeDigits(
        order.user.cpf,
        11
      );

    if (
      identificationNumber
        .length !== 11
    ) {
      return jsonResponse(
        {
          error:
            "O pedido não possui um CPF válido.",
        },
        400
      );
    }

    /*
     * =====================================================
     * EXPIRAÇÃO
     * =====================================================
     */

    const expiresAt =
      getPaymentExpirationDate(
        paymentMethodId
      );

    /*
     * =====================================================
     * PAYMENT METHOD
     * =====================================================
     */

    const paymentMethodType =
      getPaymentMethodType(
        selectedPayment
      );

    const paymentMethod: {
      id: string;
      type: string;
      token?: string;
      installments?: number;
      statement_descriptor?: string;
    } = {
      id:
        paymentMethodId,

      type:
        paymentMethodType,
    };

    if (
      paymentToken
    ) {
      paymentMethod.token =
        paymentToken;
    }

    if (isCard) {
      paymentMethod.installments =
        normalizedInstallments;

      paymentMethod.statement_descriptor =
        "LAICO";
    }

    /*
     * =====================================================
     * PAYER
     * =====================================================
     */

    const payer: {
      email: string;

      entity_type:
        "individual";

      identification: {
        type: "CPF";
        number: string;
      };
    } = {
      email:
        payerEmail,

      entity_type:
        "individual",

      identification: {
        type:
          "CPF",

        number:
          identificationNumber,
      },
    };

    /*
     * =====================================================
     * TRANSAÇÃO MP
     * =====================================================
     */

    const transactionPayment: {
      amount: string;

      payment_method:
        typeof paymentMethod;

      expiration_time?: string;
    } = {
      amount:
        transactionAmount.toFixed(
          2
        ),

      payment_method:
        paymentMethod,
    };

    if (!isCard) {
      transactionPayment.expiration_time =
        expiresAt.toISOString();
    }

    /*
     * =====================================================
     * CLIENTE MERCADO PAGO
     * =====================================================
     */

    const mercadoPagoClient =
      new MercadoPagoConfig({
        accessToken,

        options: {
          timeout:
            15_000,

          testToken:
            isTestMode,
        },
      });

    const mercadoPagoOrder =
      new MercadoPagoOrder(
        mercadoPagoClient
      );

    /*
     * =====================================================
     * IDEMPOTÊNCIA
     * =====================================================
     */

    const idempotencyKey =
      createIdempotencyKey({
        orderId:
          order.id,

        paymentMethodId,

        token:
          paymentToken ||
          undefined,
      });

    /*
     * =====================================================
     * CRIAÇÃO NO MERCADO PAGO
     * =====================================================
     */

    const mercadoPagoResponse =
      await mercadoPagoOrder.create({
        body: {
          type:
            "online",

          processing_mode:
            "automatic",

          capture_mode:
            "automatic",

          external_reference:
            order.id,

          total_amount:
            transactionAmount.toFixed(
              2
            ),

          currency:
            "BRL",

          description:
            `Pedido ${order.id} - Laico`,

          payer,

          transactions: {
            payments: [
              transactionPayment,
            ],
          },

          items:
            order.items.map(
              (item) => ({
                title:
                  item.name,

                unit_price:
                  Number(
                    item.price
                  ).toFixed(
                    2
                  ),

                quantity:
                  item.quantity,

                external_code:
                  item.productId,
              })
            ),
        },

        requestOptions: {
          idempotencyKey,
        },
      });

    /*
     * =====================================================
     * RESPOSTA MP
     * =====================================================
     */

    const paymentResponse =
      mercadoPagoResponse
        .transactions
        ?.payments?.[0];

    if (
      !mercadoPagoResponse.id ||
      !paymentResponse?.id
    ) {
      throw new Error(
        "MERCADO_PAGO_INCOMPLETE_RESPONSE"
      );
    }

    const paymentStatus =
      paymentResponse.status ||
      mercadoPagoResponse.status ||
      "pending";

    const statusDetail =
      paymentResponse
        .status_detail ||
      mercadoPagoResponse
        .status_detail ||
      null;

    const paymentApproved =
      isApprovedPaymentStatus(
        paymentStatus
      );

    const paymentRejected =
      isRejectedPaymentStatus(
        paymentStatus
      );

    const databasePaymentStatus =
      getDatabasePaymentStatus(
        paymentStatus
      );

    const orderStatus:
      | "PAID"
      | "PENDING" =
      paymentApproved
        ? "PAID"
        : "PENDING";

    const returnedPaymentMethod =
      paymentResponse
        .payment_method;

    const ticketUrl =
      returnedPaymentMethod
        ?.ticket_url ||
      null;

    const pixQrCode =
      returnedPaymentMethod
        ?.qr_code ||
      null;

    const pixQrCodeBase64 =
      returnedPaymentMethod
        ?.qr_code_base64 ||
      null;

    const barcode =
      returnedPaymentMethod
        ?.barcode_content ||
      returnedPaymentMethod
        ?.digitable_line ||
      null;

    /*
     * =====================================================
     * REVALIDAÇÃO
     * =====================================================
     *
     * O pedido pode ter mudado enquanto
     * aguardávamos a API externa.
     */

    const currentOrder =
      await prisma.order.findFirst({
        where: {
          id:
            order.id,

          userId:
            authorizedUserId,
        },

        select: {
          status:
            true,
        },
      });

    if (
      !currentOrder ||
      currentOrder.status ===
        "CANCELED" ||
      currentOrder.status ===
        "REFUNDED" ||
      currentOrder.status ===
        "RETURNED"
    ) {
      return jsonResponse(
        {
          error:
            "O pedido não está mais disponível para pagamento.",
        },
        409
      );
    }

    /*
     * =====================================================
     * ATUALIZAÇÃO DO BANCO
     * =====================================================
     */

    await prisma.order.update({
      where: {
        id:
          order.id,
      },

      data: {
        status:
          orderStatus,

        expiresAt:
          paymentApproved
            ? null
            : expiresAt,

        payment: {
          upsert: {
            create: {
              provider:
                "mercadopago",

              status:
                databasePaymentStatus,

              mercadoPagoPaymentId:
                String(
                  paymentResponse.id
                ),

              mercadoPagoPreferenceId:
                String(
                  mercadoPagoResponse.id
                ),

              paymentMethod:
                paymentMethodId,

              paymentUrl:
                ticketUrl,
            },

            update: {
              provider:
                "mercadopago",

              status:
                databasePaymentStatus,

              mercadoPagoPaymentId:
                String(
                  paymentResponse.id
                ),

              mercadoPagoPreferenceId:
                String(
                  mercadoPagoResponse.id
                ),

              paymentMethod:
                paymentMethodId,

              paymentUrl:
                ticketUrl,
            },
          },
        },

        history: {
          create: {
            status:
              orderStatus,

            title:
              paymentApproved
                ? "Pagamento aprovado"
                : paymentRejected
                  ? "Pagamento recusado"
                  : "Pagamento iniciado",

            message:
              paymentApproved
                ? "O pagamento foi confirmado pelo Mercado Pago."
                : paymentRejected
                  ? "O pagamento não foi aprovado. Você pode tentar novamente com outra forma de pagamento."
                  : `Aguardando a confirmação do pagamento até ${expiresAt.toLocaleString(
                      "pt-BR"
                    )}.`,
          },
        },
      },
    });

    /*
     * =====================================================
     * RETORNO SEGURO
     * =====================================================
     */

    return jsonResponse({
      id:
        String(
          paymentResponse.id
        ),

      mercadoPagoOrderId:
        String(
          mercadoPagoResponse.id
        ),

      status:
        paymentApproved
          ? "approved"
          : paymentStatus,

      statusDetail,

      paymentMethod:
        returnedPaymentMethod
          ?.id ||
        paymentMethodId,

      pixQrCode,
      pixQrCodeBase64,
      ticketUrl,
      barcode,
    });
  } catch (error) {
    const mercadoPagoError =
      getMercadoPagoError(
        error
      );

    /*
     * Nunca imprimimos:
     *
     * - token do cartão;
     * - CPF;
     * - e-mail;
     * - cookie;
     * - body;
     * - Access Token do MP;
     * - resposta completa do MP.
     */

    console.error(
      "Falha ao processar pagamento no Mercado Pago:",
      {
        status:
          mercadoPagoError.status,

        errorType:
          error instanceof Error
            ? error.name
            : "UnknownError",
      }
    );

    const normalizedMessage =
      mercadoPagoError.message
        .toLowerCase();

    /*
     * Credenciais.
     */

    if (
      mercadoPagoError.status ===
        401 ||
      normalizedMessage.includes(
        "unauthorized"
      ) ||
      normalizedMessage.includes(
        "invalid credentials"
      )
    ) {
      return jsonResponse(
        {
          error:
            "O serviço de pagamento não foi autorizado.",
        },
        502
      );
    }

    /*
     * Falha temporária MP.
     */

    if (
      normalizedMessage.includes(
        "internal_error"
      ) ||
      normalizedMessage.includes(
        "internal error"
      )
    ) {
      return jsonResponse(
        {
          error:
            "O Mercado Pago apresentou uma falha temporária. Aguarde alguns instantes e tente novamente.",
        },
        502
      );
    }

    /*
     * Token do cartão inválido/expirado.
     */

    if (
      normalizedMessage.includes(
        "invalid card token"
      ) ||
      normalizedMessage.includes(
        "token expired"
      ) ||
      normalizedMessage.includes(
        "expired token"
      )
    ) {
      return jsonResponse(
        {
          error:
            "Os dados do cartão expiraram ou são inválidos. Preencha novamente.",
        },
        400
      );
    }

    const responseStatus =
      mercadoPagoError.status >=
        400 &&
      mercadoPagoError.status <
        500
        ? mercadoPagoError.status
        : 502;

    return jsonResponse(
      {
        error:
          process.env
            .NODE_ENV ===
          "development"
            ? `Mercado Pago: ${mercadoPagoError.message}`
            : "Não foi possível processar o pagamento.",
      },
      responseStatus
    );
  }
}