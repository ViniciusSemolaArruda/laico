"use client";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer";

import Link from "next/link";

import {
  CreditCard,
  Home,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock?: number;
};

function formatPrice(
  value: number
) {
  return value.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function normalizeCart(
  value: unknown
): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is Record<
        string,
        unknown
      > =>
        typeof item ===
          "object" &&
        item !== null
    )
    .map((item) => {
      const id =
        typeof item.id ===
        "string"
          ? item.id
          : "";

      const slug =
        typeof item.slug ===
        "string"
          ? item.slug
          : "";

      const name =
        typeof item.name ===
        "string"
          ? item.name
          : "";

      const image =
        typeof item.image ===
        "string"
          ? item.image
          : "";

      const price =
        Number(item.price);

      const storedQuantity =
        Math.floor(
          Number(
            item.quantity
          )
        );

      const storedStock =
        item.stock ===
          undefined
          ? undefined
          : Math.floor(
              Number(
                item.stock
              )
            );

      const stock =
        storedStock !==
          undefined &&
        Number.isFinite(
          storedStock
        )
          ? Math.max(
              0,
              storedStock
            )
          : undefined;

      const maximumQuantity =
        stock !== undefined
          ? Math.max(
              1,
              stock
            )
          : 99;

      const quantity =
        Number.isFinite(
          storedQuantity
        )
          ? Math.min(
              Math.max(
                storedQuantity,
                1
              ),
              maximumQuantity
            )
          : 1;

      return {
        id,
        slug,
        name,
        image,
        price,
        quantity,
        stock,
      };
    })
    .filter(
      (item) =>
        item.id.length > 0 &&
        item.slug.length > 0 &&
        item.name.length > 0 &&
        Number.isFinite(
          item.price
        ) &&
        item.price >= 0 &&
        item.quantity > 0
    );
}

export default function CartPage() {
  const [
    cartItems,
    setCartItems,
  ] =
    useState<CartItem[]>(
      []
    );

  /*
   * Mantém a versão mais recente do carrinho
   * disponível para os manipuladores dos botões.
   */
  const cartItemsRef =
    useRef<CartItem[]>(
      []
    );

  /*
   * =====================================================
   * CARREGAR CARRINHO
   * =====================================================
   */

  useEffect(() => {
    try {
      const storedCart =
        localStorage.getItem(
          "laico-cart"
        );

      if (!storedCart) {
        cartItemsRef.current =
          [];

        return;
      }

      const parsedCart =
        JSON.parse(
          storedCart
        ) as unknown;

      const normalizedCart =
        normalizeCart(
          parsedCart
        );

      cartItemsRef.current =
        normalizedCart;

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartItems(
        normalizedCart
      );
    } catch {
      /*
       * Um conteúdo inválido no localStorage
       * não deve quebrar a página.
       */
      localStorage.removeItem(
        "laico-cart"
      );

      cartItemsRef.current =
        [];

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartItems([]);
    }
  }, []);

  /*
   * =====================================================
   * SALVAR E NOTIFICAR O HEADER
   * =====================================================
   */

  function commitCart(
    nextItems: CartItem[]
  ) {
    const normalizedItems =
      normalizeCart(
        nextItems
      );

    cartItemsRef.current =
      normalizedItems;

    setCartItems(
      normalizedItems
    );

    localStorage.setItem(
      "laico-cart",
      JSON.stringify(
        normalizedItems
      )
    );

    const totalQuantity =
      normalizedItems.reduce(
        (
          total,
          item
        ) =>
          total +
          item.quantity,
        0
      );

    /*
     * O Header escuta este evento e atualiza
     * o contador sem recarregar a página.
     */
    window.dispatchEvent(
      new CustomEvent(
        "laico-cart-updated",
        {
          detail: {
            items:
              normalizedItems,

            quantity:
              totalQuantity,
          },
        }
      )
    );
  }

  /*
   * =====================================================
   * VALORES
   * =====================================================
   */

  const subtotal =
    useMemo(() => {
      return cartItems.reduce(
        (
          total,
          item
        ) =>
          total +
          item.price *
            item.quantity,
        0
      );
    }, [cartItems]);

  /*
   * Valor temporário.
   *
   * Depois será substituído pelo cálculo
   * real de frete através do CEP.
   */
  const shipping =
    cartItems.length > 0
      ? 18.9
      : 0;

  const total =
    subtotal +
    shipping;

  /*
   * =====================================================
   * QUANTIDADE
   * =====================================================
   */

  function increaseQuantity(
    id: string
  ) {
    const nextItems =
      cartItemsRef.current.map(
        (item) => {
          if (
            item.id !== id
          ) {
            return item;
          }

          const maximumQuantity =
            item.stock !==
              undefined
              ? item.stock
              : 99;

          if (
            item.quantity >=
            maximumQuantity
          ) {
            return item;
          }

          return {
            ...item,

            quantity:
              item.quantity +
              1,
          };
        }
      );

    commitCart(
      nextItems
    );
  }

  function decreaseQuantity(
    id: string
  ) {
    const nextItems =
      cartItemsRef.current.map(
        (item) => {
          if (
            item.id !== id ||
            item.quantity <= 1
          ) {
            return item;
          }

          return {
            ...item,

            quantity:
              item.quantity -
              1,
          };
        }
      );

    commitCart(
      nextItems
    );
  }

  function removeItem(
    id: string
  ) {
    const nextItems =
      cartItemsRef.current.filter(
        (item) =>
          item.id !== id
      );

    commitCart(
      nextItems
    );
  }

  return (
    <main className="min-h-screen bg-[#fffdf7]">
      <Header />

      <section className="mx-auto max-w-[1370px] px-4 py-6 sm:px-6">
        {/* NAVEGAÇÃO */}

        <div className="mb-7 flex items-center gap-2 text-[13px] text-neutral-600">
          <Home
            size={15}
            aria-hidden="true"
          />

          <Link
            href="/"
            className="transition hover:text-[#cfa74a]"
          >
            Início
          </Link>

          <span>
            ›
          </span>

          <span>
            Carrinho
          </span>
        </div>

        <h1 className="mb-8 font-serif text-[30px] text-[#20170f] sm:text-[34px]">
          Meu Carrinho
        </h1>

        {cartItems.length ===
        0 ? (
          /*
           * =================================================
           * CARRINHO VAZIO
           * =================================================
           */

          <div className="rounded-xl border border-[#f0e3c2] bg-white px-5 py-12 text-center sm:p-12">
            <h2 className="text-[22px] font-bold text-[#20170f] sm:text-[24px]">
              Seu carrinho está
              vazio
            </h2>

            <p className="mb-6 mt-3 text-sm leading-6 text-neutral-500">
              Adicione produtos
              para continuar sua
              compra.
            </p>

            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded bg-[#cfa74a] px-6 font-bold text-white transition hover:bg-[#b8872b]"
            >
              Continuar comprando
            </Link>
          </div>
        ) : (
          /*
           * =================================================
           * CARRINHO COM PRODUTOS
           * =================================================
           */

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* PRODUTOS */}

            <section className="overflow-hidden rounded-lg border border-[#f0e3c2] bg-white">
              {/* CABEÇALHO DA TABELA */}

              <div className="hidden grid-cols-[minmax(280px,1fr)_140px_130px_120px] gap-4 border-b border-[#f0e3c2] px-6 py-4 text-[13px] font-bold uppercase text-[#6f5a28] md:grid">
                <span>
                  Produto
                </span>

                <span>
                  Quantidade
                </span>

                <span>
                  Preço
                </span>

                <span>
                  Total
                </span>
              </div>

              {/* ITENS */}

              {cartItems.map(
                (item) => {
                  const reachedStockLimit =
                    item.stock !==
                      undefined &&
                    item.quantity >=
                      item.stock;

                  return (
                    <div
                      key={
                        item.id
                      }
                      className="grid grid-cols-1 items-center gap-5 border-b border-[#f0e3c2] px-4 py-5 last:border-b-0 sm:px-6 md:grid-cols-[minmax(280px,1fr)_140px_130px_120px] md:gap-4"
                    >
                      {/* PRODUTO */}

                      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                        <Link
                          href={`/produtos/${item.slug}`}
                          className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-lg border border-[#f0e3c2] bg-[#fffdf7] sm:h-[105px] sm:w-[105px]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.image
                            }
                            alt={
                              item.name
                            }
                            className="max-h-[82%] max-w-[82%] object-contain"
                          />
                        </Link>

                        <div className="min-w-0">
                          <Link
                            href={`/produtos/${item.slug}`}
                            className="line-clamp-2 text-[15px] font-semibold text-[#20170f] transition hover:text-[#cfa74a] sm:text-[17px]"
                          >
                            {
                              item.name
                            }
                          </Link>

                          {item.stock !==
                            undefined && (
                            <p className="mt-2 text-xs text-neutral-500">
                              {
                                item.stock
                              }{" "}
                              unidade(s)
                              disponível(is)
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeItem(
                                item.id
                              )
                            }
                            aria-label={`Remover ${item.name} do carrinho`}
                            className="mt-3 flex items-center gap-2 text-[13px] font-medium text-red-500 transition hover:text-red-700"
                          >
                            <Trash2
                              size={
                                15
                              }
                              aria-hidden="true"
                            />

                            Remover
                          </button>
                        </div>
                      </div>

                      {/* QUANTIDADE */}

                      <div>
                        <span className="mb-2 block text-xs font-bold uppercase text-neutral-500 md:hidden">
                          Quantidade
                        </span>

                        <div className="flex h-9 w-[108px] overflow-hidden rounded border border-[#f0e3c2]">
                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item.id
                              )
                            }
                            disabled={
                              item.quantity <=
                              1
                            }
                            aria-label={`Diminuir quantidade de ${item.name}`}
                            className="flex w-9 items-center justify-center border-r border-[#f0e3c2] transition hover:bg-[#fff8e8] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus
                              size={
                                14
                              }
                              aria-hidden="true"
                            />
                          </button>

                          <span className="flex flex-1 items-center justify-center text-[14px] font-semibold">
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item.id
                              )
                            }
                            disabled={
                              reachedStockLimit
                            }
                            aria-label={`Aumentar quantidade de ${item.name}`}
                            className="flex w-9 items-center justify-center border-l border-[#f0e3c2] transition hover:bg-[#fff8e8] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus
                              size={
                                14
                              }
                              aria-hidden="true"
                            />
                          </button>
                        </div>

                        {reachedStockLimit && (
                          <p className="mt-2 text-[11px] font-medium text-amber-700">
                            Limite do estoque
                            atingido.
                          </p>
                        )}
                      </div>

                      {/* PREÇO */}

                      <div>
                        <span className="mb-1 block text-xs font-bold uppercase text-neutral-500 md:hidden">
                          Preço unitário
                        </span>

                        <p className="text-[16px] font-semibold text-[#cfa74a]">
                          {formatPrice(
                            item.price
                          )}
                        </p>
                      </div>

                      {/* TOTAL */}

                      <div>
                        <span className="mb-1 block text-xs font-bold uppercase text-neutral-500 md:hidden">
                          Total
                        </span>

                        <p className="text-[16px] font-bold text-[#20170f]">
                          {formatPrice(
                            item.price *
                              item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </section>

            {/* RESUMO */}

            <aside className="h-fit rounded-lg border border-[#f0e3c2] bg-white p-5 shadow-[0_2px_10px_rgba(207,167,74,0.08)] sm:p-6 lg:sticky lg:top-5">
              <h2 className="mb-5 font-serif text-[24px] text-[#20170f]">
                Resumo do pedido
              </h2>

              <div className="space-y-4 text-[14px]">
                <div className="flex justify-between gap-4">
                  <span className="text-neutral-600">
                    Subtotal
                  </span>

                  <strong>
                    {formatPrice(
                      subtotal
                    )}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-neutral-600">
                    Frete
                  </span>

                  <strong>
                    {formatPrice(
                      shipping
                    )}
                  </strong>
                </div>

                <p className="text-xs leading-5 text-neutral-500">
                  O valor definitivo
                  será validado no
                  checkout.
                </p>

                <div className="flex justify-between gap-4 border-t border-[#f0e3c2] pt-4 text-[18px]">
                  <span className="font-bold">
                    Total
                  </span>

                  <strong className="text-[#cfa74a]">
                    {formatPrice(
                      total
                    )}
                  </strong>
                </div>
              </div>

              <Link
                href="/checkout"
                className="mt-6 flex h-[46px] w-full items-center justify-center rounded bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#cfa74a] font-bold text-white transition hover:brightness-95"
              >
                Finalizar compra
              </Link>

              <Link
                href="/"
                className="mt-3 flex h-[42px] w-full items-center justify-center rounded border border-[#cfa74a] font-bold text-[#cfa74a] transition hover:bg-[#fff8e8]"
              >
                Continuar comprando
              </Link>

              <div className="mt-6 space-y-4 border-t border-[#f0e3c2] pt-5">
                <div className="flex gap-3 text-[13px]">
                  <Truck
                    className="shrink-0 text-[#cfa74a]"
                    size={20}
                    aria-hidden="true"
                  />

                  <span>
                    Entrega para todo
                    o Brasil
                  </span>
                </div>

                <div className="flex gap-3 text-[13px]">
                  <CreditCard
                    className="shrink-0 text-[#cfa74a]"
                    size={20}
                    aria-hidden="true"
                  />

                  <span>
                    Pagamento seguro
                    via Pix, cartão ou
                    boleto
                  </span>
                </div>

                <div className="flex gap-3 text-[13px]">
                  <ShieldCheck
                    className="shrink-0 text-[#cfa74a]"
                    size={20}
                    aria-hidden="true"
                  />

                  <span>
                    Compra protegida
                    e dados seguros
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

      <Footer />

      <button
        type="button"
        aria-label="Falar pelo WhatsApp"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl transition hover:scale-105 sm:bottom-8 sm:right-8 sm:h-[62px] sm:w-[62px]"
      >
        <MessageCircle
          size={32}
          aria-hidden="true"
        />
      </button>
    </main>
  );
}