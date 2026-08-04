import { cookies } from "next/headers";
import { notFound } from "next/navigation";

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

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function OrderPage({
  params,
}: PageProps) {
  const { id } = await params;

  if (
    !id ||
    !/^[a-zA-Z0-9_-]{10,100}$/.test(id)
  ) {
    notFound();
  }

  const cookieStore = await cookies();

  const accessToken = cookieStore.get(
    getOrderAccessCookieName(id)
  )?.value;

  if (!accessToken) {
    /*
     * Retornamos 404 em vez de 403 para não
     * revelar se o pedido existe.
     */
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

  const order =
    await prisma.order.findUnique({
      where: {
        id,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        address: true,

        items: {
          orderBy: {
            createdAt: "asc",
          },
        },

        payment: true,

        history: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (
    !order ||
    order.userId !== access.userId
  ) {
    notFound();
  }

  const safeOrder: OrderDetailsData = {
    id: order.id,
    status: order.status,

    createdAt:
      order.createdAt.toISOString(),

    updatedAt:
      order.updatedAt.toISOString(),

    expiresAt:
      order.expiresAt?.toISOString() ??
      null,

    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    discount: Number(order.discount),
    total: Number(order.total),

    trackingCode:
      order.trackingCode,

    trackingUrl:
      order.trackingUrl,

    carrier: order.carrier,

    customer: {
      name: order.user.name,
      email: order.user.email,
    },

    address: order.address
      ? {
          cep: order.address.cep,
          state: order.address.state,
          city: order.address.city,
          neighborhood:
            order.address.neighborhood,
          street: order.address.street,
          number: order.address.number,
          complement:
            order.address.complement,
        }
      : null,

    payment: order.payment
      ? {
          status:
            order.payment.status,
          method:
            order.payment.paymentMethod,
        }
      : null,

    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      price: Number(item.price),
      quantity: item.quantity,
    })),

    history: order.history.map(
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