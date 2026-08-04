import { NextResponse } from "next/server";
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Order as MercadoPagoOrder,
  WebhookSignatureValidator,
} from "mercadopago";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MercadoPagoWebhookBody = {
  id?: string | number;
  type?: string;
  action?: string;
  api_version?: string;
  application_id?: string | number;
  date_created?: string;
  live_mode?: boolean;
  user_id?: string | number;

  data?: {
    id?: string;
    external_reference?: string;
    status?: string;
    status_detail?: string;
  };
};

type DatabasePaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED";

type DatabaseOrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED"
  | "REFUNDED"
  | "RETURNED";

function normalizeStatus(
  status: string | null | undefined
): string {
  return status?.trim().toLowerCase() || "";
}

function getPaymentStatus(
  status: string
): DatabasePaymentStatus {
  switch (status) {
    case "approved":
    case "processed":
      return "APPROVED";

    case "rejected":
    case "failed":
      return "REJECTED";

    case "cancelled":
    case "canceled":
    case "expired":
      return "CANCELED";

    case "refunded":
    case "charged_back":
      return "REFUNDED";

    default:
      return "PENDING";
  }
}

function getOrderStatus(
  paymentStatus: string,
  mercadoPagoOrderStatus: string
): DatabaseOrderStatus {
  if (
    paymentStatus === "approved" ||
    paymentStatus === "processed" ||
    mercadoPagoOrderStatus === "processed"
  ) {
    return "PAID";
  }

  if (
    paymentStatus === "refunded" ||
    paymentStatus === "charged_back" ||
    mercadoPagoOrderStatus === "refunded"
  ) {
    return "REFUNDED";
  }

  if (
    paymentStatus === "cancelled" ||
    paymentStatus === "canceled" ||
    paymentStatus === "expired" ||
    mercadoPagoOrderStatus === "cancelled" ||
    mercadoPagoOrderStatus === "canceled" ||
    mercadoPagoOrderStatus === "expired"
  ) {
    return "CANCELED";
  }

  return "PENDING";
}

function getHistoryContent(
  status: DatabaseOrderStatus,
  statusDetail: string | null
) {
  switch (status) {
    case "PAID":
      return {
        title: "Pagamento confirmado",
        message:
          "O pagamento foi confirmado pelo Mercado Pago.",
      };

    case "REFUNDED":
      return {
        title: "Pagamento reembolsado",
        message:
          "O pagamento foi reembolsado pelo Mercado Pago.",
      };

    case "CANCELED":
      return {
        title: "Pagamento cancelado",
        message:
          statusDetail === "expired"
            ? "O prazo para pagamento expirou."
            : "O pagamento foi cancelado.",
      };

    case "PENDING":
    default:
      return {
        title: "Pagamento pendente",
        message: statusDetail
          ? `O pagamento está sendo processado: ${statusDetail}.`
          : "O Mercado Pago ainda está processando o pagamento.",
      };
  }
}

function isProtectedOrderStatus(
  status: string
): status is DatabaseOrderStatus {
  return [
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
    "REFUNDED",
    "RETURNED",
  ].includes(status);
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);

  /*
   * O ID usado na assinatura deve vir do
   * parâmetro data.id da URL.
   */
  const queryDataId =
    requestUrl.searchParams.get("data.id");

  const notificationType =
    requestUrl.searchParams.get("type");

  const xSignature =
    request.headers.get("x-signature");

  const xRequestId =
    request.headers.get("x-request-id");

  try {
    const webhookSecret =
      process.env.MERCADO_PAGO_WEBHOOK_SECRET?.trim();

    const accessToken =
      process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();

    const isTestMode =
      process.env.MERCADO_PAGO_TEST_MODE === "true";

    if (!webhookSecret) {
      console.error(
        "MERCADO_PAGO_WEBHOOK_SECRET não configurado."
      );

      return NextResponse.json(
        {
          error: "Webhook não configurado.",
        },
        {
          status: 500,
        }
      );
    }

    if (!accessToken) {
      console.error(
        "MERCADO_PAGO_ACCESS_TOKEN não configurado."
      );

      return NextResponse.json(
        {
          error: "Mercado Pago não configurado.",
        },
        {
          status: 500,
        }
      );
    }

    if (!queryDataId) {
      return NextResponse.json(
        {
          error: "data.id não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (!xSignature || !xRequestId) {
      return NextResponse.json(
        {
          error:
            "Cabeçalhos de autenticação não informados.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Não transforme queryDataId em minúsculas.
     *
     * A partir do SDK 3.2, o Mercado Pago
     * preserva corretamente letras maiúsculas
     * e minúsculas na assinatura.
     */
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId: queryDataId,
      secret: webhookSecret,
    });

    let body: MercadoPagoWebhookBody = {};

    try {
      body =
        (await request.json()) as MercadoPagoWebhookBody;
    } catch {
      /*
       * Algumas notificações podem ter corpo
       * vazio. O ID principal já foi recebido
       * e validado pela URL.
       */
    }

    const bodyDataId = body.data?.id;

    /*
     * Impede que um ID diferente seja inserido
     * no corpo depois da validação da URL.
     */
    if (
      bodyDataId &&
      bodyDataId !== queryDataId
    ) {
      console.error(
        "Webhook com IDs diferentes:",
        {
          queryDataId,
          bodyDataId,
          requestId: xRequestId,
        }
      );

      return NextResponse.json(
        {
          error: "Identificador inconsistente.",
        },
        {
          status: 400,
        }
      );
    }

    const eventType =
      body.type || notificationType;

    /*
     * Somente notificações de Orders são
     * processadas nesta rota.
     *
     * Outros eventos retornam 200 para evitar
     * novas tentativas desnecessárias.
     */
    if (
      eventType &&
      eventType !== "order"
    ) {
      return NextResponse.json({
        received: true,
        ignored: true,
        type: eventType,
      });
    }

    const mercadoPagoClient =
      new MercadoPagoConfig({
        accessToken,

        options: {
          timeout: 10000,
          testToken: isTestMode,
        },
      });

    const mercadoPagoOrder =
      new MercadoPagoOrder(
        mercadoPagoClient
      );

    /*
     * O status recebido no corpo não é usado
     * diretamente.
     *
     * Consultamos a Order na API oficial do
     * Mercado Pago depois de validar a assinatura.
     */
    const mercadoPagoResponse =
      await mercadoPagoOrder.get({
        id: queryDataId,
      });

    const externalReference =
      mercadoPagoResponse.external_reference;

    if (!externalReference) {
      console.error(
        "Ordem do Mercado Pago sem external_reference:",
        {
          mercadoPagoOrderId: queryDataId,
          requestId: xRequestId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Ordem sem referência interna.",
        },
        {
          status: 422,
        }
      );
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: externalReference,
        },

        include: {
          payment: true,
        },
      });

    if (!order) {
      /*
       * A Order pode pertencer a outro sistema
       * conectado à mesma conta.
       *
       * Retornamos 200 para confirmar o
       * recebimento sem alterar o banco.
       */
      console.warn(
        "Pedido local não encontrado:",
        {
          externalReference,
          mercadoPagoOrderId: queryDataId,
          requestId: xRequestId,
        }
      );

      return NextResponse.json({
        received: true,
        ignored: true,
        reason: "Pedido local não encontrado.",
      });
    }

    /*
     * Garante que a Order recebida pertence
     * realmente ao pagamento salvo no pedido.
     */
    if (
      order.payment?.mercadoPagoPreferenceId &&
      order.payment.mercadoPagoPreferenceId !==
        queryDataId
    ) {
      console.error(
        "Ordem do Mercado Pago incompatível:",
        {
          orderId: order.id,
          receivedMercadoPagoOrderId:
            queryDataId,
          savedMercadoPagoOrderId:
            order.payment
              .mercadoPagoPreferenceId,
          requestId: xRequestId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Ordem não corresponde ao pedido.",
        },
        {
          status: 409,
        }
      );
    }

    const paymentResponse =
      mercadoPagoResponse.transactions
        ?.payments?.[0];

    const mercadoPagoOrderStatus =
      normalizeStatus(
        mercadoPagoResponse.status
      );

    const paymentStatus =
      normalizeStatus(
        paymentResponse?.status
      );

    const effectiveStatus =
      paymentStatus ||
      mercadoPagoOrderStatus ||
      "pending";

    const paymentStatusDetail =
      paymentResponse?.status_detail ||
      mercadoPagoResponse.status_detail ||
      null;

    let databasePaymentStatus =
      getPaymentStatus(effectiveStatus);

    let databaseOrderStatus =
      getOrderStatus(
        effectiveStatus,
        mercadoPagoOrderStatus
      );

    /*
     * Uma notificação atrasada ou pendente
     * não pode rebaixar um pagamento aprovado.
     */
    if (
      order.payment?.status === "APPROVED" &&
      (
        databasePaymentStatus === "PENDING" ||
        databasePaymentStatus === "REJECTED"
      )
    ) {
      databasePaymentStatus = "APPROVED";
    }

    /*
     * Uma notificação pendente não pode rebaixar
     * um pedido pago, enviado, entregue,
     * cancelado ou reembolsado.
     */
    if (
      databaseOrderStatus === "PENDING" &&
      isProtectedOrderStatus(order.status)
    ) {
      databaseOrderStatus =
        order.status;
    }

    const paymentMethodId =
      paymentResponse?.payment_method?.id ||
      order.payment?.paymentMethod ||
      null;

    const paymentId =
      paymentResponse?.id
        ? String(paymentResponse.id)
        : order.payment
            ?.mercadoPagoPaymentId ||
          null;

    const ticketUrl =
      paymentResponse?.payment_method
        ?.ticket_url ||
      order.payment?.paymentUrl ||
      null;

    const orderStatusChanged =
      order.status !== databaseOrderStatus;

    const paymentStatusChanged =
      order.payment?.status !==
      databasePaymentStatus;

    /*
     * Confirma notificações repetidas sem
     * criar históricos duplicados.
     */
    if (
      !orderStatusChanged &&
      !paymentStatusChanged
    ) {
      return NextResponse.json({
        received: true,
        updated: false,
        orderId: order.id,
        status: order.status,
      });
    }

    const history =
      getHistoryContent(
        databaseOrderStatus,
        paymentStatusDetail
      );

    await prisma.order.update({
      where: {
        id: order.id,
      },

      data: {
        status: databaseOrderStatus,

        expiresAt:
          databaseOrderStatus === "PAID"
            ? null
            : order.expiresAt,

        payment: {
          upsert: {
            create: {
              provider: "mercadopago",
              status: databasePaymentStatus,

              mercadoPagoPaymentId:
                paymentId,

              mercadoPagoPreferenceId:
                queryDataId,

              paymentMethod:
                paymentMethodId,

              paymentUrl:
                ticketUrl,
            },

            update: {
              provider: "mercadopago",
              status: databasePaymentStatus,

              mercadoPagoPaymentId:
                paymentId,

              mercadoPagoPreferenceId:
                queryDataId,

              paymentMethod:
                paymentMethodId,

              paymentUrl:
                ticketUrl,
            },
          },
        },

        history:
          orderStatusChanged
            ? {
                create: {
                  status:
                    databaseOrderStatus,

                  title: history.title,
                  message: history.message,
                },
              }
            : undefined,
      },
    });

    console.log(
      "Webhook do Mercado Pago processado:",
      {
        requestId: xRequestId,
        orderId: order.id,
        mercadoPagoOrderId:
          queryDataId,
        previousOrderStatus:
          order.status,
        newOrderStatus:
          databaseOrderStatus,
        previousPaymentStatus:
          order.payment?.status || null,
        newPaymentStatus:
          databasePaymentStatus,
        statusDetail:
          paymentStatusDetail,
      }
    );

    return NextResponse.json({
      received: true,
      updated: true,
      orderId: order.id,
      status: databaseOrderStatus,
    });
  } catch (error) {
    if (
      error instanceof
      InvalidWebhookSignatureError
    ) {
      console.error(
        "Assinatura inválida no webhook do Mercado Pago:",
        {
          reason: error.reason,
          requestId: xRequestId,
          hasSignature:
            Boolean(xSignature),
          hasRequestId:
            Boolean(xRequestId),
          hasDataId:
            Boolean(queryDataId),
        }
      );

      return NextResponse.json(
        {
          error: "Assinatura inválida.",
          reason: error.reason,
        },
        {
          status: 401,
        }
      );
    }

    console.error(
  "Erro ao processar webhook do Mercado Pago:",
  {
    errorType:
      error instanceof Error
        ? error.name
        : "UnknownError",

    requestId:
      xRequestId || null,

    hasSignature:
      Boolean(xSignature),

    hasDataId:
      Boolean(queryDataId),
  }
);

    /*
     * O Mercado Pago tentará enviar novamente
     * quando receber um erro 500.
     */
    return NextResponse.json(
      {
        error:
          "Erro ao processar webhook.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Mercado Pago webhook",
    status: "online",
  });
}