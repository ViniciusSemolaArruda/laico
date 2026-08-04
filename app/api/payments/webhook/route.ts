import { NextResponse } from "next/server";
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Order as MercadoPagoOrder,
  WebhookSignatureValidator,
} from "mercadopago";

import { prisma } from "@/lib/prisma";

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
  | "CANCELED"
  | "REFUNDED";

function normalizeStatus(
  status: string | null | undefined
) {
  return status
    ?.trim()
    .toLowerCase() || "";
}

function getPaymentStatus(
  status: string
): DatabasePaymentStatus {
  switch (status) {
    case "approved":
    case "processed":
      return "APPROVED";

    case "rejected":
      return "REJECTED";

    case "cancelled":
    case "canceled":
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
    mercadoPagoOrderStatus === "cancelled" ||
    mercadoPagoOrderStatus === "canceled"
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
          "O pagamento foi cancelado.",
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

function isTerminalOrderStatus(
  status: string
) {
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

export async function POST(
  request: Request
) {
  const requestUrl = new URL(
    request.url
  );

  const queryDataId =
    requestUrl.searchParams.get(
      "data.id"
    );

  const notificationType =
    requestUrl.searchParams.get(
      "type"
    );

  const xSignature =
    request.headers.get(
      "x-signature"
    );

  const xRequestId =
    request.headers.get(
      "x-request-id"
    );

  try {
    const webhookSecret =
      process.env
        .MERCADO_PAGO_WEBHOOK_SECRET;

    const accessToken =
      process.env
        .MERCADO_PAGO_ACCESS_TOKEN;

    const isTestMode =
      process.env
        .MERCADO_PAGO_TEST_MODE ===
      "true";

    if (!webhookSecret) {
      console.error(
        "MERCADO_PAGO_WEBHOOK_SECRET não configurado."
      );

      return NextResponse.json(
        {
          error:
            "Webhook não configurado.",
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
          error:
            "Mercado Pago não configurado.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * O Mercado Pago coloca o ID assinado
     * no parâmetro data.id da URL.
     */
    if (!queryDataId) {
      return NextResponse.json(
        {
          error:
            "data.id não informado.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Valida a assinatura antes de consultar
     * ou modificar qualquer pedido.
     */
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId: queryDataId,
      secret: webhookSecret,

      /*
       * Aceita notificações geradas nos últimos
       * cinco minutos, reduzindo ataques de replay.
       */
      toleranceSeconds: 300,
    });

    let body: MercadoPagoWebhookBody =
      {};

    try {
      body =
        (await request.json()) as MercadoPagoWebhookBody;
    } catch {
      /*
       * O ID principal já está na URL.
       * O corpo pode estar vazio em algumas
       * simulações.
       */
    }

    const bodyDataId =
      body.data?.id;

    /*
     * Se o corpo tiver um ID diferente do ID
     * assinado na URL, a requisição é recusada.
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
          xRequestId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Identificador inconsistente.",
        },
        {
          status: 400,
        }
      );
    }

    const eventType =
      body.type ||
      notificationType;

    /*
     * Esta rota processa somente eventos
     * da API Orders.
     *
     * Outros eventos recebem 200 para o
     * Mercado Pago não ficar repetindo.
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
     * Nunca confiamos no status recebido
     * pelo webhook. Consultamos diretamente
     * a ordem na API do Mercado Pago.
     */
    const mercadoPagoResponse =
      await mercadoPagoOrder.get({
        id: queryDataId,
      });

    const externalReference =
      mercadoPagoResponse
        .external_reference;

    if (!externalReference) {
      console.error(
        "Ordem do Mercado Pago sem external_reference:",
        queryDataId
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
       * Retornamos 200 porque esta ordem pode
       * pertencer a outro sistema conectado à
       * mesma conta do Mercado Pago.
       */
      console.warn(
        "Pedido local não encontrado para o webhook:",
        {
          externalReference,
          mercadoPagoOrderId:
            queryDataId,
        }
      );

      return NextResponse.json({
        received: true,
        ignored: true,
        reason:
          "Pedido local não encontrado.",
      });
    }

    /*
     * Impede que uma ordem do Mercado Pago
     * atualize o pedido local errado.
     */
    if (
      order.payment
        ?.mercadoPagoPreferenceId &&
      order.payment
        .mercadoPagoPreferenceId !==
        queryDataId
    ) {
      console.error(
        "Ordem do Mercado Pago não corresponde ao pedido:",
        {
          orderId: order.id,
          receivedMercadoPagoOrderId:
            queryDataId,
          savedMercadoPagoOrderId:
            order.payment
              .mercadoPagoPreferenceId,
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
      mercadoPagoResponse
        .transactions
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
      mercadoPagoResponse
        .status_detail ||
      null;

    const databasePaymentStatus =
      getPaymentStatus(
        effectiveStatus
      );

    let databaseOrderStatus =
      getOrderStatus(
        effectiveStatus,
        mercadoPagoOrderStatus
      );

    /*
     * Uma notificação pendente ou atrasada
     * nunca pode rebaixar um pedido que já
     * foi pago, enviado ou entregue.
     */
    if (
      databaseOrderStatus ===
        "PENDING" &&
      isTerminalOrderStatus(
        order.status
      )
    ) {
      databaseOrderStatus =
        order.status as DatabaseOrderStatus;
    }

    const paymentMethodId =
      paymentResponse
        ?.payment_method?.id ||
      order.payment
        ?.paymentMethod ||
      null;

    const paymentId =
      paymentResponse?.id
        ? String(
            paymentResponse.id
          )
        : order.payment
            ?.mercadoPagoPaymentId ||
          null;

    const ticketUrl =
      paymentResponse
        ?.payment_method?.ticket_url ||
      order.payment?.paymentUrl ||
      null;

    const orderStatusChanged =
      order.status !==
      databaseOrderStatus;

    const paymentStatusChanged =
      order.payment?.status !==
      databasePaymentStatus;

    /*
     * Se nada mudou, confirmamos o webhook,
     * mas não criamos histórico duplicado.
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
        status:
          databaseOrderStatus,

        expiresAt:
          databaseOrderStatus ===
          "PAID"
            ? null
            : order.expiresAt,

        payment: {
          upsert: {
            create: {
              provider:
                "mercadopago",

              status:
                databasePaymentStatus,

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
              provider:
                "mercadopago",

              status:
                databasePaymentStatus,

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

                  title:
                    history.title,

                  message:
                    history.message,
                },
              }
            : undefined,
      },
    });

    console.log(
      "Webhook do Mercado Pago processado:",
      {
        requestId:
          xRequestId,
        orderId:
          order.id,
        mercadoPagoOrderId:
          queryDataId,
        previousStatus:
          order.status,
        newStatus:
          databaseOrderStatus,
        paymentStatus:
          databasePaymentStatus,
        statusDetail:
          paymentStatusDetail,
      }
    );

    return NextResponse.json({
      received: true,
      updated: true,
      orderId: order.id,
      status:
        databaseOrderStatus,
    });
  } catch (error) {
    if (
      error instanceof
      InvalidWebhookSignatureError
    ) {
      console.error(
        "Assinatura inválida no webhook do Mercado Pago:",
        {
          reason:
            error.reason,
          requestId:
            xRequestId,
        }
      );

      return NextResponse.json(
        {
          error:
            "Assinatura inválida.",
        },
        {
          status: 401,
        }
      );
    }

    console.error(
      "Erro ao processar webhook do Mercado Pago:",
      error
    );

    /*
     * Retornamos 500 para o Mercado Pago
     * tentar enviar a notificação novamente.
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
    service:
      "Mercado Pago webhook",
    status: "online",
  });
}