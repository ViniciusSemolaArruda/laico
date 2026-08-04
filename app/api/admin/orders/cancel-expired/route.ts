import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const expirationDate = new Date(Date.now() - 30 * 60 * 1000);

    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: expirationDate,
        },
      },
      include: {
        items: true,
        payment: true,
      },
    });

    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: "CANCELED",
          },
        });

        if (order.payment) {
          await tx.payment.update({
            where: { orderId: order.id },
            data: {
              status: "CANCELED",
            },
          });
        }

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      canceled: expiredOrders.length,
      message: `${expiredOrders.length} pedido(s) expirado(s) cancelado(s).`,
    });
  } catch (error) {
    console.error("Erro ao cancelar pedidos expirados:", error);

    return NextResponse.json(
      { error: "Erro ao cancelar pedidos expirados." },
      { status: 500 }
    );
  }
}