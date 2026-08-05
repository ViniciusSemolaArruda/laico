import { NextResponse } from "next/server";

import {
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

import {
  getCustomerSession,
} from "@/lib/customer-auth";

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

class CheckoutIdentityConflictError extends Error {
  constructor() {
    super(
      "CHECKOUT_IDENTITY_CONFLICT"
    );

    this.name =
      "CheckoutIdentityConflictError";
  }
}

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
    .slice(
      0,
      maximumLength
    );
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
    .slice(
      0,
      maximumLength
    );
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
  if (
    !/^\d{11}$/.test(cpf)
  ) {
    return false;
  }

  if (
    /^(\d)\1{10}$/.test(cpf)
  ) {
    return false;
  }

  const digits =
    cpf
      .split("")
      .map(Number);

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
    (firstSum * 10) %
    11;

  if (
    firstDigit === 10
  ) {
    firstDigit = 0;
  }

  if (
    firstDigit !==
    digits[9]
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
    (secondSum * 10) %
    11;

  if (
    secondDigit === 10
  ) {
    secondDigit = 0;
  }

  return (
    secondDigit ===
    digits[10]
  );
}

function isSameOrigin(
  request: Request
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return true;
  }

  try {
    return (
      new URL(origin)
        .origin ===
      new URL(request.url)
        .origin
    );
  } catch {
    return false;
  }
}

function hasJsonContentType(
  request: Request
) {
  return (
    request.headers
      .get(
        "content-type"
      )
      ?.toLowerCase()
      .includes(
        "application/json"
      ) === true
  );
}

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error:
        message,
    },
    {
      status,

      headers: {
        "Cache-Control":
          "private, no-store, no-cache, must-revalidate",

        Pragma:
          "no-cache",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}

function isPrismaUniqueError(
  error: unknown
) {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return (
    error.code ===
    "P2002"
  );
}

export async function POST(
  request: Request
) {
  try {
    /*
     * =====================================================
     * PROTEÇÕES DA REQUISIÇÃO
     * =====================================================
     */

    if (
      !isSameOrigin(
        request
      )
    ) {
      return errorResponse(
        "Você não tem permissão para fazer isso! Acesso negado.",
        403
      );
    }

    if (
      !hasJsonContentType(
        request
      )
    ) {
      return errorResponse(
        "Formato da requisição inválido.",
        415
      );
    }

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

    /*
     * Limite por origem da requisição.
     *
     * Evita criação massiva de pedidos
     * automatizados.
     */
    const clientIp =
      getClientIp(request);

    const ipLimit =
      await consumeRateLimit({
        scope:
          "checkout-ip",

        identifier:
          clientIp,

        limit: 30,

        windowMs:
          15 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (!ipLimit.allowed) {
      return errorResponse(
        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        429
      );
    }

    /*
     * =====================================================
     * BODY
     * =====================================================
     */

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

    /*
     * =====================================================
     * CLIENTE
     * =====================================================
     */

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
      customerName.length <
        3 ||
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
      customerPhone.length <
        10 ||
      customerPhone.length >
        11
    ) {
      return errorResponse(
        "Informe um telefone válido.",
        400
      );
    }

    if (
      !isValidCpf(
        customerCpf
      )
    ) {
      return errorResponse(
        "Informe um CPF válido.",
        400
      );
    }

    /*
     * =====================================================
     * IDENTIDADE DO CHECKOUT
     * =====================================================
     *
     * Existem dois fluxos:
     *
     * 1. CLIENTE LOGADO
     *    O userId vem da sessão.
     *
     * 2. VISITANTE
     *    Somente uma identidade GUEST pode
     *    ser localizada pelo e-mail informado.
     *
     * Uma conta ACTIVE/PENDING/DISABLED/ADMIN
     * jamais é assumida apenas porque alguém
     * digitou seu e-mail.
     */

    const customerSession =
      await getCustomerSession();

    let authenticatedUserId:
      | string
      | null =
      null;

    let existingGuestUserId:
      | string
      | null =
      null;

    let effectiveCustomerEmail =
      customerEmail;

    let isGuestCheckout =
      true;

    if (customerSession) {
      /*
       * Mesmo com sessão válida, confirmamos
       * novamente o estado da conta.
       */
      const authenticatedUser =
        await prisma.user.findFirst({
          where: {
            id:
              customerSession.userId,

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
            email: true,
          },
        });

      if (
        !authenticatedUser
      ) {
        return errorResponse(
          "Você não tem permissão para fazer isso! Acesso negado.",
          401
        );
      }

      /*
       * O e-mail digitado no formulário NÃO
       * escolhe o proprietário do pedido.
       *
       * Para usuário autenticado usamos
       * exclusivamente a conta da sessão.
       */
      authenticatedUserId =
        authenticatedUser.id;

      effectiveCustomerEmail =
        authenticatedUser.email
          .trim()
          .toLowerCase();

      isGuestCheckout =
        false;
    } else {
      /*
       * Visitante:
       *
       * procuramos o e-mail apenas para saber
       * se ele corresponde a uma identidade
       * GUEST legítima.
       */
      const existingUser =
        await prisma.user.findUnique({
          where: {
            email:
              customerEmail,
          },

          select: {
            id: true,
            role: true,
            accountStatus:
              true,
            emailVerifiedAt:
              true,
            disabledAt:
              true,
          },
        });

      if (existingUser) {
        const canUseAsGuest =
          existingUser.role ===
            "USER" &&
          existingUser.accountStatus ===
            "GUEST" &&
          existingUser.emailVerifiedAt ===
            null &&
          existingUser.disabledAt ===
            null;

        if (
          !canUseAsGuest
        ) {
          /*
           * Resposta propositalmente genérica.
           *
           * Não informamos:
           *
           * - se o e-mail existe;
           * - se está verificado;
           * - se é admin;
           * - se está desativado;
           * - o nome da conta.
           */
          return errorResponse(
            "Não foi possível concluir o checkout com os dados informados.",
            400
          );
        }

        existingGuestUserId =
          existingUser.id;
      }
    }

    /*
     * Rate limit da identidade informada.
     *
     * Para conta autenticada usamos o e-mail
     * verdadeiro obtido no servidor.
     */
    const identityLimit =
      await consumeRateLimit({
        scope:
          "checkout-identity",

        identifier:
          effectiveCustomerEmail,

        limit: 12,

        windowMs:
          30 * 60 * 1000,

        blockMs:
          30 * 60 * 1000,
      });

    if (
      !identityLimit.allowed
    ) {
      return errorResponse(
        "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        429
      );
    }

    /*
     * =====================================================
     * ITENS
     * =====================================================
     */

    if (
      !Array.isArray(
        items
      ) ||
      items.length === 0
    ) {
      return errorResponse(
        "Carrinho vazio.",
        400
      );
    }

    if (
      items.length > 50
    ) {
      return errorResponse(
        "Quantidade máxima de itens excedida.",
        400
      );
    }

    const normalizedItems =
      items.map(
        (item) => ({
          id:
            normalizeText(
              item.id,
              100
            ),

          slug:
            normalizeText(
              item.slug,
              180
            ),

          quantity:
            Number(
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
          item.quantity <
            1 ||
          item.quantity >
            100
      );

    if (
      invalidItem
    ) {
      return errorResponse(
        "Existe um item inválido no carrinho.",
        400
      );
    }

    /*
     * =====================================================
     * ENDEREÇO
     * =====================================================
     */

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
      !VALID_STATES.has(
        state
      ) ||
      city.length < 2 ||
      neighborhood.length <
        2 ||
      street.length < 2 ||
      !addressNumber
    ) {
      return errorResponse(
        "Preencha corretamente o endereço de entrega.",
        400
      );
    }

    /*
     * =====================================================
     * PRODUTOS
     * =====================================================
     *
     * IDs, preços e estoque são novamente
     * consultados no banco.
     *
     * Nenhum preço enviado pelo navegador
     * é utilizado.
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
            id:
              item.id,

            active:
              true,
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

              active:
                true,
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
        Number(
          product.price
        );

      if (
        !Number.isFinite(
          productPrice
        ) ||
        productPrice <= 0
      ) {
        return errorResponse(
          "Existe um produto com preço inválido.",
          400
        );
      }

      const existingProduct =
        productsById.get(
          product.id
        );

      const totalQuantity =
        (existingProduct
          ?.quantity ??
          0) +
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
          id:
            product.id,

          name:
            product.name,

          image:
            product.image,

          price:
            productPrice,

          stock:
            product.stock,

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
     * do navegador.
     *
     * Correios e cupons serão incorporados
     * posteriormente no servidor.
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
      !Number.isFinite(
        total
      ) ||
      total <= 0
    ) {
      return errorResponse(
        "O total do pedido é inválido.",
        400
      );
    }

    /*
     * =====================================================
     * TRANSAÇÃO
     * =====================================================
     */

    const order =
      await prisma.$transaction(
        async (
          transaction
        ) => {
          let orderUserId:
            string;

          /*
           * ===============================================
           * CLIENTE LOGADO
           * ===============================================
           */

          if (
            authenticatedUserId
          ) {
            /*
             * O checkout pode atualizar telefone e CPF
             * da PRÓPRIA conta autenticada.
             *
             * Nunca altera nome/e-mail por dados recebidos
             * do formulário.
             */
            const updateResult =
              await transaction.user.updateMany({
                where: {
                  id:
                    authenticatedUserId,

                  role:
                    "USER",

                  accountStatus:
                    "ACTIVE",

                  emailVerifiedAt: {
                    not:
                      null,
                  },

                  disabledAt:
                    null,
                },

                data: {
                  phone:
                    customerPhone,

                  cpf:
                    customerCpf,
                },
              });

            if (
              updateResult.count !==
              1
            ) {
              throw new CheckoutIdentityConflictError();
            }

            orderUserId =
              authenticatedUserId;
          }

          /*
           * ===============================================
           * GUEST EXISTENTE
           * ===============================================
           */

          else if (
            existingGuestUserId
          ) {
            /*
             * Revalidamos dentro da escrita.
             *
             * Se a conta tiver mudado de GUEST para
             * ACTIVE/PENDING enquanto o checkout estava
             * sendo processado, o update não encontrará
             * mais a identidade.
             */
            const updateResult =
              await transaction.user.updateMany({
                where: {
                  id:
                    existingGuestUserId,

                  role:
                    "USER",

                  accountStatus:
                    "GUEST",

                  emailVerifiedAt:
                    null,

                  disabledAt:
                    null,
                },

                data: {
                  name:
                    customerName,

                  phone:
                    customerPhone,

                  cpf:
                    customerCpf,
                },
              });

            if (
              updateResult.count !==
              1
            ) {
              throw new CheckoutIdentityConflictError();
            }

            orderUserId =
              existingGuestUserId;
          }

          /*
           * ===============================================
           * NOVO GUEST
           * ===============================================
           */

          else {
            const guestUser =
              await transaction.user.create({
                data: {
                  name:
                    customerName,

                  email:
                    customerEmail,

                  phone:
                    customerPhone,

                  cpf:
                    customerCpf,

                  role:
                    "USER",

                  accountStatus:
                    "GUEST",
                },

                select: {
                  id: true,
                },
              });

            orderUserId =
              guestUser.id;
          }

          /*
           * ===============================================
           * SNAPSHOT DO ENDEREÇO
           * ===============================================
           *
           * Este endereço pertence ao pedido.
           *
           * Ele já nasce arquivado para não aparecer
           * como um endereço salvo/editável na conta.
           *
           * Assim uma alteração futura em "Meus
           * endereços" nunca altera o endereço de
           * um pedido antigo.
           */

          const savedAddress =
            await transaction.address.create({
              data: {
                userId:
                  orderUserId,

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
                  complement ||
                  null,

                isDefault:
                  false,

                archivedAt:
                  new Date(),
              },

              select: {
                id: true,
              },
            });

          /*
           * ===============================================
           * PEDIDO
           * ===============================================
           */

          return transaction.order.create({
            data: {
              userId:
                orderUserId,

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
     * =====================================================
     * RESPOSTA
     * =====================================================
     */

    const response =
      NextResponse.json(
        {
          orderId:
            order.id,

          order: {
            id:
              order.id,

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
              "private, no-store, no-cache, must-revalidate",

            Pragma:
              "no-cache",

            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );

    /*
     * =====================================================
     * TOKEN DO VISITANTE
     * =====================================================
     *
     * SOMENTE checkout visitante recebe um
     * OrderAccessToken.
     *
     * Usuário logado já possui sua CustomerSession
     * e não deve ganhar uma segunda credencial capaz
     * de acessar o pedido depois do logout.
     */

    if (
      isGuestCheckout
    ) {
      const accessToken =
        await createOrderAccessToken({
          orderId:
            order.id,

          userId:
            order.userId,
        });

      /*
       * O token bruto:
       *
       * - não vai para o JSON;
       * - não vai para logs;
       * - fica em cookie HttpOnly;
       * - seu hash fica no banco.
       */
      response.cookies.set({
        ...getOrderAccessCookieOptions(
          order.id
        ),

        value:
          accessToken,
      });
    }

    return response;
  } catch (error) {
    /*
     * Identidade alterada durante o checkout.
     *
     * Não revelamos o motivo exato.
     */
    if (
      error instanceof
      CheckoutIdentityConflictError
    ) {
      return errorResponse(
        "Não foi possível concluir o checkout com os dados informados.",
        409
      );
    }

    /*
     * Pode ocorrer se duas requisições tentarem
     * criar simultaneamente a mesma identidade
     * GUEST.
     *
     * Também não revelamos detalhes do e-mail.
     */
    if (
      isPrismaUniqueError(
        error
      )
    ) {
      return errorResponse(
        "Não foi possível concluir o checkout. Tente novamente.",
        409
      );
    }

    /*
     * Nunca registramos:
     *
     * - nome;
     * - e-mail;
     * - CPF;
     * - telefone;
     * - endereço;
     * - cookies;
     * - tokens;
     * - corpo da requisição.
     */
    if (
      process.env.NODE_ENV ===
      "development"
    ) {
      console.error(
        "Erro interno no checkout:",
        {
          errorType:
            error instanceof Error
              ? error.name
              : "UnknownError",
        }
      );
    }

    return errorResponse(
      "Erro interno ao criar pedido.",
      500
    );
  }
}