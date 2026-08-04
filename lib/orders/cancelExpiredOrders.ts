import { prisma } from "@/lib/prisma";

export async function cancelExpiredOrders() {
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lte: new Date(),
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
          history: {
            create: {
              status: "CANCELED",
              title: "Pedido cancelado automaticamente",
              message:
                "O prazo de pagamento expirou e o pedido foi cancelado automaticamente.",
            },
          },
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

  return expiredOrders.length;
}