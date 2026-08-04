import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CreditCard, MapPin, Package, User } from "lucide-react";
import AdminShell from "@/app/components/admin/AdminShell";
import UpdateOrderStatusForm from "@/app/components/admin/UpdateOrderStatusForm";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

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

function getOrderStatusStyle(status: string) {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return "bg-green-100 text-green-700";
    case "PROCESSING":
      return "bg-blue-100 text-blue-700";
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return "bg-purple-100 text-purple-700";
    case "CANCELED":
    case "REFUNDED":
    case "RETURNED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-[#fff8e8] text-[#b98218]";
  }
}

function getPaymentStatusStyle(status?: string) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
    case "CANCELED":
      return "bg-red-100 text-red-700";
    case "REFUNDED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export default async function AdminOrderDetailsPage({ params }: Props) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      address: true,
      items: true,
      payment: true,
      history: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!order) {
    redirect("/admin/pedidos");
  }

  const paymentStatus = order.payment?.status || "PENDING";

  return (
    <AdminShell
      title="Detalhes do pedido"
      description={`Pedido realizado em ${formatDate(order.createdAt)}`}
    >
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[34px] font-extrabold text-[#20170f]">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </h2>

          <p className="mt-1 text-neutral-600">
            Visualize cliente, entrega, pagamento, produtos e histórico.
          </p>
        </div>

        <Link
          href="/admin/pedidos"
          className="h-11 px-5 rounded-xl border border-[#e8dcc2] bg-white text-[#20170f] font-bold flex items-center gap-2 hover:bg-[#faf9f6] transition"
        >
          <ArrowLeft size={18} />
          Voltar para pedidos
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <User size={21} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#20170f]">
              Cliente
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <p><strong>Nome:</strong> {order.user.name}</p>
            <p><strong>E-mail:</strong> {order.user.email}</p>
            <p><strong>Telefone:</strong> {order.user.phone || "-"}</p>
            <p><strong>CPF:</strong> {order.user.cpf || "-"}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <MapPin size={21} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#20170f]">
              Entrega
            </h3>
          </div>

          {order.address ? (
            <div className="space-y-3 text-sm">
              <p><strong>CEP:</strong> {order.address.cep}</p>
              <p>
                <strong>Endereço:</strong> {order.address.street},{" "}
                {order.address.number}
              </p>
              <p><strong>Complemento:</strong> {order.address.complement || "-"}</p>
              <p><strong>Bairro:</strong> {order.address.neighborhood}</p>
              <p>
                <strong>Cidade:</strong> {order.address.city} -{" "}
                {order.address.state}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">Sem endereço cadastrado.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <CreditCard size={21} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#20170f]">
              Pagamento
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <p className="flex items-center justify-between gap-3">
              <strong>Status do pedido:</strong>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${getOrderStatusStyle(order.status)}`}>
                {order.status}
              </span>
            </p>

            <p className="flex items-center justify-between gap-3">
              <strong>Status do pagamento:</strong>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${getPaymentStatusStyle(paymentStatus)}`}>
                {paymentStatus}
              </span>
            </p>

            <p><strong>Método:</strong> {order.payment?.paymentMethod || "-"}</p>
            <p><strong>Mercado Pago ID:</strong> {order.payment?.mercadoPagoPaymentId || "-"}</p>
            <p>
              <strong>Total:</strong>{" "}
              <span className="font-extrabold text-[#b98218]">
                {formatPrice(order.total)}
              </span>
            </p>
          </div>
        </section>
      </div>

      <UpdateOrderStatusForm
        orderId={order.id}
        currentStatus={order.status}
        trackingCode={order.trackingCode}
        trackingUrl={order.trackingUrl}
        carrier={order.carrier}
      />

      <section className="mt-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-[22px] font-extrabold text-[#20170f]">
          Rastreamento
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#faf9f6] p-4">
            <p className="text-xs text-neutral-500">Transportadora</p>
            <strong>{order.carrier || "-"}</strong>
          </div>

          <div className="rounded-xl bg-[#faf9f6] p-4">
            <p className="text-xs text-neutral-500">Código de rastreio</p>
            <strong>{order.trackingCode || "-"}</strong>
          </div>

          <div className="rounded-xl bg-[#faf9f6] p-4">
            <p className="text-xs text-neutral-500">Link</p>
            {order.trackingUrl ? (
              <Link
                href={order.trackingUrl}
                target="_blank"
                className="font-bold text-[#b98218] hover:underline"
              >
                Abrir rastreio
              </Link>
            ) : (
              <strong>-</strong>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-[22px] font-extrabold text-[#20170f]">
          Histórico do pedido
        </h3>

        <div className="space-y-4">
          {order.history.map((item) => (
            <div key={item.id} className="border-l-4 border-[#b98218] pl-4">
              <strong className="text-[#20170f]">{item.title}</strong>
              <p className="text-sm text-neutral-500">{item.status}</p>

              {item.message && (
                <p className="mt-1 text-sm text-neutral-700">
                  {item.message}
                </p>
              )}

              <p className="mt-1 text-xs text-neutral-400">
                {formatDate(item.createdAt)}
              </p>
            </div>
          ))}

          {order.history.length === 0 && (
            <p className="text-sm text-neutral-500">
              Nenhuma atualização registrada ainda.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#eee2cc] bg-[#faf9f6] p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
            <Package size={21} />
          </div>

          <div>
            <h3 className="text-[22px] font-extrabold text-[#20170f]">
              Produtos comprados
            </h3>
            <p className="text-sm text-neutral-500">
              {order.items.length} item(ns) neste pedido
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#eee2cc]">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[90px_1fr_120px_120px_140px] md:items-center"
            >
              <div className="flex h-[75px] w-[75px] items-center justify-center rounded-xl border border-[#e8dcc2] bg-[#fffdf8]">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-[62px] max-w-[62px] object-contain"
                />
              </div>

              <div>
                <p className="font-extrabold text-[#20170f]">{item.name}</p>
                <p className="text-xs text-neutral-500">
                  Produto ID: {item.productId}
                </p>
              </div>

              <p className="text-sm">
                Qtd: <strong>{item.quantity}</strong>
              </p>

              <p className="text-sm font-bold">{formatPrice(item.price)}</p>

              <p className="text-sm font-extrabold text-[#20170f]">
                {formatPrice(Number(item.price) * item.quantity)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-[22px] font-extrabold text-[#20170f]">
          Resumo financeiro
        </h3>

        <div className="max-w-[430px] space-y-3 text-[15px]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <strong>{formatPrice(order.subtotal)}</strong>
          </div>

          <div className="flex justify-between">
            <span>Frete</span>
            <strong>{formatPrice(order.shipping)}</strong>
          </div>

          <div className="flex justify-between">
            <span>Desconto</span>
            <strong>{formatPrice(order.discount)}</strong>
          </div>

          <div className="flex justify-between border-t border-[#eee2cc] pt-4 text-[20px]">
            <span className="font-extrabold">Total</span>
            <strong className="text-[#b98218]">
              {formatPrice(order.total)}
            </strong>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}