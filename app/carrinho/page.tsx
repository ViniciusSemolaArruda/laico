"use client";

import Header from "../../components/Header/Header";
import Footer from "../../components/Footer";

import ShippingCalculator, {
  type SelectedShippingOption,
} from "@/components/cart/ShippingCalculator";

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
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  stock?: number;
};

/*
 * =========================================================
 * FORMATAÇÃO
 * =========================================================
 */

function formatPrice(
  value: number
) {
  return value.toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    }
  );
}

/*
 * =========================================================
 * NORMALIZAR CARRINHO LOCAL
 * =========================================================
 */

function normalizeCart(
  value: unknown
): CartItem[] {
  if (
    !Array.isArray(
      value
    )
  ) {
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
    .map(
      (item) => {
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
          Number(
            item.price
          );

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
          stock !==
            undefined
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
      }
    )
    .filter(
      (item) =>
        item.id.length >
          0 &&
        item.slug.length >
          0 &&
        item.name.length >
          0 &&
        Number.isFinite(
          item.price
        ) &&
        item.price >=
          0 &&
        item.quantity >
          0
    );
}

/*
 * =========================================================
 * PÁGINA
 * =========================================================
 */

export default function CartPage() {
  const [
    cartItems,
    setCartItems,
  ] =
    useState<CartItem[]>(
      []
    );

  const [
    cartLoaded,
    setCartLoaded,
  ] =
    useState(
      false
    );

  const [
    selectedShipping,
    setSelectedShipping,
  ] =
    useState<
      SelectedShippingOption |
      null
    >(null);

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

      if (
        !storedCart
      ) {
        cartItemsRef.current =
          [];

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCartItems([]);

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCartLoaded(
          true
        );

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

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartLoaded(
        true
      );
    } catch {
      localStorage.removeItem(
        "laico-cart"
      );

      sessionStorage.removeItem(
        "laico-shipping-selection"
      );

      cartItemsRef.current =
        [];

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartItems([]);

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCartLoaded(
        true
      );
    }
  }, []);

  /*
   * =====================================================
   * INVALIDAR FRETE
   * =====================================================
   *
   * Qualquer mudança no carrinho invalida a cotação,
   * porque peso, subtotal e quantidade mudaram.
   */

  function invalidateShipping() {
    setSelectedShipping(
      null
    );

    sessionStorage.removeItem(
      "laico-shipping-selection"
    );
  }

  /*
   * =====================================================
   * SALVAR CARRINHO
   * =====================================================
   */

  function commitCart(
    nextItems:
      CartItem[]
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

    invalidateShipping();

    const totalQuantity =
      normalizedItems.reduce(
        (
          totalQuantityValue,
          item
        ) =>
          totalQuantityValue +
          item.quantity,
        0
      );

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
          subtotalValue,
          item
        ) =>
          subtotalValue +
          item.price *
            item.quantity,
        0
      );
    }, [cartItems]);

  const shipping =
    selectedShipping
      ?.price ??
    0;

  const total =
    subtotal +
    shipping;

  /*
   * Força o componente de frete a ser recriado
   * quando produtos ou quantidades mudarem.
   */
  const cartSignature =
    useMemo(() => {
      return cartItems
        .map(
          (item) =>
            `${item.id}:${item.quantity}`
        )
        .sort()
        .join(
          "|"
        );
    }, [cartItems]);

  const shippingItems =
    useMemo(() => {
      return cartItems.map(
        (item) => ({
          id:
            item.id,

          quantity:
            item.quantity,
        })
      );
    }, [cartItems]);

  /*
   * =====================================================
   * FRETE SELECIONADO
   * =====================================================
   */

  const handleShippingSelection =
    useCallback(
      (
        selection:
          | SelectedShippingOption
          | null
      ) => {
        setSelectedShipping(
          selection
        );
      },
      []
    );

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
            item.id !==
            id
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
            item.id !==
              id ||
            item.quantity <=
              1
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
          item.id !==
          id
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

        {!cartLoaded ? (
          /*
           * =================================================
           * CARREGANDO
           * =================================================
           */

          <div className="rounded-xl border border-[#f0e3c2] bg-white p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#e8dcc2] border-t-[#cfa74a]" />

            <p className="mt-4 text-sm text-neutral-500">
              Carregando seu
              carrinho...
            </p>
          </div>
        ) : cartItems.length ===
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

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* PRODUTOS */}

            <section className="overflow-hidden rounded-lg border border-[#f0e3c2] bg-white">
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

                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-600">
                    Frete
                  </span>

                  {selectedShipping ? (
                    <div className="text-right">
                      <strong
                        className={
                          selectedShipping
                            .freeShipping
                            ? "text-green-700"
                            : ""
                        }
                      >
                        {selectedShipping
                          .freeShipping
                          ? "Grátis"
                          : formatPrice(
                              shipping
                            )}
                      </strong>

                      <span className="mt-1 block max-w-[190px] text-[11px] leading-4 text-neutral-500">
                        {
                          selectedShipping
                            .serviceName
                        }
                        {" · "}
                        {
                          selectedShipping
                            .companyName
                        }
                      </span>
                    </div>
                  ) : (
                    <strong className="text-neutral-400">
                      A calcular
                    </strong>
                  )}
                </div>
              </div>

              {/* CÁLCULO DE FRETE */}

              <ShippingCalculator
                key={
                  cartSignature
                }
                items={
                  shippingItems
                }
                onSelectionChange={
                  handleShippingSelection
                }
              />

              {/* TOTAL */}

              <div className="mt-5 flex justify-between gap-4 border-t border-[#f0e3c2] pt-4 text-[18px]">
                <span className="font-bold">
                  {selectedShipping
                    ? "Total"
                    : "Total parcial"}
                </span>

                <strong className="text-[#cfa74a]">
                  {formatPrice(
                    total
                  )}
                </strong>
              </div>

              <p className="mt-3 text-xs leading-5 text-neutral-500">
                Preços, estoque e
                entrega serão
                confirmados novamente
                no checkout.
              </p>

              {/* FINALIZAR */}

              {selectedShipping ? (
                <Link
                  href="/checkout"
                  className="mt-6 flex h-[46px] w-full items-center justify-center rounded bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#cfa74a] font-bold text-white transition hover:brightness-95"
                >
                  Finalizar compra
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-6 flex h-[46px] w-full cursor-not-allowed items-center justify-center rounded bg-neutral-300 font-bold text-white"
                >
                  Escolha a entrega
                </button>
              )}

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
                    Entrega calculada
                    pelo CEP
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
                    Frete validado
                    novamente no
                    servidor
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