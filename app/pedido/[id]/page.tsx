import {
  cookies,
} from "next/headers";

import {
  notFound,
} from "next/navigation";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

import {
  getOrderAccessCookieName,
  verifyOrderAccessToken,
} from "@/lib/order-access";

import { prisma } from "@/lib/prisma";

import OrderDetailsClient, {
  type OrderDetailsData,
} from "./OrderDetailsClient";

export const dynamic =
  "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function isValidOrderId(
  orderId: string
): boolean {
  return /^[a-zA-Z0-9_-]{10,100}$/.test(
    orderId
  );
}

export default async function OrderPage({
  params,
}: PageProps) {
  const { id } = await params;

  /*
   * Pedido inválido e pedido sem autorização
   * possuem exatamente o mesmo comportamento.
   */
  if (
    !id ||
    !isValidOrderId(id)
  ) {
    notFound();
  }

  const cookieStore =
    await cookies();

  const cookieName =
    getOrderAccessCookieName(id);

  const accessToken =
    cookieStore.get(
      cookieName
    )?.value;

  /*
   * O ID cms... sozinho não concede acesso.
   * O visitante precisa possuir o token
   * secreto correspondente ao pedido.
   */
  if (!accessToken) {
    notFound();
  }

  const access =
    await verifyOrderAccessToken({
      token: accessToken,
      expectedOrderId: id,
    });

  if (!access) {
    notFound();
  }

  /*
   * A consulta seleciona somente os dados
   * necessários para montar esta página.
   */
  const order =
    await prisma.order.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        userId: true,
        status: true,

        createdAt: true,
        updatedAt: true,
        expiresAt: true,

        subtotal: true,
        shipping: true,
        discount: true,
        total: true,

        trackingCode: true,
        trackingUrl: true,
        carrier: true,

        user: {
          select: {
            name: true,
            email: true,
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
            createdAt: "asc",
          },
        },

        payment: {
          select: {
            status: true,
            paymentMethod: true,
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
      },
    });

  /*
   * Mesmo que alguém consiga usar um token
   * de outro pedido, o userId também precisa
   * corresponder ao proprietário encontrado
   * durante a validação.
   */
  if (
    !order ||
    order.userId !==
      access.userId ||
    access.orderId !== id
  ) {
    notFound();
  }

  const safeOrder: OrderDetailsData = {
    id: order.id,

    /*
     * O status vem exclusivamente do banco.
     *
     * O parâmetro ?status=approved não é
     * consultado nem utilizado.
     */
    status: order.status,

    createdAt:
      order.createdAt.toISOString(),

    updatedAt:
      order.updatedAt.toISOString(),

    expiresAt:
      order.expiresAt
        ?.toISOString() ??
      null,

    subtotal:
      Number(order.subtotal),

    shipping:
      Number(order.shipping),

    discount:
      Number(order.discount),

    total:
      Number(order.total),

    trackingCode:
      order.trackingCode,

    trackingUrl:
      order.trackingUrl,

    carrier:
      order.carrier,

    customer: {
      name:
        order.user.name,

      email:
        order.user.email,
    },

    address:
      order.address
        ? {
            cep:
              order.address.cep,

            state:
              order.address.state,

            city:
              order.address.city,

            neighborhood:
              order.address
                .neighborhood,

            street:
              order.address.street,

            number:
              order.address.number,

            complement:
              order.address
                .complement,
          }
        : null,

    payment:
      order.payment
        ? {
            status:
              order.payment.status,

            method:
              order.payment
                .paymentMethod,
          }
        : null,

    items:
      order.items.map(
        (item) => ({
          id: item.id,
          name: item.name,
          image: item.image,

          price:
            Number(item.price),

          quantity:
            item.quantity,
        })
      ),

    history:
      order.history.map(
        (entry) => ({
          id: entry.id,
          status: entry.status,
          title: entry.title,
          message: entry.message,

          createdAt:
            entry.createdAt.toISOString(),
        })
      ),
  };

  return (
    <>
      <Header />

      <OrderDetailsClient
        order={safeOrder}
      />

      <Footer />
    </>
  );
}