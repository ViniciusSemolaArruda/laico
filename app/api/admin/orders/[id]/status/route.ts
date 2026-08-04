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

type AdminEditableStatus =
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED"
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

const ACCESS_DENIED_MESSAGE =
  "Você não tem permissão para fazer isso! Acesso negado.";

const MAXIMUM_REQUEST_SIZE = 10_000;

const adminEditableStatuses:
  readonly AdminEditableStatus[] = [
    "PROCESSING",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELED",
    "RETURNED",
  ];

const allowedTransitions: Record<
  OrderStatus,
  readonly AdminEditableStatus[]
> = {
  /*
   * PAID e REFUNDED são controlados pelo
   * Mercado Pago e nunca são definidos aqui.
   */
  PENDING: ["CANCELED"],

  PAID: ["PROCESSING"],

  PROCESSING: ["SHIPPED"],

  SHIPPED: [
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "RETURNED",
  ],

  OUT_FOR_DELIVERY: [
    "DELIVERED",
    "RETURNED",
  ],

  DELIVERED: ["RETURNED"],

  CANCELED: [],

  REFUNDED: [],

  RETURNED: [],
};

const statusTitles: Record<
  AdminEditableStatus,
  string
> = {
  PROCESSING:
    "Pedido em preparação",

  SHIPPED:
    "Pedido enviado",

  OUT_FOR_DELIVERY:
    "Saiu para entrega",

  DELIVERED:
    "Pedido entregue",

  CANCELED:
    "Pedido cancelado",

  RETURNED:
    "Pedido devolvido",
};

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

function isValidOrderId(
  orderId: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    orderId
  );
}

function isAdminEditableStatus(
  value: unknown
): value is AdminEditableStatus {
  return (
    typeof value === "string" &&
    adminEditableStatuses.includes(
      value as AdminEditableStatus
    )
  );
}

function isAllowedTransition(
  currentStatus: OrderStatus,
  nextStatus: AdminEditableStatus
) {
  return allowedTransitions[
    currentStatus
  ].includes(nextStatus);
}

function isValidTrackingUrl(
  value: string | null
) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    /*
     * Links exibidos ao comprador devem
     * utilizar HTTPS.
     */
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function getDefaultMessage(
  status: AdminEditableStatus
) {
  switch (status) {
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

    case "RETURNED":
      return "O pedido foi devolvido.";
  }
}

function isRecordNotFoundError(
  error: unknown
) {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return error.code === "P2025";
}

export async function PATCH(
  request: Request,
  { params }: Props
) {
  const session =
    await getAdminSession();

  if (!session) {
    return jsonResponse(
      {
        error:
          ACCESS_DENIED_MESSAGE,
      },
      401
    );
  }

  try {
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

    const { id } =
      await params;

    const orderId =
      normalizeText(id, 100);

    if (
      !orderId ||
      !isValidOrderId(orderId)
    ) {
      return jsonResponse(
        {
          error:
            "Pedido inválido.",
        },
        400
      );
    }

    let body: UpdateOrderBody;

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
      ) as UpdateOrderBody;
    } catch {
      return jsonResponse(
        {
          error:
            "Solicitação inválida.",
        },
        400
      );
    }

    if (
      !isAdminEditableStatus(
        body.status
      )
    ) {
      return jsonResponse(
        {
          error:
            "Esse status não pode ser definido manualmente.",
        },
        400
      );
    }

    const nextStatus =
      body.status;

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

          payment: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!existingOrder) {
      return jsonResponse(
        {
          error:
            "Pedido não encontrado.",
        },
        404
      );
    }

    const statusChanged =
      existingOrder.status !==
      nextStatus;

    if (
      statusChanged &&
      !isAllowedTransition(
        existingOrder.status,
        nextStatus
      )
    ) {
      return jsonResponse(
        {
          error:
            `Não é permitido alterar o pedido de ${existingOrder.status} para ${nextStatus}.`,
        },
        409
      );
    }

    /*
     * Um pedido somente pode entrar em
     * preparação se o pagamento estiver
     * aprovado no banco.
     */
    if (
      nextStatus ===
        "PROCESSING" &&
      existingOrder.payment
        ?.status !== "APPROVED"
    ) {
      return jsonResponse(
        {
          error:
            "O pedido não possui um pagamento aprovado.",
        },
        409
      );
    }

    /*
     * Cancelar um pedido pago exige antes
     * um fluxo real de cancelamento ou
     * reembolso no Mercado Pago.
     */
    if (
      nextStatus ===
        "CANCELED" &&
      existingOrder.payment
        ?.status === "APPROVED"
    ) {
      return jsonResponse(
        {
          error:
            "Um pedido pago não pode ser cancelado manualmente. Faça primeiro o reembolso pelo Mercado Pago.",
        },
        409
      );
    }

    const hasTrackingCode =
      Object.prototype.hasOwnProperty.call(
        body,
        "trackingCode"
      );

    const hasTrackingUrl =
      Object.prototype.hasOwnProperty.call(
        body,
        "trackingUrl"
      );

    const hasCarrier =
      Object.prototype.hasOwnProperty.call(
        body,
        "carrier"
      );

    /*
     * Campos omitidos são preservados.
     * Somente valores realmente enviados
     * pelo painel são substituídos.
     */
    const trackingCode =
      hasTrackingCode
        ? normalizeNullableText(
            body.trackingCode,
            100
          )
        : existingOrder.trackingCode;

    const trackingUrl =
      hasTrackingUrl
        ? normalizeNullableText(
            body.trackingUrl,
            500
          )
        : existingOrder.trackingUrl;

    const carrier =
      hasCarrier
        ? normalizeNullableText(
            body.carrier,
            100
          )
        : existingOrder.carrier;

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
      return jsonResponse(
        {
          error:
            "O link de rastreamento deve ser uma URL HTTPS válida.",
        },
        400
      );
    }

    if (
      (nextStatus ===
        "SHIPPED" ||
        nextStatus ===
          "OUT_FOR_DELIVERY") &&
      !trackingCode
    ) {
      return jsonResponse(
        {
          error:
            "Informe o código de rastreamento para atualizar o pedido.",
        },
        400
      );
    }

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
      return jsonResponse({
        success: true,
        updated: false,
        message:
          "Nenhuma alteração foi identificada.",
      });
    }

    const historyMessage =
      customMessage ||
      getDefaultMessage(
        nextStatus
      );

    try {
      const order =
        await prisma.order.update({
          /*
           * A condição com o status atual
           * evita sobrescrever uma atualização
           * concorrente do webhook.
           */
          where: {
            id: orderId,
            status:
              existingOrder.status,
          },

          data: {
            status:
              nextStatus,

            trackingCode,
            trackingUrl,
            carrier,

            history:
              statusChanged ||
              customMessage
                ? {
                    create: {
                      status:
                        nextStatus,

                      title:
                        statusTitles[
                          nextStatus
                        ],

                      message:
                        historyMessage,
                    },
                  }
                : undefined,
          },

          select: {
            id: true,
            status: true,
            trackingCode: true,
            trackingUrl: true,
            carrier: true,
            updatedAt: true,

            history: {
              orderBy: {
                createdAt:
                  "desc",
              },

              select: {
                id: true,
                status: true,
                title: true,
                message: true,
                createdAt: true,
              },
            },
          },
        });

      return jsonResponse({
        success: true,
        updated: true,
        order,
      });
    } catch (error) {
      if (
        isRecordNotFoundError(
          error
        )
      ) {
        return jsonResponse(
          {
            error:
              "O pedido foi atualizado por outro processo. Recarregue a página e tente novamente.",
          },
          409
        );
      }

      throw error;
    }
  } catch (error) {
    console.error(
      "Erro ao atualizar pedido:",
      error instanceof Error
        ? error.message
        : "Erro desconhecido."
    );

    return jsonResponse(
      {
        error:
          "Erro interno ao atualizar o pedido.",
      },
      500
    );
  }
}