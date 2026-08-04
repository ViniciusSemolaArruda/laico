import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

function formatPrice(value: unknown) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const statusLabels: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  PROCESSING: "Pedido em preparação",
  SHIPPED: "Pedido enviado",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Entregue",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
  RETURNED: "Devolvido",
};

export default async function UserOrderDetailsPage({ params }: Props) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      history: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <Header />

      <section className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[34px] font-extrabold text-[#20170f]">
            Acompanhar pedido
          </h1>

          <p className="text-neutral-600">
            Pedido #{order.id.slice(0, 8).toUpperCase()} ·{" "}
            {formatDate(order.createdAt)}
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-neutral-500">Status atual</p>
              <h2 className="text-[26px] font-extrabold text-[#b98218]">
                {statusLabels[order.status] || order.status}
              </h2>
            </div>

            <div className="text-right">
              <p className="text-sm text-neutral-500">Total</p>
              <strong className="text-[24px] text-[#20170f]">
                {formatPrice(order.total)}
              </strong>
            </div>
          </div>

          {order.trackingCode && (
            <div className="mt-5 rounded-xl bg-[#faf9f6] p-4">
              <p className="text-sm">
                <strong>Transportadora:</strong> {order.carrier || "-"}
              </p>

              <p className="text-sm">
                <strong>Código de rastreio:</strong> {order.trackingCode}
              </p>

              {order.trackingUrl && (
                <Link
                  href={order.trackingUrl}
                  target="_blank"
                  className="mt-3 inline-flex rounded-xl bg-[#20170f] px-5 py-3 text-sm font-bold text-white"
                >
                  Abrir rastreamento
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="mb-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-[24px] font-extrabold text-[#20170f]">
            Linha do tempo do pedido
          </h2>

          <div className="space-y-5">
            {order.history.map((item, index) => (
              <div key={item.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-5 w-5 rounded-full bg-[#b98218]" />
                  {index !== order.history.length - 1 && (
                    <div className="h-full min-h-[48px] w-[2px] bg-[#e8dcc2]" />
                  )}
                </div>

                <div className="pb-4">
                  <strong className="text-[#20170f]">{item.title}</strong>

                  {item.message && (
                    <p className="mt-1 text-sm text-neutral-700">
                      {item.message}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-neutral-400">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {order.history.length === 0 && (
              <p className="text-sm text-neutral-500">
                Seu pedido ainda não possui atualizações.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-[24px] font-extrabold text-[#20170f]">
            Produtos do pedido
          </h2>

          <div className="divide-y divide-[#eee2cc]">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 py-4">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-16 w-16 rounded-xl border object-contain"
                />

                <div className="flex-1">
                  <strong>{item.name}</strong>
                  <p className="text-sm text-neutral-500">
                    Quantidade: {item.quantity}
                  </p>
                </div>

                <strong>{formatPrice(Number(item.price) * item.quantity)}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>

      <Footer />
    </main>
  );
}