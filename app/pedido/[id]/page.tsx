import {
  cookies,
} from "next/headers";

import {
  notFound,
} from "next/navigation";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

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
  const { id } =
    await params;

  /*
   * =====================================================
   * ID
   * =====================================================
   *
   * Pedido inválido, inexistente e sem autorização
   * possuem o mesmo comportamento.
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
   * Quando existe uma sessão válida, o acesso
   * obrigatoriamente pertence ao userId da sessão.
   *
   * Não fazemos fallback para token GUEST.
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
     * Cliente sem login precisa possuir o token
     * secreto e exclusivo daquele pedido.
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
     * Conhecer somente o cms... nunca concede
     * acesso ao pedido.
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
   * A autorização já faz parte da consulta:
   *
   * id + userId
   *
   * Assim dados pessoais, endereço, produtos,
   * pagamento e histórico nunca são carregados
   * se o proprietário não corresponder.
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
            neighborhood:
              true,
            street: true,
            number: true,
            complement:
              true,
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
            createdAt:
              "asc",
          },
        },

        payment: {
          select: {
            status: true,
            paymentMethod:
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
            createdAt:
              "desc",
          },
        },
      },
    });

  /*
   * Não diferenciamos:
   *
   * - pedido inexistente;
   * - pedido de outro cliente;
   * - token inválido;
   * - sessão sem permissão.
   */

  if (!order) {
    notFound();
  }

  /*
   * Defesa adicional.
   */

  if (
    order.userId !==
      authorizedUserId
  ) {
    notFound();
  }

  /*
   * =====================================================
   * OBJETO SEGURO PARA O CLIENT
   * =====================================================
   */

  const safeOrder: OrderDetailsData = {
    id:
      order.id,

    /*
     * Status exclusivamente do banco.
     *
     * ?status=approved não é consultado
     * nem utilizado em nenhum momento.
     */
    status:
      order.status,

    createdAt:
      order.createdAt.toISOString(),

    updatedAt:
      order.updatedAt.toISOString(),

    expiresAt:
      order.expiresAt
        ?.toISOString() ??
      null,

    subtotal:
      Number(
        order.subtotal
      ),

    shipping:
      Number(
        order.shipping
      ),

    discount:
      Number(
        order.discount
      ),

    total:
      Number(
        order.total
      ),

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
          id:
            item.id,

          name:
            item.name,

          image:
            item.image,

          price:
            Number(
              item.price
            ),

          quantity:
            item.quantity,
        })
      ),

    history:
      order.history.map(
        (entry) => ({
          id:
            entry.id,

          status:
            entry.status,

          title:
            entry.title,

          message:
            entry.message,

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