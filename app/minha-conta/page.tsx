import {
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import Link from "next/link";
import { redirect } from "next/navigation";

import AccountActions from "@/components/account/AccountActions";
import AccountAddresses from "@/components/account/AccountAddresses";
import AccountPasswordForm from "@/components/account/AccountPasswordForm";
import AccountProfileForm from "@/components/account/AccountProfileForm";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

function formatPrice(
  value: unknown
) {
  return Number(
    value
  ).toLocaleString(
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
      dateStyle:
        "medium",
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

function getStatusStyle(
  status: string
) {
  switch (status) {
    case "PAID":
    case "DELIVERED":
      return "bg-green-100 text-green-700";

    case "PROCESSING":
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return "bg-blue-100 text-blue-700";

    case "CANCELED":
    case "RETURNED":
      return "bg-red-100 text-red-700";

    case "REFUNDED":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-[#fff8e8] text-[#b98218]";
  }
}

export default async function MinhaContaPage() {
  /*
   * =====================================================
   * SESSÃO
   * =====================================================
   */

  const session =
    await getCustomerSession();

  if (!session) {
    redirect(
      "/entrar?redirect=/minha-conta"
    );
  }

  /*
   * =====================================================
   * USUÁRIO
   * =====================================================
   */

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

          take:
            10,

          select: {
            id: true,
            name: true,
            cep: true,
            state: true,
            city: true,
            neighborhood:
              true,
            street:
              true,
            number:
              true,
            complement:
              true,
            isDefault:
              true,
          },
        },
      },
    });

  if (!user) {
    redirect(
      "/entrar"
    );
  }

  /*
   * =====================================================
   * PEDIDOS
   * =====================================================
   */

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

      take:
        20,

      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,

        trackingCode:
          true,

        items: {
          select: {
            id: true,
          },
        },
      },
    });

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/*
       * ===================================================
       * CONTAINER PRINCIPAL
       * ===================================================
       *
       * max-w-6xl = aproximadamente 1152px.
       *
       * Em monitores grandes, o conteúdo não fica
       * esticado de uma ponta até a outra.
       */}

      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b98218]">
            Área do cliente
          </p>

          <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-[#20170f] sm:text-[34px]">
            Minha conta
          </h1>

          <p className="mt-1 text-sm text-neutral-600">
            Bem-vindo,{" "}
            <strong>
              {user.name}
            </strong>
            .
          </p>
        </div>

        {/* =================================================
            RESUMO
        =================================================
            Flex-wrap faz os cards se reorganizarem
            automaticamente conforme a largura.
        */}

        <div className="flex flex-wrap gap-4">
          {/* PEDIDOS */}

          <section className="min-w-[230px] flex-1 rounded-2xl border border-[#e8dcc2] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                <ShoppingBag
                  size={20}
                />
              </div>

              <div>
                <strong className="block text-[22px] leading-none text-[#20170f]">
                  {
                    user._count
                      .orders
                  }
                </strong>

                <p className="mt-1 text-xs text-neutral-500">
                  Pedidos
                </p>
              </div>
            </div>
          </section>

          {/* ENDEREÇOS */}

          <section className="min-w-[230px] flex-1 rounded-2xl border border-[#e8dcc2] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                <MapPin
                  size={20}
                />
              </div>

              <div>
                <strong className="block text-[22px] leading-none text-[#20170f]">
                  {
                    user._count
                      .addresses
                  }
                </strong>

                <p className="mt-1 text-xs text-neutral-500">
                  Endereços
                </p>
              </div>
            </div>
          </section>

          {/* VERIFICAÇÃO */}

          <section className="min-w-[230px] flex-1 rounded-2xl border border-[#e8dcc2] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <ShieldCheck
                  size={20}
                />
              </div>

              <div>
                <strong className="block text-sm text-green-700">
                  Conta verificada
                </strong>

                <p className="mt-1 text-xs text-neutral-500">
                  E-mail confirmado
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* =================================================
            PERFIL + SENHA
        ================================================= */}

        <div className="mt-5 flex flex-wrap items-start gap-5">
          <div className="min-w-[300px] basis-[500px] flex-1">
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
          </div>

          <div className="min-w-[300px] basis-[500px] flex-1">
            <AccountPasswordForm />
          </div>
        </div>

        {/* =================================================
            ENDEREÇOS + CONTA
        ================================================= */}

        <div className="mt-5 flex flex-wrap items-start gap-5">
          {/* ENDEREÇOS RECEBEM MAIS ESPAÇO */}

          <div className="min-w-[300px] basis-[650px] flex-[1.4]">
            <AccountAddresses
              initialAddresses={
                user.addresses
              }
            />
          </div>

          {/* SESSÃO / DESATIVAÇÃO */}

          <div className="min-w-[280px] basis-[340px] flex-1">
            <AccountActions />
          </div>
        </div>

        {/* =================================================
            PEDIDOS
        ================================================= */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
          {/* TOPO */}

          <div className="flex items-center justify-between gap-4 border-b border-[#eee2cc] px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-lg font-extrabold text-[#20170f] sm:text-xl">
                Meus pedidos
              </h2>

              <p className="mt-0.5 text-xs text-neutral-500 sm:text-sm">
                Acompanhe suas compras
                e entregas.
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <Package
                size={20}
              />
            </div>
          </div>

          {/* SEM PEDIDOS */}

          {orders.length ===
          0 ? (
            <div className="px-5 py-10 text-center">
              <ShoppingBag
                size={32}
                className="mx-auto text-neutral-300"
              />

              <strong className="mt-3 block text-base text-[#20170f]">
                Nenhum pedido
              </strong>

              <p className="mt-1 text-sm text-neutral-500">
                Quando você realizar
                uma compra, ela
                aparecerá aqui.
              </p>

              <Link
                href="/"
                className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#b98218] px-5 text-sm font-bold text-white transition hover:bg-[#9f6f14]"
              >
                Ver produtos
              </Link>
            </div>
          ) : (
            /* LISTA */

            <div className="divide-y divide-[#eee2cc]">
              {orders.map(
                (order) => (
                  <article
                    key={
                      order.id
                    }
                    className="px-5 py-4 transition hover:bg-[#faf9f6] sm:px-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* ESQUERDA */}

                      <div className="min-w-[230px] flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-[#20170f] sm:text-base">
                            Pedido #
                            {order.id
                              .slice(
                                0,
                                8
                              )
                              .toUpperCase()}
                          </strong>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:text-[11px] ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(
                              order.status
                            )}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1.5">
                            <Clock3
                              size={13}
                            />

                            {formatDate(
                              order.createdAt
                            )}
                          </span>

                          <span>
                            {
                              order
                                .items
                                .length
                            }{" "}
                            produto(s)
                          </span>

                          {order.trackingCode && (
                            <span className="font-semibold text-blue-700">
                              Rastreio disponível
                            </span>
                          )}
                        </div>
                      </div>

                      {/* DIREITA */}

                      <div className="flex items-center gap-4">
                        <strong className="whitespace-nowrap text-base text-[#20170f]">
                          {formatPrice(
                            order.total
                          )}
                        </strong>

                        {/*
                         * O ID não é autorização.
                         * A página verifica a sessão
                         * novamente no servidor.
                         */}

                        <Link
                          href={`/meus-pedidos/${order.id}`}
                          aria-label={`Acompanhar pedido ${order.id
                            .slice(
                              0,
                              8
                            )
                            .toUpperCase()}`}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e8dcc2] text-[#b98218] transition hover:bg-[#fff8e8]"
                        >
                          <ChevronRight
                            size={18}
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}