import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED"
  | "REFUNDED"
  | "RETURNED";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateOrderBody = {
  status?: unknown;
  trackingCode?: unknown;
  trackingUrl?: unknown;
  carrier?: unknown;
  message?: unknown;
};

const allowedStatuses: readonly OrderStatus[] =
  [
    "PENDING",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
    "REFUNDED",
    "RETURNED",
  ];

const statusTitles: Record<
  OrderStatus,
  string
> = {
  PENDING: "Pedido criado",
  PAID: "Pagamento aprovado",
  PROCESSING:
    "Pedido em preparação",
  SHIPPED: "Pedido enviado",
  OUT_FOR_DELIVERY:
    "Saiu para entrega",
  DELIVERED: "Pedido entregue",
  CANCELED: "Pedido cancelado",
  REFUNDED:
    "Pedido reembolsado",
  RETURNED: "Pedido devolvido",
};

function normalizeText(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeNullableText(
  value: unknown,
  maximumLength: number
) {
  const normalized =
    normalizeText(
      value,
      maximumLength
    );

  return normalized || null;
}

function isOrderStatus(
  value: unknown
): value is OrderStatus {
  return (
    typeof value === "string" &&
    allowedStatuses.includes(
      value as OrderStatus
    )
  );
}

function isValidTrackingUrl(
  value: string | null
) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol ===
        "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

function getDefaultMessage(
  status: OrderStatus
) {
  switch (status) {
    case "PENDING":
      return "O pedido está aguardando a confirmação do pagamento.";

    case "PAID":
      return "O pagamento foi confirmado.";

    case "PROCESSING":
      return "O pedido está sendo separado e preparado para envio.";

    case "SHIPPED":
      return "O pedido foi enviado para a transportadora.";

    case "OUT_FOR_DELIVERY":
      return "O pedido saiu para entrega.";

    case "DELIVERED":
      return "O pedido foi entregue.";

    case "CANCELED":
      return "O pedido foi cancelado.";

    case "REFUNDED":
      return "O pagamento do pedido foi reembolsado.";

    case "RETURNED":
      return "O pedido foi devolvido.";
  }
}

export async function PATCH(
  request: Request,
  { params }: Props
) {
  const session =
    await getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        error:
          "Não autorizado.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const { id } =
      await params;

    const orderId =
      normalizeText(id, 100);

    if (!orderId) {
      return NextResponse.json(
        {
          error:
            "Pedido não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as UpdateOrderBody;

    if (
      !isOrderStatus(
        body.status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Status do pedido inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const status =
      body.status;

    const trackingCode =
      normalizeNullableText(
        body.trackingCode,
        100
      );

    const trackingUrl =
      normalizeNullableText(
        body.trackingUrl,
        500
      );

    const carrier =
      normalizeNullableText(
        body.carrier,
        100
      );

    const customMessage =
      normalizeNullableText(
        body.message,
        500
      );

    if (
      !isValidTrackingUrl(
        trackingUrl
      )
    ) {
      return NextResponse.json(
        {
          error:
            "O link de rastreamento é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      (status ===
        "SHIPPED" ||
        status ===
          "OUT_FOR_DELIVERY") &&
      !trackingCode
    ) {
      return NextResponse.json(
        {
          error:
            "Informe o código de rastreamento para atualizar o pedido como enviado.",
        },
        {
          status: 400,
        }
      );
    }

    const existingOrder =
      await prisma.order.findUnique({
        where: {
          id: orderId,
        },

        select: {
          id: true,
          status: true,
          trackingCode: true,
          trackingUrl: true,
          carrier: true,
        },
      });

    if (!existingOrder) {
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

    const statusChanged =
      existingOrder.status !==
      status;

    const trackingChanged =
      existingOrder.trackingCode !==
        trackingCode ||
      existingOrder.trackingUrl !==
        trackingUrl ||
      existingOrder.carrier !==
        carrier;

    if (
      !statusChanged &&
      !trackingChanged &&
      !customMessage
    ) {
      return NextResponse.json({
        success: true,
        updated: false,
        message:
          "Nenhuma alteração foi identificada.",
      });
    }

    const historyMessage =
      customMessage ||
      getDefaultMessage(
        status
      );

    const order =
      await prisma.order.update({
        where: {
          id: orderId,
        },

        data: {
          status,
          trackingCode,
          trackingUrl,
          carrier,

          /*
           * Evita registros duplicados quando
           * somente os mesmos dados são enviados.
           */
          history:
            statusChanged ||
            customMessage
              ? {
                  create: {
                    status,

                    title:
                      statusTitles[
                        status
                      ],

                    message:
                      historyMessage,
                  },
                }
              : undefined,
        },

        include: {
          history: {
            orderBy: {
              createdAt:
                "desc",
            },
          },
        },
      });

    return NextResponse.json({
      success: true,
      updated: true,
      order,
    });
  } catch (error) {
    console.error(
      "Erro ao atualizar pedido:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao atualizar o pedido.",
      },
      {
        status: 500,
      }
    );
  }
}