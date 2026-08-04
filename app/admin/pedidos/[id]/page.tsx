import AdminShell from "@/app/components/admin/AdminShell";
import UpdateOrderStatusForm from "@/app/components/admin/UpdateOrderStatusForm";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  CreditCard,
  MapPin,
  Package,
  User,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

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

type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type AdminOrderDetails = {
  id: string;
  status: OrderStatus;

  subtotal: unknown;
  shipping: unknown;
  discount: unknown;
  total: unknown;

  trackingCode: string | null;
  trackingUrl: string | null;
  carrier: string | null;

  createdAt: Date;

  user: {
    name: string;
    email: string;
    phone: string | null;
    cpf: string | null;
  };

  address: {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
    complement: string | null;
  } | null;

  payment: {
    status: PaymentStatus;
    paymentMethod: string | null;
    mercadoPagoPaymentId:
      | string
      | null;
  } | null;

  history: Array<{
    id: string;
    status: OrderStatus;
    title: string;
    message: string | null;
    createdAt: Date;
  }>;

  items: Array<{
    id: string;
    productId: string;
    name: string;
    image: string;
    price: unknown;
    quantity: number;
  }>;
};

function formatPrice(
  value: unknown
) {
  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return "R$ 0,00";
  }

  return numericValue.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(date);
}

function formatCpf(
  cpf: string | null
) {
  if (!cpf) {
    return "-";
  }

  const digits =
    cpf.replace(/\D/g, "");

  if (digits.length !== 11) {
    return cpf;
  }

  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

function formatPhone(
  phone: string | null
) {
  if (!phone) {
    return "-";
  }

  const digits =
    phone.replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );
  }

  if (digits.length === 10) {
    return digits.replace(
      /(\d{2})(\d{4})(\d{4})/,
      "($1) $2-$3"
    );
  }

  return phone;
}

function formatCep(
  cep: string
) {
  const digits =
    cep.replace(/\D/g, "");

  if (digits.length !== 8) {
    return cep;
  }

  return digits.replace(
    /(\d{5})(\d{3})/,
    "$1-$2"
  );
}

function getOrderStatusLabel(
  status: OrderStatus
) {
  switch (status) {
    case "PENDING":
      return "Aguardando pagamento";

    case "PAID":
      return "Pago";

    case "PROCESSING":
      return "Em preparação";

    case "SHIPPED":
      return "Enviado";

    case "OUT_FOR_DELIVERY":
      return "Saiu para entrega";

    case "DELIVERED":
      return "Entregue";

    case "CANCELED":
      return "Cancelado";

    case "REFUNDED":
      return "Reembolsado";

    case "RETURNED":
      return "Devolvido";
  }
}

function getOrderStatusStyle(
  status: OrderStatus
) {
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

    case "PENDING":
    default:
      return "bg-[#fff8e8] text-[#b98218]";
  }
}

function getPaymentStatusLabel(
  status: PaymentStatus
) {
  switch (status) {
    case "APPROVED":
      return "Aprovado";

    case "REJECTED":
      return "Recusado";

    case "CANCELED":
      return "Cancelado";

    case "REFUNDED":
      return "Reembolsado";

    case "PENDING":
    default:
      return "Pendente";
  }
}

function getPaymentStatusStyle(
  status: PaymentStatus
) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";

    case "REJECTED":
    case "CANCELED":
      return "bg-red-100 text-red-700";

    case "REFUNDED":
      return "bg-purple-100 text-purple-700";

    case "PENDING":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export default async function AdminOrderDetailsPage({
  params,
}: Props) {
  const session =
    await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const order: AdminOrderDetails | null =
    await prisma.order.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,

        subtotal: true,
        shipping: true,
        discount: true,
        total: true,

        trackingCode: true,
        trackingUrl: true,
        carrier: true,

        createdAt: true,

        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            cpf: true,
          },
        },

        address: {
          select: {
            cep: true,
            state: true,
            city: true,
            neighborhood: true,
            street: true,
            number: true,
            complement: true,
          },
        },

        payment: {
          select: {
            status: true,
            paymentMethod: true,
            mercadoPagoPaymentId:
              true,
          },
        },

        history: {
          select: {
            id: true,
            status: true,
            title: true,
            message: true,
            createdAt: true,
          },

          orderBy: {
            createdAt: "desc",
          },
        },

        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            image: true,
            price: true,
            quantity: true,
          },
        },
      },
    });

  if (!order) {
    redirect("/admin/pedidos");
  }

  const paymentStatus:
    PaymentStatus =
    order.payment?.status ||
    "PENDING";

  return (
    <AdminShell
      title="Detalhes do pedido"
      description={`Pedido realizado em ${formatDate(
        order.createdAt
      )}`}
    >
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-[30px] font-extrabold text-[#20170f] sm:text-[34px]">
            Pedido #
            {order.id
              .slice(0, 8)
              .toUpperCase()}
          </h2>

          <p className="mt-1 text-neutral-600">
            Visualize cliente,
            entrega, pagamento,
            produtos e histórico.
          </p>
        </div>

        <Link
          href="/admin/pedidos"
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-5 font-bold text-[#20170f] transition hover:bg-[#faf9f6]"
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

          <div className="space-y-3 break-words text-sm">
            <p>
              <strong>
                Nome:
              </strong>{" "}
              {order.user.name}
            </p>

            <p>
              <strong>
                E-mail:
              </strong>{" "}
              {order.user.email}
            </p>

            <p>
              <strong>
                Telefone:
              </strong>{" "}
              {formatPhone(
                order.user.phone
              )}
            </p>

            <p>
              <strong>
                CPF:
              </strong>{" "}
              {formatCpf(
                order.user.cpf
              )}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <MapPin
                size={21}
              />
            </div>

            <h3 className="text-[20px] font-extrabold text-[#20170f]">
              Entrega
            </h3>
          </div>

          {order.address ? (
            <div className="space-y-3 text-sm">
              <p>
                <strong>
                  CEP:
                </strong>{" "}
                {formatCep(
                  order.address.cep
                )}
              </p>

              <p>
                <strong>
                  Endereço:
                </strong>{" "}
                {
                  order.address
                    .street
                }
                ,{" "}
                {
                  order.address
                    .number
                }
              </p>

              <p>
                <strong>
                  Complemento:
                </strong>{" "}
                {order.address
                  .complement ||
                  "-"}
              </p>

              <p>
                <strong>
                  Bairro:
                </strong>{" "}
                {
                  order.address
                    .neighborhood
                }
              </p>

              <p>
                <strong>
                  Cidade:
                </strong>{" "}
                {
                  order.address
                    .city
                }{" "}
                -{" "}
                {
                  order.address
                    .state
                }
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Sem endereço
              cadastrado.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <CreditCard
                size={21}
              />
            </div>

            <h3 className="text-[20px] font-extrabold text-[#20170f]">
              Pagamento
            </h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong>
                Status do pedido:
              </strong>

              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${getOrderStatusStyle(
                  order.status
                )}`}
              >
                {getOrderStatusLabel(
                  order.status
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong>
                Pagamento:
              </strong>

              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${getPaymentStatusStyle(
                  paymentStatus
                )}`}
              >
                {getPaymentStatusLabel(
                  paymentStatus
                )}
              </span>
            </div>

            <p>
              <strong>
                Método:
              </strong>{" "}
              {order.payment
                ?.paymentMethod ||
                "-"}
            </p>

            <p className="break-all">
              <strong>
                Mercado Pago ID:
              </strong>{" "}
              {order.payment
                ?.mercadoPagoPaymentId ||
                "-"}
            </p>

            <p>
              <strong>
                Total:
              </strong>{" "}
              <span className="font-extrabold text-[#b98218]">
                {formatPrice(
                  order.total
                )}
              </span>
            </p>
          </div>
        </section>
      </div>

      <UpdateOrderStatusForm
        orderId={order.id}
        currentStatus={
          order.status
        }
        trackingCode={
          order.trackingCode
        }
        trackingUrl={
          order.trackingUrl
        }
        carrier={order.carrier}
      />

      <section className="mt-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-[22px] font-extrabold text-[#20170f]">
          Rastreamento
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#faf9f6] p-4">
            <p className="text-xs text-neutral-500">
              Transportadora
            </p>

            <strong>
              {order.carrier ||
                "-"}
            </strong>
          </div>

          <div className="rounded-xl bg-[#faf9f6] p-4">
            <p className="text-xs text-neutral-500">
              Código de rastreio
            </p>

            <strong>
              {order.trackingCode ||
                "-"}
            </strong>
          </div>

          <div className="rounded-xl bg-[#faf9f6] p-4">
            <p className="text-xs text-neutral-500">
              Link
            </p>

            {order.trackingUrl ? (
              <a
                href={
                  order.trackingUrl
                }
                target="_blank"
                rel="noreferrer"
                className="font-bold text-[#b98218] hover:underline"
              >
                Abrir rastreio
              </a>
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

        {order.history.length >
        0 ? (
          <div className="space-y-4">
            {order.history.map(
              (historyItem) => (
                <div
                  key={
                    historyItem.id
                  }
                  className="border-l-4 border-[#b98218] pl-4"
                >
                  <strong className="text-[#20170f]">
                    {
                      historyItem.title
                    }
                  </strong>

                  <p className="text-sm font-medium text-neutral-500">
                    {getOrderStatusLabel(
                      historyItem.status
                    )}
                  </p>

                  {historyItem.message && (
                    <p className="mt-1 text-sm text-neutral-700">
                      {
                        historyItem.message
                      }
                    </p>
                  )}

                  <p className="mt-1 text-xs text-neutral-400">
                    {formatDate(
                      historyItem.createdAt
                    )}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            Nenhuma atualização
            registrada ainda.
          </p>
        )}
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
              {
                order.items
                  .length
              }{" "}
              item(ns) neste pedido
            </p>
          </div>
        </div>

        <div className="divide-y divide-[#eee2cc]">
          {order.items.map(
            (orderItem) => (
              <div
                key={
                  orderItem.id
                }
                className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[90px_1fr_120px_120px_140px] md:items-center"
              >
                <div className="flex h-[75px] w-[75px] items-center justify-center rounded-xl border border-[#e8dcc2] bg-[#fffdf8]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      orderItem.image
                    }
                    alt={
                      orderItem.name
                    }
                    className="max-h-[62px] max-w-[62px] object-contain"
                  />
                </div>

                <div>
                  <p className="font-extrabold text-[#20170f]">
                    {
                      orderItem.name
                    }
                  </p>

                  <p className="break-all text-xs text-neutral-500">
                    Produto ID:{" "}
                    {
                      orderItem.productId
                    }
                  </p>
                </div>

                <p className="text-sm">
                  Qtd:{" "}
                  <strong>
                    {
                      orderItem.quantity
                    }
                  </strong>
                </p>

                <p className="text-sm font-bold">
                  {formatPrice(
                    orderItem.price
                  )}
                </p>

                <p className="text-sm font-extrabold text-[#20170f]">
                  {formatPrice(
                    Number(
                      orderItem.price
                    ) *
                      orderItem.quantity
                  )}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-[22px] font-extrabold text-[#20170f]">
          Resumo financeiro
        </h3>

        <div className="max-w-[430px] space-y-3 text-[15px]">
          <div className="flex justify-between gap-4">
            <span>Subtotal</span>

            <strong>
              {formatPrice(
                order.subtotal
              )}
            </strong>
          </div>

          <div className="flex justify-between gap-4">
            <span>Frete</span>

            <strong>
              {formatPrice(
                order.shipping
              )}
            </strong>
          </div>

          <div className="flex justify-between gap-4">
            <span>Desconto</span>

            <strong>
              {formatPrice(
                order.discount
              )}
            </strong>
          </div>

          <div className="flex justify-between gap-4 border-t border-[#eee2cc] pt-4 text-[20px]">
            <span className="font-extrabold">
              Total
            </span>

            <strong className="text-[#b98218]">
              {formatPrice(
                order.total
              )}
            </strong>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}