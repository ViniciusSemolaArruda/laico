import {
  ChevronRight,
  CircleUserRound,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
      dateStyle: "medium",
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
   * CONTA
   * =====================================================
   *
   * Não procuramos usuário por e-mail vindo
   * do navegador.
   *
   * O ID vem da sessão HttpOnly validada.
   */

  const user =
    await prisma.user.findFirst({
      where: {
        id:
          session.userId,

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
        createdAt: true,

        addresses: {
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

          take: 3,

          select: {
            id: true,
            name: true,
            cep: true,
            state: true,
            city: true,
            neighborhood:
              true,
            street: true,
            number: true,
            complement:
              true,
            isDefault:
              true,
          },
        },
      },
    });

  if (!user) {
    /*
     * A sessão pode ter sido criada antes
     * da conta ser desativada.
     *
     * getCustomerSession já bloqueia isso,
     * mas repetimos a proteção aqui.
     */
    redirect(
      "/entrar"
    );
  }

  /*
   * =====================================================
   * PEDIDOS
   * =====================================================
   *
   * REGRA CRÍTICA:
   *
   * where.userId = session.userId
   *
   * Nunca aceitamos userId vindo de query,
   * URL ou formulário.
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

      take: 20,

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
    <main className="min-h-screen bg-[#f4efe6]">
      <Header />

      <section className="mx-auto max-w-[1200px] px-5 py-10 lg:px-8">
        {/* CABEÇALHO */}

        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#b98218]">
            Área do cliente
          </p>

          <h1 className="mt-2 text-[32px] font-extrabold text-[#20170f] md:text-[40px]">
            Minha conta
          </h1>

          <p className="mt-2 text-neutral-600">
            Bem-vindo,{" "}
            <strong>
              {user.name}
            </strong>
            .
          </p>
        </div>

        {/* CARDS */}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <ShoppingBag
                size={21}
              />
            </div>

            <strong className="mt-5 block text-[28px] text-[#20170f]">
              {orders.length}
            </strong>

            <p className="text-sm text-neutral-500">
              Pedidos recentes
            </p>
          </section>

          <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
              <MapPin
                size={21}
              />
            </div>

            <strong className="mt-5 block text-[28px] text-[#20170f]">
              {
                user
                  .addresses
                  .length
              }
            </strong>

            <p className="text-sm text-neutral-500">
              Endereços cadastrados
            </p>
          </section>

          <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <ShieldCheck
                size={21}
              />
            </div>

            <strong className="mt-5 block text-lg text-green-700">
              Conta verificada
            </strong>

            <p className="mt-1 text-sm text-neutral-500">
              Seu e-mail foi confirmado
            </p>
          </section>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-7 xl:grid-cols-[360px_1fr]">
          {/* PERFIL */}

          <div className="space-y-7">
            <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <CircleUserRound
                  size={22}
                  className="text-[#b98218]"
                />

                <h2 className="text-xl font-extrabold text-[#20170f]">
                  Meus dados
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Nome
                  </p>

                  <p className="mt-1 font-bold text-[#20170f]">
                    {user.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    E-mail
                  </p>

                  <p className="mt-1 break-all text-[#20170f]">
                    {user.email}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                    Telefone
                  </p>

                  <p className="mt-1 text-[#20170f]">
                    {user.phone ||
                      "Não informado"}
                  </p>
                </div>
              </div>
            </section>

            {/* ENDEREÇOS */}

            <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <MapPin
                  size={21}
                  className="text-[#b98218]"
                />

                <h2 className="text-xl font-extrabold text-[#20170f]">
                  Endereços
                </h2>
              </div>

              {user.addresses
                .length === 0 ? (
                <p className="text-sm leading-6 text-neutral-500">
                  Você ainda não possui
                  endereços cadastrados.
                </p>
              ) : (
                <div className="space-y-4">
                  {user.addresses.map(
                    (
                      address
                    ) => (
                      <div
                        key={
                          address.id
                        }
                        className="rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-sm text-[#20170f]">
                            {
                              address.name
                            }
                          </strong>

                          {address.isDefault && (
                            <span className="rounded-full bg-[#fff8e8] px-2 py-1 text-[10px] font-bold text-[#b98218]">
                              Principal
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs leading-5 text-neutral-500">
                          {
                            address.street
                          }
                          ,{" "}
                          {
                            address.number
                          }
                          <br />

                          {
                            address.neighborhood
                          }
                          {" · "}
                          {
                            address.city
                          }
                          /
                          {
                            address.state
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          </div>

          {/* PEDIDOS */}

          <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#eee2cc] px-6 py-5">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#20170f]">
                  Meus pedidos
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Acompanhe suas compras
                  e entregas.
                </p>
              </div>

              <Package
                size={24}
                className="text-[#b98218]"
              />
            </div>

            {orders.length ===
            0 ? (
              <div className="px-6 py-16 text-center">
                <ShoppingBag
                  size={38}
                  className="mx-auto text-neutral-300"
                />

                <strong className="mt-4 block text-lg text-[#20170f]">
                  Nenhum pedido
                </strong>

                <p className="mt-2 text-sm text-neutral-500">
                  Quando você realizar
                  uma compra, ela aparecerá
                  aqui.
                </p>

                <Link
                  href="/"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#b98218] px-6 text-sm font-bold text-white"
                >
                  Ver produtos
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#eee2cc]">
                {orders.map(
                  (order) => (
                    <div
                      key={
                        order.id
                      }
                      className="p-6 transition hover:bg-[#faf9f6]"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <strong className="text-[#20170f]">
                              Pedido #
                              {order.id
                                .slice(
                                  0,
                                  8
                                )
                                .toUpperCase()}
                            </strong>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${getStatusStyle(
                                order.status
                              )}`}
                            >
                              {getStatusLabel(
                                order.status
                              )}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-neutral-500">
                            <span className="flex items-center gap-1.5">
                              <Clock3
                                size={
                                  14
                                }
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
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-5 sm:justify-end">
                          <strong className="text-lg text-[#20170f]">
                            {formatPrice(
                              order.total
                            )}
                          </strong>

                          <Link
                            href={`/meus-pedidos/${order.id}`}
                            aria-label="Acompanhar pedido"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8dcc2] text-[#b98218] transition hover:bg-[#fff8e8]"
                          >
                            <ChevronRight
                              size={
                                19
                              }
                            />
                          </Link>
                        </div>
                      </div>

                      {order.trackingCode && (
                        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-800">
                          Código de rastreamento disponível.
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </section>

      <Footer />
    </main>
  );
}