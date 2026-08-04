import { NextResponse } from "next/server";

import {
  createOrderAccessToken,
  getOrderAccessCookieName,
} from "@/lib/order-access";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
  id: string;
  slug?: string;
  quantity: number;
};

type CheckoutBody = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  };

  address?: {
    cep?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
    street?: string;
    number?: string;
    complement?: string;
  };

  items?: CheckoutItem[];
};

type DatabaseProduct = {
  id: string;
  name: string;
  image: string;
  price: unknown;
  stock: number;
};

type CheckoutProduct =
  DatabaseProduct & {
    quantity: number;
  };

function normalizeText(
  value: unknown,
  maximumLength = 255
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeDigits(
  value: unknown,
  maximumLength: number
) {
  return normalizeText(
    value,
    maximumLength + 10
  )
    .replace(/\D/g, "")
    .slice(0, maximumLength);
}

function isValidEmail(
  email: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as CheckoutBody;

    const customer =
      body.customer;

    const address =
      body.address;

    const items =
      body.items;

    const customerName =
      normalizeText(
        customer?.name,
        120
      );

    const customerEmail =
      normalizeText(
        customer?.email,
        254
      ).toLowerCase();

    const customerPhone =
      normalizeDigits(
        customer?.phone,
        11
      );

    const customerCpf =
      normalizeDigits(
        customer?.cpf,
        11
      );

    if (
      !customerName ||
      !isValidEmail(
        customerEmail
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Nome e e-mail válidos são obrigatórios.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      customerCpf.length !== 11
    ) {
      return NextResponse.json(
        {
          error:
            "Informe um CPF com 11 dígitos.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Carrinho vazio.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      items.length > 50
    ) {
      return NextResponse.json(
        {
          error:
            "Quantidade máxima de itens excedida.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedItems =
      items.map(
        (item) => ({
          id: normalizeText(
            item.id,
            100
          ),

          slug: normalizeText(
            item.slug,
            180
          ),

          quantity: Number(
            item.quantity
          ),
        })
      );

    const invalidItem =
      normalizedItems.find(
        (item) =>
          !item.id ||
          !Number.isInteger(
            item.quantity
          ) ||
          item.quantity < 1 ||
          item.quantity > 100
      );

    if (invalidItem) {
      return NextResponse.json(
        {
          error:
            "Existe um item inválido no carrinho.",
        },
        {
          status: 400,
        }
      );
    }

    const cep =
      normalizeDigits(
        address?.cep,
        8
      );

    const state =
      normalizeText(
        address?.state,
        2
      ).toUpperCase();

    const city =
      normalizeText(
        address?.city,
        100
      );

    const neighborhood =
      normalizeText(
        address?.neighborhood,
        100
      );

    const street =
      normalizeText(
        address?.street,
        150
      );

    const number =
      normalizeText(
        address?.number,
        20
      );

    const complement =
      normalizeText(
        address?.complement,
        100
      );

    if (
      cep.length !== 8 ||
      state.length !== 2 ||
      !city ||
      !neighborhood ||
      !street ||
      !number
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha corretamente o endereço de entrega.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * O navegador não controla os preços.
     * Todos os produtos e valores são
     * consultados novamente no banco.
     */
    const productsById =
      new Map<
        string,
        CheckoutProduct
      >();

    for (
      const item of
      normalizedItems
    ) {
      let product:
        | DatabaseProduct
        | null =
        await prisma.product.findFirst({
          where: {
            id: item.id,
            active: true,
          },

          select: {
            id: true,
            name: true,
            image: true,
            price: true,
            stock: true,
          },
        });

      if (
        !product &&
        item.slug
      ) {
        product =
          await prisma.product.findFirst({
            where: {
              slug:
                item.slug,
              active: true,
            },

            select: {
              id: true,
              name: true,
              image: true,
              price: true,
              stock: true,
            },
          });
      }

      if (!product) {
        return NextResponse.json(
          {
            error:
              "Produto não encontrado. Limpe o carrinho e adicione novamente.",
          },
          {
            status: 400,
          }
        );
      }

      const productPrice =
        Number(product.price);

      if (
        !Number.isFinite(
          productPrice
        ) ||
        productPrice <= 0
      ) {
        return NextResponse.json(
          {
            error: `O produto ${product.name} possui um preço inválido.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Agrupa produtos repetidos para impedir
       * que múltiplas linhas contornem a
       * validação do estoque.
       */
      const existingProduct =
        productsById.get(
          product.id
        );

      const totalQuantity =
        (existingProduct
          ?.quantity || 0) +
        item.quantity;

      if (
        totalQuantity >
        product.stock
      ) {
        return NextResponse.json(
          {
            error: `Estoque indisponível para ${product.name}.`,
          },
          {
            status: 400,
          }
        );
      }

      productsById.set(
        product.id,
        {
          ...product,

          price:
            productPrice,

          quantity:
            totalQuantity,
        }
      );
    }

    const products =
      Array.from(
        productsById.values()
      );

    const subtotal =
      Number(
        products
          .reduce(
            (
              currentTotal,
              product
            ) =>
              currentTotal +
              Number(
                product.price
              ) *
                product.quantity,
            0
          )
          .toFixed(2)
      );

    /*
     * Frete e desconto não são aceitos
     * diretamente do navegador.
     */
    const shipping = 0;
    const discount = 0;

    const total = Number(
      (
        subtotal +
        shipping -
        discount
      ).toFixed(2)
    );

    if (
      !Number.isFinite(
        total
      ) ||
      total <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "O total do pedido é inválido.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * O Prisma infere automaticamente o tipo
     * real do parâmetro transaction.
     */
    const order =
      await prisma.$transaction(
        async (transaction) => {
          const user =
            await transaction.user.upsert({
              where: {
                email:
                  customerEmail,
              },

              update: {
                name:
                  customerName,

                phone:
                  customerPhone ||
                  null,

                cpf:
                  customerCpf,
              },

              create: {
                name:
                  customerName,

                email:
                  customerEmail,

                phone:
                  customerPhone ||
                  null,

                cpf:
                  customerCpf,
              },
            });

          const savedAddress =
            await transaction.address.create({
              data: {
                userId:
                  user.id,

                name:
                  "Endereço principal",

                cep,
                state,
                city,
                neighborhood,
                street,
                number,

                complement:
                  complement ||
                  null,
              },
            });

          const createdOrder =
            await transaction.order.create({
              data: {
                userId:
                  user.id,

                addressId:
                  savedAddress.id,

                subtotal,
                shipping,
                discount,
                total,

                items: {
                  create:
                    products.map(
                      (
                        product
                      ) => ({
                        productId:
                          product.id,

                        name:
                          product.name,

                        image:
                          product.image,

                        /*
                         * Número já validado.
                         */
                        price:
                          Number(
                            product.price
                          ),

                        quantity:
                          product.quantity,
                      })
                    ),
                },

                history: {
                  create: {
                    status:
                      "PENDING",

                    title:
                      "Pedido realizado",

                    message:
                      "O pedido foi criado e aguarda a confirmação do pagamento.",
                  },
                },
              },
            });

          return createdOrder;
        }
      );

    const accessToken =
      await createOrderAccessToken({
        orderId: order.id,
        userId: order.userId,
      });

    const response =
      NextResponse.json(
        {
          orderId:
            order.id,

          order: {
            id: order.id,

            status:
              order.status,

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

            expiresAt:
              order.expiresAt
                ?.toISOString() ??
              null,
          },
        },
        {
          status: 201,
        }
      );

    response.cookies.set({
      name:
        getOrderAccessCookieName(
          order.id
        ),

      value:
        accessToken,

      httpOnly: true,

      secure:
        process.env
          .NODE_ENV ===
        "production",

      sameSite: "lax",

      path:
        `/pedido/${order.id}`,

      maxAge:
        60 *
        60 *
        24 *
        30,
    });

    return response;
  } catch (error) {
    console.error(
      "Erro no checkout:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Erro interno ao criar pedido.",
      },
      {
        status: 500,
      }
    );
  }
}