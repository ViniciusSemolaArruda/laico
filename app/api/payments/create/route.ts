//app\api\payments\create\route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { MercadoPagoConfig, Preference } from "mercadopago";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
  options: {
    timeout: 5000,
  },
});

export async function POST(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId é obrigatório." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
        user: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 }
      );
    }

    const preference = new Preference(client);

    const response = await preference.create({
      body: {
        external_reference: order.id,

        items: order.items.map((item: { productId: any; name: any; quantity: any; price: any; }) => ({
          id: item.productId,
          title: item.name,
          quantity: item.quantity,
          unit_price: Number(item.price),
          currency_id: "BRL",
        })),

        payer: {
          name: order.user.name,
          email: order.user.email,
        },

        notification_url: undefined,
      },
    });

    const paymentUrl = response.init_point || response.sandbox_init_point;

    await prisma.payment.upsert({
      where: {
        orderId: order.id,
      },
      update: {
        mercadoPagoPreferenceId: response.id,
        paymentUrl,
      },
      create: {
        orderId: order.id,
        mercadoPagoPreferenceId: response.id,
        paymentUrl,
      },
    });

    return NextResponse.json({
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      paymentUrl,
    });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);

    return NextResponse.json(
      { error: "Erro interno ao criar pagamento." },
      { status: 500 }
    );
  }
}