import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { OrderStatus } from "@prisma/client";

type Props = {
  params: Promise<{ id: string }>;
};

const statusTitles: Record<OrderStatus, string> = {
  PENDING: "Pedido criado",
  PAID: "Pagamento aprovado",
  PROCESSING: "Pedido em preparação",
  SHIPPED: "Pedido enviado",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Pedido entregue",
  CANCELED: "Pedido cancelado",
  REFUNDED: "Pedido reembolsado",
  RETURNED: "Pedido devolvido",
};

export async function PATCH(request: Request, { params }: Props) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const status = body.status as OrderStatus;
    const trackingCode = body.trackingCode || null;
    const trackingUrl = body.trackingUrl || null;
    const carrier = body.carrier || null;
    const message = body.message || null;

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        trackingCode,
        trackingUrl,
        carrier,
        history: {
          create: {
            status,
            title: statusTitles[status],
            message,
          },
        },
      },
      include: {
        history: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao atualizar pedido." },
      { status: 500 }
    );
  }
}