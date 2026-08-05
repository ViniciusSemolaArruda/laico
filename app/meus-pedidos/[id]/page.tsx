import {
  cookies,
} from "next/headers";

import {
  notFound,
} from "next/navigation";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

import {
  getOrderAccessCookieName,
  verifyOrderAccessToken,
} from "@/lib/order-access";

import { prisma } from "@/lib/prisma";

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
    "Entregue",

  CANCELED:
    "Cancelado",

  REFUNDED:
    "Reembolsado",

  RETURNED:
    "Devolvido",
};

function isValidOrderId(
  orderId: string
): boolean {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    orderId
  );
}

function formatPrice(
  value: unknown
): string {
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
): string {
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
): string | null {
  if (!value) {
    return null;
  }

  try {
    const url =
      new URL(value);

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default async function UserOrderDetailsPage({
  params,
}: Props) {
  const { id } =
    await params;

  /*
   * =====================================================
   * ID
   * =====================================================
   *
   * ID inválido e acesso não autorizado possuem
   * exatamente o mesmo comportamento.
   */

  if (
    !id ||
    !isValidOrderId(id)
  ) {
    notFound();
  }

  /*
   * =====================================================
   * SESSÃO DO CLIENTE
   * =====================================================
   */

  const customerSession =
    await getCustomerSession();

  let authorizedUserId:
    | string
    | null = null;

  /*
   * =====================================================
   * CLIENTE LOGADO
   * =====================================================
   *
   * Se existe uma sessão válida, somente o userId
   * daquela sessão poderá ser utilizado.
   *
   * IMPORTANTE:
   *
   * Não fazemos fallback para token GUEST caso
   * o cliente esteja logado.
   */

  if (
    customerSession
  ) {
    authorizedUserId =
      customerSession.userId;
  } else {
    /*
     * ===================================================
     * VISITANTE
     * ===================================================
     *
     * Sem sessão autenticada, exigimos o token
     * secreto exclusivo daquele pedido.
     */

    const cookieStore =
      await cookies();

    const accessToken =
      cookieStore.get(
        getOrderAccessCookieName(
          id
        )
      )?.value;

    /*
     * Saber apenas cms... nunca é suficiente.
     */

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
      access.orderId !== id
    ) {
      notFound();
    }

    authorizedUserId =
      access.userId;
  }

  /*
   * =====================================================
   * DEFESA FINAL
   * =====================================================
   */

  if (
    !authorizedUserId
  ) {
    notFound();
  }

  /*
   * =====================================================
   * CONSULTA SEGURA
   * =====================================================
   *
   * A autorização faz parte do WHERE.
   *
   * Isso é melhor do que carregar o pedido inteiro
   * e só depois descobrir que pertence a outra pessoa.
   */

  const order =
    await prisma.order.findFirst({
      where: {
        id,

        userId:
          authorizedUserId,
      },

      select: {
        id: true,
        userId: true,
        status: true,
        total: true,
        createdAt: true,

        trackingCode:
          true,

        trackingUrl:
          true,

        carrier:
          true,

        items: {
          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            quantity: true,
            createdAt: true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },

        history: {
          select: {
            id: true,
            title: true,
            message: true,
            createdAt: true,
          },

          orderBy: {
            createdAt:
              "asc",
          },
        },
      },
    });

  /*
   * Não diferenciamos:
   *
   * - pedido inexistente;
   * - pedido de outro usuário;
   * - token inválido;
   * - sessão inválida.
   */

  if (!order) {
    notFound();
  }

  /*
   * Defesa em profundidade.
   */

  if (
    order.userId !==
      authorizedUserId
  ) {
    notFound();
  }

  const safeTrackingUrl =
    getSafeExternalUrl(
      order.trackingUrl
    );

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <Header />

      <section className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[34px] font-extrabold text-[#20170f]">
            Acompanhar pedido
          </h1>

          <p className="text-neutral-600">
            Pedido #
            {order.id
              .slice(
                0,
                8
              )
              .toUpperCase()}{" "}
            ·{" "}
            {formatDate(
              order.createdAt
            )}
          </p>
        </div>

        {/* STATUS */}

        <section className="mb-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-neutral-500">
                Status atual
              </p>

              <h2 className="text-[26px] font-extrabold text-[#b98218]">
                {statusLabels[
                  order.status
                ] ||
                  order.status}
              </h2>
            </div>

            <div className="md:text-right">
              <p className="text-sm text-neutral-500">
                Total
              </p>

              <strong className="text-[24px] text-[#20170f]">
                {formatPrice(
                  order.total
                )}
              </strong>
            </div>
          </div>

          {/* RASTREAMENTO */}

          {order.trackingCode && (
            <div className="mt-5 rounded-xl bg-[#faf9f6] p-4">
              <p className="text-sm">
                <strong>
                  Transportadora:
                </strong>{" "}
                {order.carrier ||
                  "-"}
              </p>

              <p className="mt-1 text-sm">
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
                  className="mt-3 inline-flex rounded-xl bg-[#20170f] px-5 py-3 text-sm font-bold text-white"
                >
                  Abrir rastreamento
                </a>
              )}
            </div>
          )}
        </section>

        {/* HISTÓRICO */}

        <section className="mb-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-[24px] font-extrabold text-[#20170f]">
            Linha do tempo do pedido
          </h2>

          <div className="space-y-5">
            {order.history.map(
              (
                historyItem,
                index
              ) => (
                <div
                  key={
                    historyItem.id
                  }
                  className="flex gap-4"
                >
                  <div className="flex flex-col items-center">
                    <div className="h-5 w-5 rounded-full bg-[#b98218]" />

                    {index !==
                      order
                        .history
                        .length -
                        1 && (
                      <div className="h-full min-h-[48px] w-[2px] bg-[#e8dcc2]" />
                    )}
                  </div>

                  <div className="pb-4">
                    <strong className="text-[#20170f]">
                      {
                        historyItem.title
                      }
                    </strong>

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
                </div>
              )
            )}

            {order.history
              .length ===
              0 && (
              <p className="text-sm text-neutral-500">
                Seu pedido ainda
                não possui
                atualizações.
              </p>
            )}
          </div>
        </section>

        {/* PRODUTOS */}

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-[24px] font-extrabold text-[#20170f]">
            Produtos do pedido
          </h2>

          <div className="divide-y divide-[#eee2cc]">
            {order.items.map(
              (item) => (
                <div
                  key={
                    item.id
                  }
                  className="flex items-center gap-4 py-4"
                >
                  <img
                    src={
                      item.image
                    }
                    alt={
                      item.name
                    }
                    className="h-16 w-16 rounded-xl border object-contain"
                  />

                  <div className="min-w-0 flex-1">
                    <strong className="block truncate">
                      {
                        item.name
                      }
                    </strong>

                    <p className="text-sm text-neutral-500">
                      Quantidade:{" "}
                      {
                        item.quantity
                      }
                    </p>
                  </div>

                  <strong className="shrink-0">
                    {formatPrice(
                      Number(
                        item.price
                      ) *
                        item.quantity
                    )}
                  </strong>
                </div>
              )
            )}
          </div>
        </section>
      </section>

      <Footer />
    </main>
  );
}