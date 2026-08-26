import {
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import {
  cookies,
} from "next/headers";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import AccountHeader from "@/components/account/AccountHeader";
import Footer from "@/components/Footer";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

import {
  getOrderAccessCookieName,
  verifyOrderAccessToken,
} from "@/lib/order-access";

import {
  prisma,
} from "@/lib/prisma";

import styles from "./Pedido.module.css";

export const dynamic =
  "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const statusLabels: Record<
  string,
  string
> = {
  PENDING:
    "Aguardando pagamento",

  PAID:
    "Pagamento aprovado",

  PROCESSING:
    "Pedido em preparação",

  SHIPPED:
    "Pedido enviado",

  OUT_FOR_DELIVERY:
    "Saiu para entrega",

  DELIVERED:
    "Pedido entregue",

  CANCELED:
    "Pedido cancelado",

  REFUNDED:
    "Pagamento reembolsado",

  RETURNED:
    "Pedido devolvido",
};

const paymentStatusLabels: Record<
  string,
  string
> = {
  PENDING:
    "Pagamento pendente",

  APPROVED:
    "Pagamento aprovado",

  REJECTED:
    "Pagamento recusado",

  CANCELED:
    "Pagamento cancelado",

  REFUNDED:
    "Pagamento reembolsado",
};

const normalStatusOrder: Record<
  string,
  number
> = {
  PENDING: 0,
  PAID: 1,
  PROCESSING: 2,
  SHIPPED: 3,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

function isValidOrderId(
  orderId: string
) {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    orderId
  );
}

function formatPrice(
  value: unknown
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "R$ 0,00";
  }

  return number.toLocaleString(
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

function getSafeExternalUrl(
  value: string | null
) {
  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(value);

    if (
      url.protocol !==
        "https:" &&
      url.protocol !==
        "http:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function getPaymentMethodLabel(
  method:
    | string
    | null
    | undefined
) {
  if (!method) {
    return "Não informado";
  }

  const normalized =
    method.toLowerCase();

  const labels: Record<
    string,
    string
  > = {
    pix: "PIX",
    credit_card:
      "Cartão de crédito",
    debit_card:
      "Cartão de débito",
    ticket:
      "Boleto bancário",
    bolbradesco:
      "Boleto bancário",
    account_money:
      "Saldo Mercado Pago",
  };

  return (
    labels[normalized] ??
    method
  );
}

function getHistoryDate(
  history: Array<{
    status: string;
    createdAt: Date;
  }>,
  statuses: string[]
) {
  const item =
    [...history]
      .reverse()
      .find(
        (historyItem) =>
          statuses.includes(
            historyItem.status
          )
      );

  return item
    ? formatDate(
        item.createdAt
      )
    : null;
}

export default async function UserOrderDetailsPage({
  params,
}: Props) {
  const { id } =
    await params;

  if (
    !id ||
    !isValidOrderId(id)
  ) {
    notFound();
  }

  /*
   * =====================================================
   * AUTORIZAÇÃO
   * =====================================================
   */

  const customerSession =
    await getCustomerSession();

  let authorizedUserId:
    | string
    | null = null;

  if (customerSession) {
    authorizedUserId =
      customerSession.userId;
  } else {
    const cookieStore =
      await cookies();

    const accessToken =
      cookieStore.get(
        getOrderAccessCookieName(
          id
        )
      )?.value;

    if (!accessToken) {
      notFound();
    }

    const access =
      await verifyOrderAccessToken({
        token:
          accessToken,

        expectedOrderId:
          id,
      });

    if (
      !access ||
      access.orderId !==
        id
    ) {
      notFound();
    }

    authorizedUserId =
      access.userId;
  }

  if (!authorizedUserId) {
    notFound();
  }

  /*
   * =====================================================
   * PEDIDO
   * =====================================================
   */

  const order =
    await prisma.order.findFirst({
      where: {
        id,

        userId:
          authorizedUserId,
      },

      select: {
        id:
          true,

        userId:
          true,

        status:
          true,

        subtotal:
          true,

        shipping:
          true,

        discount:
          true,

        total:
          true,

        createdAt:
          true,

        trackingCode:
          true,

        trackingUrl:
          true,

        carrier:
          true,

        user: {
          select: {
            name:
              true,

            email:
              true,
          },
        },

        address: {
          select: {
            name:
              true,

            cep:
              true,

            state:
              true,

            city:
              true,

            neighborhood:
              true,

            street:
              true,

            number:
              true,

            complement:
              true,
          },
        },

        payment: {
          select: {
            status:
              true,

            provider:
              true,

            paymentMethod:
              true,

            createdAt:
              true,

            updatedAt:
              true,
          },
        },

        items: {
          select: {
            id:
              true,

            name:
              true,

            image:
              true,

            price:
              true,

            quantity:
              true,

            createdAt:
              true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },

        history: {
          select: {
            id:
              true,

            status:
              true,

            title:
              true,

            message:
              true,

            createdAt:
              true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });

  if (
    !order ||
    order.userId !==
      authorizedUserId
  ) {
    notFound();
  }

  const safeTrackingUrl =
    getSafeExternalUrl(
      order.trackingUrl
    );

  const exceptionalStatus =
    [
      "CANCELED",
      "REFUNDED",
      "RETURNED",
    ].includes(
      order.status
    );

  const currentStep =
    normalStatusOrder[
      order.status
    ] ?? 0;

  const orderCode =
    `LAICO-${order.id
      .slice(0, 8)
      .toUpperCase()}`;

  const progressSteps = [
    {
      key: "PENDING",
      title: "Recebido",
      icon: Clock3,
      date:
        formatDate(
          order.createdAt
        ),
    },
    {
      key: "PAID",
      title: "Pago",
      icon:
        CircleDollarSign,
      date:
        getHistoryDate(
          order.history,
          [
            "PAID",
          ]
        ) ??
        (
          order.payment
            ?.status ===
          "APPROVED"
            ? formatDate(
                order.payment.updatedAt
              )
            : null
        ),
    },
    {
      key: "PROCESSING",
      title: "Em preparação",
      icon:
        ClipboardList,
      date:
        getHistoryDate(
          order.history,
          [
            "PROCESSING",
          ]
        ),
    },
    {
      key: "SHIPPED",
      title: "Enviado",
      icon: Truck,
      date:
        getHistoryDate(
          order.history,
          [
            "SHIPPED",
            "OUT_FOR_DELIVERY",
          ]
        ),
    },
    {
      key: "DELIVERED",
      title: "Entregue",
      icon:
        CheckCircle2,
      date:
        getHistoryDate(
          order.history,
          [
            "DELIVERED",
          ]
        ),
    },
  ];

  return (
    <main className={styles.page}>
      <AccountHeader />

      <div className={styles.container}>
        {/* SAUDAÇÃO */}

        <div className={styles.welcome}>
          <p>
            Olá{" "}

            <strong>
              {order.user.name}!
            </strong>{" "}

            Acompanhe os detalhes e o andamento do seu pedido.
          </p>

          <Link
            href="/catalogo"
            className={styles.storeButton}
          >
            <Store size={17} />

            Voltar para a loja
          </Link>
        </div>

        <div className={styles.layout}>
          {/* MENU LATERAL */}

          <aside className={styles.sidebar}>
            <nav className={styles.sidebarNavigation}>
              <Link
                href="/minha-conta#pedidos"
                className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`}
              >
                <Package size={18} />

                Meus pedidos
              </Link>

              <Link
                href="/minha-conta#dados-pessoais"
                className={styles.sidebarLink}
              >
                <UserRound size={18} />

                Dados pessoais
              </Link>

              <Link
                href="/minha-conta#enderecos"
                className={styles.sidebarLink}
              >
                <MapPin size={18} />

                Endereço de entrega
              </Link>

              <Link
                href="/minha-conta#seguranca"
                className={styles.sidebarLink}
              >
                <KeyRound size={18} />

                Alterar senha
              </Link>

              <Link
                href="/minha-conta#configuracoes"
                className={styles.sidebarLink}
              >
                <Settings size={18} />

                Configurações
              </Link>

              <Link
                href="/minha-conta#configuracoes"
                className={`${styles.sidebarLink} ${styles.logoutLink}`}
              >
                <LogOut size={18} />

                Sair
              </Link>
            </nav>
          </aside>

          {/* CONTEÚDO */}

          <div className={styles.content}>
            {/* PROGRESSO */}

            <section className={styles.statusSection}>
              <div className={styles.statusHeader}>
                <strong>
                  Status do pedido
                </strong>

                <span>
                  {orderCode}
                </span>
              </div>

              {exceptionalStatus && (
                <div
                  className={`${styles.exceptionalStatus} ${
                    order.status ===
                    "CANCELED"
                      ? styles.exceptionalCanceled
                      : order.status ===
                          "REFUNDED"
                        ? styles.exceptionalRefunded
                        : styles.exceptionalReturned
                  }`}
                >
                  <strong>
                    {statusLabels[
                      order.status
                    ]}
                  </strong>

                  <span>
                    Consulte o histórico abaixo para mais informações.
                  </span>
                </div>
              )}

              <div className={styles.progress}>
                {progressSteps.map(
                  (
                    step,
                    index
                  ) => {
                    const Icon =
                      step.icon;

                    const completed =
                      !exceptionalStatus &&
                      index <=
                        currentStep;

                    const current =
                      !exceptionalStatus &&
                      index ===
                        currentStep;

                    return (
                      <div
                        key={
                          step.key
                        }
                        className={`${styles.progressStep} ${
                          completed
                            ? styles.progressStepCompleted
                            : ""
                        } ${
                          current
                            ? styles.progressStepCurrent
                            : ""
                        }`}
                      >
                        <div className={styles.progressIcon}>
                          <Icon size={24} />
                        </div>

                        <strong>
                          {
                            step.title
                          }
                        </strong>

                        <span>
                          {step.date ??
                            "—"}
                        </span>

                        {index <
                          progressSteps.length -
                            1 && (
                          <div
                            className={`${styles.progressLine} ${
                              !exceptionalStatus &&
                              index <
                                currentStep
                                ? styles.progressLineCompleted
                                : ""
                            }`}
                          />
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* DUAS COLUNAS */}

            <div className={styles.detailsGrid}>
              <div className={styles.detailsColumn}>
                {/* PAGAMENTO */}

                <section className={styles.card}>
                  <h2>
                    Forma de pagamento
                  </h2>

                  <div className={styles.cardContent}>
                    <strong>
                      {getPaymentMethodLabel(
                        order.payment
                          ?.paymentMethod
                      )}
                    </strong>

                    <span
                      className={`${styles.paymentStatus} ${
                        order.payment
                          ?.status ===
                        "APPROVED"
                          ? styles.paymentApproved
                          : order.payment
                                ?.status ===
                              "REJECTED" ||
                            order.payment
                                ?.status ===
                              "CANCELED"
                            ? styles.paymentRejected
                            : order.payment
                                  ?.status ===
                                "REFUNDED"
                              ? styles.paymentRefunded
                              : styles.paymentPending
                      }`}
                    >
                      {order.payment
                        ? paymentStatusLabels[
                            order
                              .payment
                              .status
                          ] ??
                          order.payment
                            .status
                        : "Pagamento não encontrado"}
                    </span>
                  </div>
                </section>

                {/* ENDEREÇO */}

                <section className={styles.card}>
                  <h2>
                    Endereço de entrega
                  </h2>

                  <div className={styles.cardContent}>
                    {order.address ? (
                      <address className={styles.address}>
                        <strong>
                          Destinatário:
                        </strong>{" "}

                        {
                          order.address.name
                        }

                        <br />

                        <strong>
                          Endereço:
                        </strong>{" "}

                        {
                          order.address.street
                        }
                        ,{" "}
                        {
                          order.address.number
                        }

                        {order.address
                          .complement
                          ? `, ${order.address.complement}`
                          : ""}

                        <br />

                        {
                          order.address.neighborhood
                        }
                        ,{" "}
                        {
                          order.address.city
                        }
                        -
                        {
                          order.address.state
                        }

                        <br />

                        <strong>
                          CEP:
                        </strong>{" "}

                        {
                          order.address.cep
                        }
                      </address>
                    ) : (
                      <p>
                        Endereço não disponível.
                      </p>
                    )}
                  </div>
                </section>

                {/* FRETE */}

                <section className={styles.card}>
                  <h2>
                    Frete
                  </h2>

                  <div className={styles.cardContent}>
                    <p>
                      <strong>
                        Transportadora:
                      </strong>{" "}

                      {order.carrier ||
                        "A definir"}
                    </p>

                    <p>
                      <strong>
                        Valor:
                      </strong>{" "}

                      {formatPrice(
                        order.shipping
                      )}
                    </p>

                    {order.trackingCode && (
                      <>
                        <p>
                          <strong>
                            Código de rastreio:
                          </strong>{" "}

                          {
                            order.trackingCode
                          }
                        </p>

                        {safeTrackingUrl && (
                          <a
                            href={
                              safeTrackingUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.trackingButton}
                          >
                            <Truck size={16} />

                            Acompanhar entrega
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </section>

                {/* HISTÓRICO */}

                <section className={styles.card}>
                  <h2>
                    Histórico do pedido
                  </h2>

                  <div className={styles.history}>
                    {order.history.map(
                      (
                        historyItem
                      ) => (
                        <div
                          key={
                            historyItem.id
                          }
                          className={styles.historyItem}
                        >
                          <span className={styles.historyDot} />

                          <div>
                            <strong>
                              {
                                historyItem.title
                              }
                            </strong>

                            {historyItem.message && (
                              <p>
                                {
                                  historyItem.message
                                }
                              </p>
                            )}

                            <small>
                              {formatDate(
                                historyItem.createdAt
                              )}
                            </small>
                          </div>
                        </div>
                      )
                    )}

                    {order.history.length ===
                      0 && (
                      <p className={styles.emptyHistory}>
                        O pedido ainda não possui atualizações.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* RESUMO */}

              <section className={styles.summaryCard}>
                <h2>
                  Resumo do pedido
                </h2>

                <div className={styles.products}>
                  {order.items.map(
                    (
                      item
                    ) => (
                      <article
                        key={
                          item.id
                        }
                        className={styles.product}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            item.image
                          }
                          alt={
                            item.name
                          }
                        />

                        <div className={styles.productInformation}>
                          <strong>
                            {
                              item.name
                            }
                          </strong>

                          <span>
                            {formatPrice(
                              item.price
                            )}
                          </span>
                        </div>

                        <div className={styles.productFooter}>
                          <span>
                            Quantidade:{" "}

                            <strong>
                              {
                                item.quantity
                              }
                            </strong>
                          </span>

                          <strong>
                            {formatPrice(
                              Number(
                                item.price
                              ) *
                                item.quantity
                            )}
                          </strong>
                        </div>
                      </article>
                    )
                  )}
                </div>

                <div className={styles.totals}>
                  <div>
                    <span>
                      Total dos itens
                    </span>

                    <strong>
                      {formatPrice(
                        order.subtotal
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Frete
                    </span>

                    <strong>
                      {formatPrice(
                        order.shipping
                      )}
                    </strong>
                  </div>

                  {Number(
                    order.discount
                  ) > 0 && (
                    <div>
                      <span>
                        Desconto
                      </span>

                      <strong className={styles.discount}>
                        -
                        {formatPrice(
                          order.discount
                        )}
                      </strong>
                    </div>
                  )}

                  <div className={styles.total}>
                    <span>
                      Total
                    </span>

                    <strong>
                      {formatPrice(
                        order.total
                      )}
                    </strong>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}