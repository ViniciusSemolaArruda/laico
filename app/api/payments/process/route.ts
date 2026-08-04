import { createHash } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  MercadoPagoConfig,
  Order as MercadoPagoOrder,
} from "mercadopago";

import {
  getOrderAccessCookieName,
  verifyOrderAccessToken,
} from "@/lib/order-access";
import { getPaymentExpirationDate } from "@/lib/payments/paymentExpiration";
import { prisma } from "@/lib/prisma";

type SelectedPayment =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "ticket";

type PaymentFormData = {
  token?: string;
  payment_method_id?: string;
  installments?: number | string;

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
  paymentMethod?: SelectedPayment;
  formData?: PaymentFormData;
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

const MAXIMUM_REQUEST_SIZE = 20_000;

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
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function normalizeText(
  value: unknown,
  maximumLength = 255
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
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
    .slice(0, maximumLength);
}

function isValidOrderId(
  orderId: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    orderId
  );
}

function isSelectedPayment(
  value: unknown
): value is SelectedPayment {
  return (
    value === "pix" ||
    value === "credit_card" ||
    value === "debit_card" ||
    value === "ticket"
  );
}

function isApprovedPaymentStatus(
  status: string | null | undefined
) {
  const normalizedStatus =
    status?.toLowerCase();

  return (
    normalizedStatus === "approved" ||
    normalizedStatus === "processed" ||
    normalizedStatus === "accredited"
  );
}

function isRejectedPaymentStatus(
  status: string | null | undefined
) {
  const normalizedStatus =
    status?.toLowerCase();

  return (
    normalizedStatus === "rejected" ||
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled"
  );
}

function getDatabasePaymentStatus(
  status: string | null | undefined
): "APPROVED" | "REJECTED" | "PENDING" {
  if (
    isApprovedPaymentStatus(status)
  ) {
    return "APPROVED";
  }

  if (
    isRejectedPaymentStatus(status)
  ) {
    return "REJECTED";
  }

  return "PENDING";
}

function getPaymentMethodType(
  selectedPayment: SelectedPayment
) {
  switch (selectedPayment) {
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
   * O token do cartão não é salvo nem
   * registrado. Ele é utilizado somente
   * na geração deste hash.
   */
  return createHash("sha256")
    .update(
      [
        orderId,
        paymentMethodId,
        token || "payment-without-token",
      ].join(":")
    )
    .digest("hex");
}

function getFirstErrorItem(
  value: unknown
): MercadoPagoErrorItem | null {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === "object" &&
    value[0] !== null
  ) {
    return value[0] as MercadoPagoErrorItem;
  }

  if (
    typeof value === "object" &&
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
    typeof error !== "object" ||
    error === null
  ) {
    return {
      message:
        typeof error === "string" &&
        error.trim()
          ? error
          : "Erro desconhecido.",
      status: 500,
    };
  }

  const data = error as {
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
    typeof data.response?.data ===
      "object" &&
    data.response.data !== null
      ? (data.response.data as {
          message?: unknown;
          error?: unknown;
          status?: unknown;
          cause?: unknown;
          errors?: unknown;
        })
      : null;

  const firstCause =
    getFirstErrorItem(data.cause) ||
    getFirstErrorItem(
      responseData?.cause
    );

  const firstError =
    getFirstErrorItem(data.errors) ||
    getFirstErrorItem(
      responseData?.errors
    );

  const possibleMessages: unknown[] = [
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
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    ) || "Erro desconhecido.";

  const possibleStatuses: unknown[] = [
    data.status,
    data.statusCode,
    data.response?.status,
    responseData?.status,
  ];

  const status =
    possibleStatuses.find(
      (value): value is number =>
        typeof value === "number" &&
        Number.isInteger(value)
    ) || 500;

  return {
    message,
    status,
  };
}

export async function POST(
  request: Request
) {
  try {
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

    const contentType =
      request.headers.get(
        "content-type"
      );

    if (
      !contentType
        ?.toLowerCase()
        .includes("application/json")
    ) {
      return jsonResponse(
        {
          error:
            "Formato da solicitação inválido.",
        },
        415
      );
    }

    const contentLength = Number(
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

    let body: PaymentRequestBody;

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

      body = JSON.parse(
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

    const orderId = normalizeText(
      body.orderId,
      100
    );

    /*
     * Não revelamos se um ID inválido
     * corresponde ou não a algum pedido.
     */
    if (
      !orderId ||
      !isValidOrderId(orderId)
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
     * AUTORIZAÇÃO ANTES DA CONSULTA
     * COMPLETA DO PEDIDO.
     *
     * Conhecer somente o ID cms...
     * não concede acesso ao pagamento.
     */
    const cookieStore =
      await cookies();

    const orderAccessToken =
      cookieStore.get(
        getOrderAccessCookieName(
          orderId
        )
      )?.value;

    if (!orderAccessToken) {
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
        token: orderAccessToken,
        expectedOrderId: orderId,
      });

    if (!orderAccess) {
      return jsonResponse(
        {
          error:
            ACCESS_DENIED_MESSAGE,
        },
        403
      );
    }

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
        formData?.payment_method_id,
        50
      ).toLowerCase();

    if (!paymentMethodId) {
      return jsonResponse(
        {
          error:
            "A forma de pagamento não foi informada pelo Mercado Pago.",
        },
        400
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },

        select: {
          id: true,
          userId: true,
          status: true,
          total: true,

          user: {
            select: {
              email: true,
              cpf: true,
            },
          },

          payment: {
            select: {
              status: true,
              mercadoPagoPaymentId:
                true,
              mercadoPagoPreferenceId:
                true,
            },
          },

          items: {
            select: {
              name: true,
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

    /*
     * Pedido inexistente e pedido de
     * outro usuário recebem exatamente
     * a mesma resposta.
     */
    if (
      !order ||
      order.userId !==
        orderAccess.userId
    ) {
      return jsonResponse(
        {
          error:
            ACCESS_DENIED_MESSAGE,
        },
        403
      );
    }

    if (
      order.status === "PAID" ||
      order.payment?.status ===
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
      order.items.length === 0
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
     * O valor utilizado no Mercado Pago
     * vem exclusivamente do banco.
     */
    const transactionAmount =
      Number(order.total);

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

    const isCard =
      selectedPayment ===
        "credit_card" ||
      selectedPayment ===
        "debit_card";

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

    const installments = Number(
      formData?.installments
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
     * E-mail e CPF vêm exclusivamente
     * do banco. Os dados enviados pelo
     * navegador não são utilizados.
     */
    const payerEmail =
      normalizeText(
        order.user.email,
        254
      ).toLowerCase();

    if (
      !payerEmail ||
      !payerEmail.includes("@")
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
      identificationNumber.length !==
      11
    ) {
      return jsonResponse(
        {
          error:
            "O pedido não possui um CPF válido.",
        },
        400
      );
    }

    const expiresAt =
      getPaymentExpirationDate(
        paymentMethodId
      );

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
      id: paymentMethodId,
      type: paymentMethodType,
    };

    if (paymentToken) {
      paymentMethod.token =
        paymentToken;
    }

    if (isCard) {
      paymentMethod.installments =
        normalizedInstallments;

      paymentMethod.statement_descriptor =
        "LAICO";
    }

    const payer: {
      email: string;
      entity_type: "individual";
      identification: {
        type: "CPF";
        number: string;
      };
    } = {
      email: payerEmail,
      entity_type: "individual",

      identification: {
        type: "CPF",
        number:
          identificationNumber,
      },
    };

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

    const mercadoPagoClient =
      new MercadoPagoConfig({
        accessToken,

        options: {
          timeout: 15_000,
          testToken: isTestMode,
        },
      });

    const mercadoPagoOrder =
      new MercadoPagoOrder(
        mercadoPagoClient
      );

    const idempotencyKey =
      createIdempotencyKey({
        orderId: order.id,
        paymentMethodId,
        token:
          paymentToken ||
          undefined,
      });

    const mercadoPagoResponse =
      await mercadoPagoOrder.create({
        body: {
          type: "online",
          processing_mode:
            "automatic",
          capture_mode: "automatic",

          external_reference:
            order.id,

          total_amount:
            transactionAmount.toFixed(
              2
            ),

          currency: "BRL",

          description:
            `Pedido ${order.id} - Laico`,

          payer,

          transactions: {
            payments: [
              transactionPayment,
            ],
          },

          items: order.items.map(
            (item) => ({
              title: item.name,

              unit_price: Number(
                item.price
              ).toFixed(2),

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

    const paymentResponse =
      mercadoPagoResponse
        .transactions
        ?.payments?.[0];

    if (
      !mercadoPagoResponse.id ||
      !paymentResponse?.id
    ) {
      throw new Error(
        "O Mercado Pago não retornou os dados completos do pagamento."
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
      paymentResponse.payment_method;

    const ticketUrl =
      returnedPaymentMethod
        ?.ticket_url || null;

    const pixQrCode =
      returnedPaymentMethod
        ?.qr_code || null;

    const pixQrCodeBase64 =
      returnedPaymentMethod
        ?.qr_code_base64 || null;

    const barcode =
      returnedPaymentMethod
        ?.barcode_content ||
      returnedPaymentMethod
        ?.digitable_line ||
      null;

    /*
     * Atualizamos somente se o pedido
     * ainda não foi cancelado, devolvido
     * ou reembolsado durante a chamada.
     */
    const currentOrder =
      await prisma.order.findUnique({
        where: {
          id: order.id,
        },

        select: {
          status: true,
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

    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        status: orderStatus,

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
            status: orderStatus,

            title: paymentApproved
              ? "Pagamento aprovado"
              : paymentRejected
                ? "Pagamento recusado"
                : "Pagamento iniciado",

            message: paymentApproved
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

    return jsonResponse({
      id: String(
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
        returnedPaymentMethod?.id ||
        paymentMethodId,

      pixQrCode,
      pixQrCodeBase64,
      ticketUrl,
      barcode,
    });
  } catch (error) {
    const mercadoPagoError =
      getMercadoPagoError(error);

    /*
     * Não registramos token do cartão,
     * CPF, cookie, endereço, corpo da
     * requisição ou resposta completa.
     */
    console.error(
      "Falha ao processar pagamento no Mercado Pago:",
      {
        status:
          mercadoPagoError.status,

        message:
          mercadoPagoError.message,
      }
    );

    const normalizedMessage =
      mercadoPagoError.message
        .toLowerCase();

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
      mercadoPagoError.status < 500
        ? mercadoPagoError.status
        : 502;

    return jsonResponse(
      {
        error:
          process.env.NODE_ENV ===
          "development"
            ? `Mercado Pago: ${mercadoPagoError.message}`
            : "Não foi possível processar o pagamento.",
      },
      responseStatus
    );
  }
}