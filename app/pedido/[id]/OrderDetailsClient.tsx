"use client";

import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  Circle,
  Clipboard,
  Clock3,
  ExternalLink,
  Headphones,
  House,
  Mail,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

export type OrderDetailsData = {
  id: string;
  status:
    | "PENDING"
    | "PAID"
    | "PROCESSING"
    | "SHIPPED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELED"
    | "REFUNDED"
    | "RETURNED";

  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;

  subtotal: number;
  shipping: number;
  discount: number;
  total: number;

  trackingCode: string | null;
  trackingUrl: string | null;
  carrier: string | null;

  customer: {
    name: string;
    email: string;
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
    status:
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "CANCELED"
      | "REFUNDED";
    method: string | null;
  } | null;

  items: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
    quantity: number;
  }>;

  history: Array<{
    id: string;
    status: string;
    title: string;
    message: string | null;
    createdAt: string;
  }>;
};

const orderStatusLabels = {
  PENDING: "Aguardando pagamento",
  PAID: "Pagamento aprovado",
  PROCESSING: "Preparando pedido",
  SHIPPED: "Pedido enviado",
  OUT_FOR_DELIVERY: "Saiu para entrega",
  DELIVERED: "Pedido entregue",
  CANCELED: "Pedido cancelado",
  REFUNDED: "Pagamento reembolsado",
  RETURNED: "Pedido devolvido",
} satisfies Record<
  OrderDetailsData["status"],
  string
>;

const statusRank = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  CANCELED: -1,
  REFUNDED: -1,
  RETURNED: -1,
} satisfies Record<
  OrderDetailsData["status"],
  number
>;

function formatPrice(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(
    "pt-BR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return email;
  }

  const visibleName = name.slice(0, 2);

  return `${visibleName}${"*".repeat(
    Math.max(3, name.length - 2)
  )}@${domain}`;
}

function formatCep(cep: string) {
  const digits = cep.replace(/\D/g, "");

  if (digits.length !== 8) {
    return cep;
  }

  return `${digits.slice(
    0,
    5
  )}-${digits.slice(5)}`;
}

function getPaymentMethodLabel(
  method: string | null
) {
  if (!method) {
    return "Não informado";
  }

  const normalized =
    method.toLowerCase();

  if (normalized === "pix") {
    return "Pix";
  }

  if (
    normalized.includes("bol") ||
    normalized.includes("ticket")
  ) {
    return "Boleto bancário";
  }

  if (
    normalized.includes("debit")
  ) {
    return "Cartão de débito";
  }

  const cardNames: Record<
    string,
    string
  > = {
    visa: "Cartão Visa",
    master: "Cartão Mastercard",
    amex: "American Express",
    elo: "Cartão Elo",
    hipercard: "Hipercard",
  };

  return (
    cardNames[normalized] ||
    `Cartão — ${method.toUpperCase()}`
  );
}

export default function OrderDetailsClient({
  order,
}: {
  order: OrderDetailsData;
}) {
  const router = useRouter();

  const [copied, setCopied] =
    useState(false);

  const shouldPoll =
    order.status === "PENDING" ||
    order.payment?.status === "PENDING";

  const paymentApproved =
    order.payment?.status === "APPROVED" ||
    [
      "PAID",
      "PROCESSING",
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
    ].includes(order.status);

  useEffect(() => {
    /*
     * Remove o status enviado pela URL.
     * Ele não é utilizado como fonte de verdade.
     */
    const currentUrl = new URL(
      window.location.href
    );

    if (
      currentUrl.searchParams.has(
        "status"
      )
    ) {
      currentUrl.searchParams.delete(
        "status"
      );

      window.history.replaceState(
        null,
        "",
        currentUrl.pathname +
          currentUrl.search
      );
    }
  }, []);

  useEffect(() => {
    if (!paymentApproved) {
      return;
    }

    window.localStorage.removeItem(
      "laico-cart"
    );

    window.localStorage.removeItem(
      "laico-checkout"
    );

    window.dispatchEvent(
      new Event("laico-cart-updated")
    );
  }, [paymentApproved]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const interval =
      window.setInterval(() => {
        router.refresh();
      }, 10000);

    return () =>
      window.clearInterval(interval);
  }, [router, shouldPoll]);

  const timeline = useMemo(
    () => [
      {
        status: "PENDING",
        title: "Pedido realizado",
        description:
          "Recebemos os dados da compra.",
        icon: ShoppingBag,
      },
      {
        status: "PAID",
        title: "Pagamento aprovado",
        description:
          "Pagamento confirmado pelo Mercado Pago.",
        icon: BadgeCheck,
      },
      {
        status: "PROCESSING",
        title: "Preparando pedido",
        description:
          "Os produtos estão sendo separados.",
        icon: PackageCheck,
      },
      {
        status: "SHIPPED",
        title: "Enviado pelos Correios",
        description:
          "O pedido foi postado para entrega.",
        icon: Truck,
      },
      {
        status: "OUT_FOR_DELIVERY",
        title: "Saiu para entrega",
        description:
          "O pedido está a caminho do endereço.",
        icon: MapPin,
      },
      {
        status: "DELIVERED",
        title: "Pedido entregue",
        description:
          "Entrega concluída.",
        icon: CheckCircle2,
      },
    ],
    []
  );

  const currentRank =
    statusRank[order.status];

  const isProblemStatus = [
    "CANCELED",
    "REFUNDED",
    "RETURNED",
  ].includes(order.status);

  const trackingAddress =
    "https://rastreamento.correios.com.br/app/index.php";

  async function copyOrderId() {
    try {
      await navigator.clipboard.writeText(
        order.id
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        2000
      );
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] py-8">
      <section className="mx-auto max-w-[1180px] px-4 sm:px-6">
        <div
          className={`overflow-hidden rounded-[12px] border p-6 text-center shadow-sm sm:p-9 ${
            isProblemStatus
              ? "border-red-200 bg-red-50"
              : paymentApproved
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
          }`}
        >
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
              isProblemStatus
                ? "bg-red-100 text-red-700"
                : paymentApproved
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
            }`}
          >
            {isProblemStatus ? (
              <AlertCircle size={34} />
            ) : paymentApproved ? (
              <CheckCircle2 size={34} />
            ) : (
              <Clock3 size={34} />
            )}
          </div>

          <h1 className="mt-5 text-[26px] font-black text-[#1f1b16] sm:text-[34px]">
            {orderStatusLabels[
              order.status
            ]}
          </h1>

          <p className="mx-auto mt-2 max-w-[680px] text-[14px] leading-6 text-neutral-600 sm:text-[15px]">
            {paymentApproved
              ? `Obrigado pela compra, ${order.customer.name}. Seu pedido foi confirmado e seguirá para preparação.`
              : isProblemStatus
                ? "Consulte os detalhes abaixo ou fale com nosso atendimento."
                : "Estamos aguardando a confirmação do Mercado Pago. Esta página será atualizada automaticamente."}
          </p>

          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-[13px]">
            <strong>
              Pedido #{order.id.toUpperCase()}
            </strong>

            <button
              type="button"
              onClick={copyOrderId}
              aria-label="Copiar número do pedido"
              className="text-[#b98218]"
            >
              {copied ? (
                <Check size={17} />
              ) : (
                <Clipboard size={17} />
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-[20px] font-bold">
                    Acompanhamento
                  </h2>

                  <p className="mt-1 text-[13px] text-neutral-500">
                    Última atualização:{" "}
                    {formatDate(
                      order.updatedAt
                    )}
                  </p>
                </div>

                {shouldPoll && (
                  <RefreshCw className="animate-spin text-[#b98218]" />
                )}
              </div>

              {isProblemStatus ? (
                <div className="mt-6 rounded-[8px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  O fluxo deste pedido foi
                  interrompido com o status:{" "}
                  <strong>
                    {
                      orderStatusLabels[
                        order.status
                      ]
                    }
                  </strong>
                  .
                </div>
              ) : (
                <div className="mt-7 space-y-0">
                  {timeline.map(
                    (step, index) => {
                      const stepRank =
                        statusRank[
                          step.status as
                            | "PENDING"
                            | "PAID"
                            | "PROCESSING"
                            | "SHIPPED"
                            | "OUT_FOR_DELIVERY"
                            | "DELIVERED"
                        ];

                      const completed =
                        currentRank >= stepRank;

                      const Icon = step.icon;

                      return (
                        <div
                          key={step.status}
                          className="relative flex gap-4 pb-7 last:pb-0"
                        >
                          {index <
                            timeline.length -
                              1 && (
                            <div
                              className={`absolute left-[19px] top-10 h-[calc(100%-40px)] w-[2px] ${
                                currentRank >
                                stepRank
                                  ? "bg-emerald-500"
                                  : "bg-neutral-200"
                              }`}
                            />
                          )}

                          <div
                            className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                              completed
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-neutral-300 bg-white text-neutral-400"
                            }`}
                          >
                            {completed ? (
                              <Check size={19} />
                            ) : (
                              <Icon size={18} />
                            )}
                          </div>

                          <div className="pt-1">
                            <p
                              className={`font-bold ${
                                completed
                                  ? "text-neutral-900"
                                  : "text-neutral-500"
                              }`}
                            >
                              {step.title}
                            </p>

                            <p className="mt-1 text-[13px] text-neutral-500">
                              {
                                step.description
                              }
                            </p>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-[20px] font-bold">
                <ShoppingBag size={21} />
                Produtos
              </h2>

              <div className="mt-5 divide-y divide-[#eee4d1]">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[7px] border border-[#e8dcc2] bg-[#fffdf8]">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-h-[64px] max-w-[64px] object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {item.name}
                      </p>

                      <p className="mt-1 text-[13px] text-neutral-500">
                        Quantidade:{" "}
                        {item.quantity}
                      </p>
                    </div>

                    <strong className="text-[14px]">
                      {formatPrice(
                        item.price *
                          item.quantity
                      )}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            {order.history.length > 0 && (
              <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
                <h2 className="text-[20px] font-bold">
                  Histórico
                </h2>

                <div className="mt-5 space-y-4">
                  {order.history.map(
                    (entry) => (
                      <div
                        key={entry.id}
                        className="flex gap-3"
                      >
                        <Circle
                          size={10}
                          className="mt-2 shrink-0 fill-[#b98218] text-[#b98218]"
                        />

                        <div>
                          <p className="font-semibold">
                            {entry.title}
                          </p>

                          {entry.message && (
                            <p className="mt-1 text-[13px] text-neutral-500">
                              {
                                entry.message
                              }
                            </p>
                          )}

                          <p className="mt-1 text-[12px] text-neutral-400">
                            {formatDate(
                              entry.createdAt
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <h2 className="text-[20px] font-bold">
                Resumo
              </h2>

              <div className="mt-5 space-y-4 text-[14px]">
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

                {order.discount > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-700">
                    <span>Desconto</span>
                    <strong>
                      -
                      {formatPrice(
                        order.discount
                      )}
                    </strong>
                  </div>
                )}

                <div className="flex justify-between gap-4 border-t border-[#e8dcc2] pt-4 text-[18px]">
                  <strong>Total</strong>

                  <strong className="text-[#b98218]">
                    {formatPrice(
                      order.total
                    )}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-[18px] font-bold">
                <Banknote size={20} />
                Pagamento
              </h2>

              <div className="mt-4 space-y-3 text-[14px]">
                <div>
                  <p className="text-neutral-500">
                    Forma de pagamento
                  </p>

                  <p className="mt-1 font-semibold">
                    {getPaymentMethodLabel(
                      order.payment?.method ??
                        null
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500">
                    Status
                  </p>

                  <p className="mt-1 font-semibold">
                    {order.payment?.status ===
                    "APPROVED"
                      ? "Aprovado"
                      : order.payment
                            ?.status ===
                          "REJECTED"
                        ? "Recusado"
                        : order.payment
                              ?.status ===
                            "REFUNDED"
                          ? "Reembolsado"
                          : "Aguardando confirmação"}
                  </p>
                </div>

                <div>
                  <p className="text-neutral-500">
                    Pedido criado em
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatDate(
                      order.createdAt
                    )}
                  </p>
                </div>
              </div>
            </section>

            {order.address && (
              <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-[18px] font-bold">
                  <MapPin size={20} />
                  Endereço de entrega
                </h2>

                <address className="mt-4 text-[14px] not-italic leading-6 text-neutral-600">
                  <strong className="text-neutral-900">
                    {order.customer.name}
                  </strong>
                  <br />
                  {order.address.street},{" "}
                  {order.address.number}
                  {order.address
                    .complement
                    ? ` — ${order.address.complement}`
                    : ""}
                  <br />
                  {
                    order.address
                      .neighborhood
                  }
                  <br />
                  {order.address.city} —{" "}
                  {order.address.state}
                  <br />
                  CEP{" "}
                  {formatCep(
                    order.address.cep
                  )}
                </address>
              </section>
            )}

            <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-[18px] font-bold">
                <Truck size={20} />
                Entrega
              </h2>

              <p className="mt-4 text-[14px] text-neutral-600">
                Transportadora:{" "}
                <strong>
                  {order.carrier ||
                    "Correios"}
                </strong>
              </p>

              {order.trackingCode ? (
                <>
                  <p className="mt-3 text-[13px] text-neutral-500">
                    Código de rastreamento
                  </p>

                  <p className="mt-1 break-all font-bold">
                    {order.trackingCode}
                  </p>

                  <a
                    href={trackingAddress}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[#b98218] px-4 font-bold text-white"
                  >
                    Rastrear nos Correios
                    <ExternalLink
                      size={17}
                    />
                  </a>
                </>
              ) : (
                <p className="mt-3 text-[13px] leading-5 text-neutral-500">
                  O código de rastreamento
                  aparecerá aqui assim que o
                  pedido for postado.
                </p>
              )}
            </section>

            <section className="rounded-[10px] border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <div className="flex gap-3">
                <Mail className="shrink-0 text-[#b98218]" />

                <div>
                  <p className="font-bold">
                    Atualizações por e-mail
                  </p>

                  <p className="mt-1 text-[13px] leading-5 text-neutral-500">
                    Enviaremos as atualizações
                    para{" "}
                    {maskEmail(
                      order.customer.email
                    )}.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] border border-[#b98218] px-6 font-bold text-[#8b6216]"
          >
            <House size={18} />
            Continuar comprando
          </Link>

          <Link
            href="/meus-pedidos"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] bg-[#b98218] px-6 font-bold text-white"
          >
            <PackageCheck size={18} />
            Meus pedidos
          </Link>

          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] border border-neutral-300 bg-white px-6 font-bold"
          >
            <Headphones size={18} />
            Atendimento
          </a>
        </div>

        {order.payment?.status ===
          "REJECTED" && (
          <div className="mt-5 text-center">
            <Link
              href="/checkout"
              className="inline-flex items-center gap-2 font-bold text-[#b98218]"
            >
              <RotateCcw size={17} />
              Tentar outro pagamento
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}