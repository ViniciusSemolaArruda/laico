import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "crypto";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

export async function POST(request: Request) {
  try {
    const { orderId, paymentMethod, payer } = await request.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }

    const paymentClient = new Payment(client);

    const payment = await paymentClient.create({
      body: {
        transaction_amount: Number(order.total),
        description: `Pedido ${order.id}`,
        payment_method_id:
          paymentMethod === "pix"
            ? "pix"
            : paymentMethod === "boleto"
            ? "bolbradesco"
            : paymentMethod,
        external_reference: order.id,
        payer: {
          email: payer.email,
          first_name: payer.name,
          identification: {
            type: "CPF",
            number: payer.cpf.replace(/\D/g, ""),
          },
        },
      },
      requestOptions: {
        idempotencyKey: crypto.randomUUID(),
      },
    });

    await prisma.payment.upsert({
      where: { orderId: order.id },
      update: {
        status: payment.status === "approved" ? "APPROVED" : "PENDING",
        mercadoPagoPaymentId: String(payment.id),
        paymentMethod: payment.payment_method_id,
      },
      create: {
        orderId: order.id,
        provider: "mercadopago",
        status: payment.status === "approved" ? "APPROVED" : "PENDING",
        mercadoPagoPaymentId: String(payment.id),
        paymentMethod: payment.payment_method_id,
      },
    });

    return NextResponse.json({
  id: payment.id,
  status: payment.status,
  paymentMethod: payment.payment_method_id,
  pixQrCode:
    payment.point_of_interaction?.transaction_data?.qr_code,
  pixQrCodeBase64:
    payment.point_of_interaction?.transaction_data?.qr_code_base64,
  ticketUrl:
    payment.transaction_details?.external_resource_url,
  barcode: null,
});
  } catch (error) {
    console.error("Erro no pagamento custom:", error);

    return NextResponse.json(
      { error: "Erro ao gerar pagamento." },
      { status: 500 }
    );
  }
}