import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.order.deleteMany({
      where: {
        status: "CANCELED",
        createdAt: {
          lt: limitDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `${result.count} pedido(s) cancelado(s) antigo(s) apagado(s).`,
    });
  } catch (error) {
    console.error("Erro ao apagar pedidos antigos:", error);

    return NextResponse.json(
      { error: "Erro ao apagar pedidos cancelados antigos." },
      { status: 500 }
    );
  }
}