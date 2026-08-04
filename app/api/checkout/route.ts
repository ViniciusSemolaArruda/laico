import { NextResponse } from "next/server";

import {
  createOrderAccessToken,
  getOrderAccessCookieOptions,
} from "@/lib/order-access";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAXIMUM_REQUEST_SIZE =
  100_000;

const VALID_STATES =
  new Set([
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ]);

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

type CheckoutProduct = {
  id: string;
  name: string;
  image: string;
  price: number;
  stock: number;
  quantity: number;
};

function normalizeText(
  value: unknown,
  maximumLength = 255
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(
      /[\u0000-\u001F\u007F]/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumLength);
}

function normalizeDigits(
  value: unknown,
  maximumLength: number
): string {
  return normalizeText(
    value,
    maximumLength + 20
  )
    .replace(/\D/g, "")
    .slice(0, maximumLength);
}

function isValidEmail(
  email: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isValidCpf(
  cpf: string
): boolean {
  if (!/^\d{11}$/.test(cpf)) {
    return false;
  }

  if (
    /^(\d)\1{10}$/.test(cpf)
  ) {
    return false;
  }

  const digits =
    cpf.split("").map(Number);

  let firstSum = 0;

  for (
    let index = 0;
    index < 9;
    index += 1
  ) {
    firstSum +=
      digits[index] *
      (10 - index);
  }

  let firstDigit =
    (firstSum * 10) % 11;

  if (firstDigit === 10) {
    firstDigit = 0;
  }

  if (
    firstDigit !== digits[9]
  ) {
    return false;
  }

  let secondSum = 0;

  for (
    let index = 0;
    index < 10;
    index += 1
  ) {
    secondSum +=
      digits[index] *
      (11 - index);
  }

  let secondDigit =
    (secondSum * 10) % 11;

  if (secondDigit === 10) {
    secondDigit = 0;
  }

  return (
    secondDigit === digits[10]
  );
}

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: Request
) {
  try {
    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) || 0
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAXIMUM_REQUEST_SIZE
    ) {
      return errorResponse(
        "Requisição muito grande.",
        413
      );
    }

    let body: CheckoutBody;

    try {
      body =
        (await request.json()) as CheckoutBody;
    } catch {
      return errorResponse(
        "Dados do checkout inválidos.",
        400
      );
    }

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
      customerName.length < 3 ||
      !isValidEmail(
        customerEmail
      )
    ) {
      return errorResponse(
        "Nome e e-mail válidos são obrigatórios.",
        400
      );
    }

    if (
      customerPhone.length < 10 ||
      customerPhone.length > 11
    ) {
      return errorResponse(
        "Informe um telefone válido.",
        400
      );
    }

    if (
      !isValidCpf(customerCpf)
    ) {
      return errorResponse(
        "Informe um CPF válido.",
        400
      );
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return errorResponse(
        "Carrinho vazio.",
        400
      );
    }

    if (items.length > 50) {
      return errorResponse(
        "Quantidade máxima de itens excedida.",
        400
      );
    }

    const normalizedItems =
      items.map((item) => ({
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
      }));

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
      return errorResponse(
        "Existe um item inválido no carrinho.",
        400
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

    const addressNumber =
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
      !VALID_STATES.has(state) ||
      city.length < 2 ||
      neighborhood.length < 2 ||
      street.length < 2 ||
      !addressNumber
    ) {
      return errorResponse(
        "Preencha corretamente o endereço de entrega.",
        400
      );
    }

    /*
     * O navegador não controla os preços.
     * Produtos, preços e estoque são
     * consultados novamente no servidor.
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
        return errorResponse(
          "Produto não encontrado. Limpe o carrinho e adicione novamente.",
          400
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
        return errorResponse(
          `O produto ${product.name} possui um preço inválido.`,
          400
        );
      }

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
        return errorResponse(
          `Estoque indisponível para ${product.name}.`,
          400
        );
      }

      productsById.set(
        product.id,
        {
          id: product.id,
          name: product.name,
          image: product.image,
          price: productPrice,
          stock: product.stock,
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
              product.price *
                product.quantity,
            0
          )
          .toFixed(2)
      );

    /*
     * Frete e desconto não são aceitos
     * diretamente do navegador.
     *
     * Serão calculados no servidor quando
     * fizermos Correios e cupons.
     */
    const shipping = 0;
    const discount = 0;

    const total =
      Number(
        (
          subtotal +
          shipping -
          discount
        ).toFixed(2)
      );

    if (
      !Number.isFinite(total) ||
      total <= 0
    ) {
      return errorResponse(
        "O total do pedido é inválido.",
        400
      );
    }

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
                  customerPhone,

                cpf:
                  customerCpf,
              },

              create: {
                name:
                  customerName,

                email:
                  customerEmail,

                phone:
                  customerPhone,

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
                  "Endereço de entrega",

                cep,
                state,
                city,
                neighborhood,
                street,

                number:
                  addressNumber,

                complement:
                  complement || null,
              },
            });

          return transaction.order.create({
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
                    (product) => ({
                      productId:
                        product.id,

                      name:
                        product.name,

                      image:
                        product.image,

                      price:
                        product.price,

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
        }
      );

    /*
     * Gera o token secreto, salva somente
     * seu hash no banco e devolve o token
     * verdadeiro para ser colocado no cookie.
     */
    const accessToken =
      await createOrderAccessToken({
        orderId: order.id,
        userId: order.userId,
      });

    const response =
      NextResponse.json(
        {
          orderId: order.id,

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

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );

    /*
     * O token não é devolvido no JSON e não
     * pode ser acessado pelo JavaScript.
     */
    response.cookies.set({
      ...getOrderAccessCookieOptions(
        order.id
      ),

      value: accessToken,
    });

    return response;
  } catch (error) {
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      console.error(
        "Erro no checkout:",
        error
      );
    } else {
      /*
       * Em produção não imprimimos o corpo,
       * CPF, endereço, token ou dados do cliente.
       */
      console.error(
        "Erro interno no checkout:",
        error instanceof Error
          ? error.name
          : "UnknownError"
      );
    }

    return errorResponse(
      "Erro interno ao criar pedido.",
      500
    );
  }
}