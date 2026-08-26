import {
  ChevronRight,
  Clock3,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import AccountActions from "@/components/account/AccountActions";
import AccountAddresses from "@/components/account/AccountAddresses";
import AccountHeader from "@/components/account/AccountHeader";
import AccountPasswordForm from "@/components/account/AccountPasswordForm";
import AccountProfileForm from "@/components/account/AccountProfileForm";
import Footer from "@/components/Footer";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

import {
  prisma,
} from "@/lib/prisma";

import styles from "./MinhaConta.module.css";

export const dynamic =
  "force-dynamic";

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

function getStatusLabel(
  status: string
) {
  const labels: Record<
    string,
    string
  > = {
    PENDING:
      "Aguardando pagamento",

    PAID:
      "Pagamento aprovado",

    PROCESSING:
      "Em preparação",

    SHIPPED:
      "Pedido enviado",

    OUT_FOR_DELIVERY:
      "Saiu para entrega",

    DELIVERED:
      "Entregue",

    CANCELED:
      "Cancelado",

    REFUNDED:
      "Reembolsado",

    RETURNED:
      "Devolvido",
  };

  return (
    labels[status] ??
    status
  );
}

function getStatusClass(
  status: string
) {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return styles.statusSuccess;

    case "PROCESSING":
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return styles.statusShipping;

    case "CANCELED":
    case "RETURNED":
      return styles.statusCanceled;

    case "REFUNDED":
      return styles.statusRefunded;

    default:
      return styles.statusPending;
  }
}

export default async function MinhaContaPage() {
  const session =
    await getCustomerSession();

  if (!session) {
    redirect(
      "/entrar?redirect=/minha-conta"
    );
  }

  const user =
    await prisma.user.findFirst({
      where: {
        id:
          session.userId,

        role:
          "USER",

        accountStatus:
          "ACTIVE",

        emailVerifiedAt: {
          not: null,
        },

        disabledAt:
          null,
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,

        _count: {
          select: {
            addresses: {
              where: {
                archivedAt:
                  null,
              },
            },

            orders:
              true,
          },
        },

        addresses: {
          where: {
            archivedAt:
              null,
          },

          orderBy: [
            {
              isDefault:
                "desc",
            },
            {
              createdAt:
                "desc",
            },
          ],

          take: 10,

          select: {
            id: true,
            name: true,
            cep: true,
            state: true,
            city: true,
            neighborhood: true,
            street: true,
            number: true,
            complement: true,
            isDefault: true,
          },
        },
      },
    });

  if (!user) {
    redirect(
      "/entrar"
    );
  }

  const orders =
    await prisma.order.findMany({
      where: {
        userId:
          session.userId,
      },

      orderBy: {
        createdAt:
          "desc",
      },

      take: 20,

      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        trackingCode: true,

        items: {
          select: {
            id: true,
          },
        },
      },
    });

  return (
    <main className={styles.page}>
      <AccountHeader />

      <div className={styles.container}>
        {/* SAUDAÇÃO */}

        <div className={styles.welcome}>
          <p>
            Olá{" "}

            <strong>
              {user.name}!
            </strong>{" "}

            Acompanhe seus pedidos e seus dados cadastrais.
          </p>

          <Link
            href="/catalogo"
            className={styles.storeButton}
          >
            <Store size={17} />

            Voltar para a loja
          </Link>
        </div>

        <div className={styles.accountLayout}>
          {/* MENU LATERAL */}

          <aside className={styles.sidebar}>
            <nav className={styles.sidebarNavigation}>
              <Link
                href="#pedidos"
                className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`}
              >
                <Package size={18} />

                <span>
                  Meus pedidos
                </span>

                <strong>
                  {user._count.orders}
                </strong>
              </Link>

              <Link
                href="#dados-pessoais"
                className={styles.sidebarLink}
              >
                <UserRound size={18} />

                <span>
                  Dados pessoais
                </span>
              </Link>

              <Link
                href="#enderecos"
                className={styles.sidebarLink}
              >
                <MapPin size={18} />

                <span>
                  Endereços de entrega
                </span>

                <strong>
                  {user._count.addresses}
                </strong>
              </Link>

              <Link
                href="#seguranca"
                className={styles.sidebarLink}
              >
                <KeyRound size={18} />

                <span>
                  Alterar senha
                </span>
              </Link>

              <Link
                href="#configuracoes"
                className={styles.sidebarLink}
              >
                <Settings size={18} />

                <span>
                  Configurações
                </span>
              </Link>

              <Link
                href="#configuracoes"
                className={`${styles.sidebarLink} ${styles.logoutLink}`}
              >
                <LogOut size={18} />

                <span>
                  Sair
                </span>
              </Link>
            </nav>
          </aside>

          {/* CONTEÚDO */}

          <div className={styles.content}>
            {/* PEDIDOS */}

            <section
              id="pedidos"
              className={`${styles.section} ${styles.anchor}`}
            >
              <div className={styles.sectionHeader}>
                <div>
                  <h1>
                    Meus pedidos
                  </h1>

                  <p>
                    Acompanhe suas compras e entregas.
                  </p>
                </div>

                <div className={styles.sectionIcon}>
                  <ShoppingBag size={21} />
                </div>
              </div>

              {orders.length === 0 ? (
                <div className={styles.emptyState}>
                  <ShoppingBag size={38} />

                  <strong>
                    Nenhum pedido realizado
                  </strong>

                  <p>
                    Quando você fizer uma compra, ela aparecerá aqui.
                  </p>

                  <Link
                    href="/catalogo"
                    className={styles.primaryButton}
                  >
                    Ver produtos
                  </Link>
                </div>
              ) : (
                <div className={styles.orderList}>
                  <div className={styles.orderTableHeader}>
                    <span>
                      Pedido
                    </span>

                    <span>
                      Valor
                    </span>

                    <span>
                      Status
                    </span>

                    <span>
                      Detalhes
                    </span>
                  </div>

                  {orders.map(
                    (
                      order
                    ) => (
                      <article
                        key={order.id}
                        className={styles.orderItem}
                      >
                        <div className={styles.orderIdentity}>
                          <strong>
                            LAICO-
                            {order.id
                              .slice(0, 8)
                              .toUpperCase()}
                          </strong>

                          <span>
                            <Clock3 size={13} />

                            {formatDate(
                              order.createdAt
                            )}
                          </span>

                          <small>
                            {
                              order.items.length
                            }{" "}
                            produto(s)
                          </small>
                        </div>

                        <strong className={styles.orderPrice}>
                          {formatPrice(
                            order.total
                          )}
                        </strong>

                        <div className={styles.orderStatus}>
                          <span
                            className={`${styles.statusBadge} ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(
                              order.status
                            )}
                          </span>

                          {order.trackingCode && (
                            <small>
                              Rastreio disponível
                            </small>
                          )}
                        </div>

                        <Link
                          href={`/meus-pedidos/${order.id}`}
                          className={styles.detailsButton}
                          aria-label="Ver detalhes do pedido"
                        >
                          <span>
                            Ver detalhes
                          </span>

                          <ChevronRight size={17} />
                        </Link>
                      </article>
                    )
                  )}
                </div>
              )}
            </section>

            {/* RESUMO */}

            <div className={styles.summaryGrid}>
              <div className={styles.summaryCard}>
                <ShoppingBag size={21} />

                <div>
                  <strong>
                    {user._count.orders}
                  </strong>

                  <span>
                    Pedidos
                  </span>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <MapPin size={21} />

                <div>
                  <strong>
                    {user._count.addresses}
                  </strong>

                  <span>
                    Endereços
                  </span>
                </div>
              </div>

              <div className={styles.summaryCard}>
                <ShieldCheck size={21} />

                <div>
                  <strong>
                    Conta verificada
                  </strong>

                  <span>
                    E-mail confirmado
                  </span>
                </div>
              </div>
            </div>

            {/* DADOS PESSOAIS */}

            <section
              id="dados-pessoais"
              className={`${styles.componentSection} ${styles.anchor}`}
            >
              <AccountProfileForm
                initialName={
                  user.name
                }
                initialPhone={
                  user.phone
                }
                email={
                  user.email
                }
              />
            </section>

            {/* ENDEREÇOS */}

            <section
              id="enderecos"
              className={`${styles.componentSection} ${styles.anchor}`}
            >
              <AccountAddresses
                initialAddresses={
                  user.addresses
                }
              />
            </section>

            {/* SENHA */}

            <section
              id="seguranca"
              className={`${styles.componentSection} ${styles.anchor}`}
            >
              <AccountPasswordForm />
            </section>

            {/* CONFIGURAÇÕES */}

            <section
              id="configuracoes"
              className={`${styles.componentSection} ${styles.anchor}`}
            >
              <AccountActions />
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}