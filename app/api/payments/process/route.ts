import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  MercadoPagoConfig,
  Order as MercadoPagoOrder,
} from "mercadopago";

import { prisma } from "@/lib/prisma";
import { getPaymentExpirationDate } from "@/lib/payments/paymentExpiration";

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
  cause: unknown[];
  raw: unknown;
};

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
    maximumLength + 10
  )
    .replace(/\D/g, "")
    .slice(0, maximumLength);
}

function getDatabasePaymentStatus(
  status: string | null | undefined
): "APPROVED" | "REJECTED" | "PENDING" {
  if (status === "approved") {
    return "APPROVED";
  }

  if (
    status === "rejected" ||
    status === "cancelled" ||
    status === "canceled"
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
  return createHash("sha256")
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

function stringifyError(
  error: unknown
) {
  try {
    return JSON.stringify(
      error,
      null,
      2
    );
  } catch {
    return String(error);
  }
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
  console.error(
    "Erro bruto retornado pelo Mercado Pago:",
    stringifyError(error)
  );

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
      cause: [],
      raw: error,
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

  const causes = Array.isArray(
    data.cause
  )
    ? data.cause
    : Array.isArray(
          responseData?.cause
        )
      ? responseData.cause
      : [];

  const errors = Array.isArray(
    data.errors
  )
    ? data.errors
    : Array.isArray(
          responseData?.errors
        )
      ? responseData.errors
      : [];

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
    cause:
      causes.length > 0
        ? causes
        : errors,
    raw: error,
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
      return NextResponse.json(
        {
          error:
            "MERCADO_PAGO_ACCESS_TOKEN não foi configurado.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      (await request.json()) as PaymentRequestBody;

    const orderId = normalizeText(
      body.orderId,
      100
    );

    const selectedPayment =
      body.paymentMethod;

    const formData = body.formData;

    if (!orderId) {
      return NextResponse.json(
        {
          error:
            "O pedido não foi informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !selectedPayment ||
      ![
        "pix",
        "credit_card",
        "debit_card",
        "ticket",
      ].includes(selectedPayment)
    ) {
      return NextResponse.json(
        {
          error:
            "A forma de pagamento é inválida.",
        },
        {
          status: 400,
        }
      );
    }

    const paymentMethodId =
      normalizeText(
        formData?.payment_method_id,
        50
      );

    if (!paymentMethodId) {
      return NextResponse.json(
        {
          error:
            "A forma de pagamento não foi informada pelo Mercado Pago.",
        },
        {
          status: 400,
        }
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },

        include: {
          user: true,
          address: true,
          payment: true,
          items: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Pedido não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      order.status === "PAID"
    ) {
      return NextResponse.json(
        {
          error:
            "Este pedido já está pago.",
        },
        {
          status: 409,
        }
      );
    }

    const transactionAmount =
      Number(order.total);

    if (
      !Number.isFinite(
        transactionAmount
      ) ||
      transactionAmount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "O pedido possui um valor inválido.",
        },
        {
          status: 400,
        }
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
      return NextResponse.json(
        {
          error:
            "Os dados do cartão não foram preenchidos corretamente.",
        },
        {
          status: 400,
        }
      );
    }

    const installments = Number(
      formData?.installments
    );

    const normalizedInstallments =
      Number.isInteger(
        installments
      ) &&
      installments >= 1 &&
      installments <= 24
        ? installments
        : 1;

    const payerEmail =
      normalizeText(
        formData?.payer?.email ||
          order.user.email,
        254
      ).toLowerCase();

    if (
      !payerEmail ||
      !payerEmail.includes("@")
    ) {
      return NextResponse.json(
        {
          error:
            "O e-mail do comprador é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const identificationNumber =
      normalizeDigits(
        formData?.payer
          ?.identification?.number ||
          order.user.cpf,
        14
      );

    const identificationType =
      normalizeText(
        formData?.payer
          ?.identification?.type,
        10
      ).toUpperCase() || "CPF";

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
      identification?: {
        type: string;
        number: string;
      };
    } = {
      email: payerEmail,
      entity_type: "individual",
    };

    if (identificationNumber) {
      payer.identification = {
        type:
          identificationType,
        number:
          identificationNumber,
      };
    }

    const transactionPayment: {
      amount: string;
      payment_method:
        typeof paymentMethod;
      expiration_time?: string;
    } = {
      amount:
        transactionAmount.toFixed(2),

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
          timeout: 15000,
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

    console.log(
      "Criando pagamento no Mercado Pago:",
      {
        orderId: order.id,
        amount:
          transactionAmount.toFixed(2),
        paymentMethodId,
        paymentMethodType,
        installments:
          normalizedInstallments,
        isTestMode,
        hasToken:
          Boolean(paymentToken),
      }
    );

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
      console.error(
        "Resposta incompleta do Mercado Pago:",
        stringifyError(
          mercadoPagoResponse
        )
      );

      throw new Error(
        "O Mercado Pago não retornou os dados completos do pagamento."
      );
    }

    const paymentStatus =
      paymentResponse.status ||
      mercadoPagoResponse.status ||
      "pending";

    const statusDetail =
      paymentResponse.status_detail ||
      mercadoPagoResponse
        .status_detail ||
      null;

    const databasePaymentStatus =
      getDatabasePaymentStatus(
        paymentStatus
      );

    const orderStatus:
      | "PAID"
      | "PENDING" =
      paymentStatus === "approved"
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

    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        status: orderStatus,

        expiresAt:
          paymentStatus ===
          "approved"
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

            title:
              paymentStatus ===
              "approved"
                ? "Pagamento aprovado"
                : paymentStatus ===
                    "rejected"
                  ? "Pagamento recusado"
                  : "Pagamento iniciado",

            message:
              paymentStatus ===
              "approved"
                ? "O pagamento foi confirmado pelo Mercado Pago."
                : paymentStatus ===
                    "rejected"
                  ? `O pagamento foi recusado${
                      statusDetail
                        ? `: ${statusDetail}`
                        : "."
                    }`
                  : `Aguardando confirmação do pagamento até ${expiresAt.toLocaleString(
                      "pt-BR"
                    )}.`,
          },
        },
      },
    });

    return NextResponse.json({
      id: String(
        paymentResponse.id
      ),

      mercadoPagoOrderId:
        String(
          mercadoPagoResponse.id
        ),

      status: paymentStatus,

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

    console.error(
      "Erro ao processar pagamento:",
      {
        message:
          mercadoPagoError.message,

        status:
          mercadoPagoError.status,

        cause:
          mercadoPagoError.cause,

        raw:
          stringifyError(
            mercadoPagoError.raw
          ),
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
      )
    ) {
      return NextResponse.json(
        {
          error:
            "As credenciais do Mercado Pago não foram autorizadas. Confira se a Public Key e o Access Token são de teste e pertencem à mesma aplicação Checkout Bricks.",
        },
        {
          status: 401,
        }
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
      return NextResponse.json(
        {
          error:
            "O Mercado Pago apresentou uma falha interna ao criar o pagamento. Aguarde alguns instantes e tente novamente.",
        },
        {
          status: 502,
        }
      );
    }

    if (
      normalizedMessage.includes(
        "invalid card token"
      ) ||
      normalizedMessage.includes(
        "token"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "O token do cartão expirou ou é inválido. Preencha novamente os dados do cartão.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV ===
          "development"
            ? `Mercado Pago: ${mercadoPagoError.message}`
            : "Não foi possível processar o pagamento.",
      },
      {
        status:
          mercadoPagoError.status >=
            400 &&
          mercadoPagoError.status <
            600
            ? mercadoPagoError.status
            : 500,
      }
    );
  }
}