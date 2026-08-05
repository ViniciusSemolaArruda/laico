"use client";

import {
  Heart,
  Menu,
  Search,
  ShoppingCart,
  Truck,
  User,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

type SessionResponse = {
  authenticated?: boolean;
  firstName?: string;
};

type StoredCartItem = {
  quantity?: unknown;
};

function getStoredCartCount() {
  if (
    typeof window ===
    "undefined"
  ) {
    return 0;
  }

  try {
    const storedCart =
      window.localStorage.getItem(
        "laico-cart"
      );

    if (!storedCart) {
      return 0;
    }

    const parsed: unknown =
      JSON.parse(
        storedCart
      );

    if (
      !Array.isArray(
        parsed
      )
    ) {
      return 0;
    }

    return parsed.reduce(
      (
        total,
        item: unknown
      ) => {
        if (
          typeof item !==
            "object" ||
          item === null ||
          !(
            "quantity" in
            item
          )
        ) {
          return total;
        }

        const cartItem =
          item as StoredCartItem;

        const quantity =
          Number(
            cartItem.quantity
          );

        if (
          !Number.isFinite(
            quantity
          ) ||
          quantity <= 0
        ) {
          return total;
        }

        return (
          total +
          Math.floor(
            quantity
          )
        );
      },
      0
    );
  } catch {
    return 0;
  }
}

export default function Header() {
  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  const [
    cartCount,
    setCartCount,
  ] =
    useState(0);

  const [
    sessionLoaded,
    setSessionLoaded,
  ] =
    useState(false);

  const [
    authenticated,
    setAuthenticated,
  ] =
    useState(false);

  const [
    firstName,
    setFirstName,
  ] =
    useState("");

  const menuItems = [
    "Todos",
    "Novidades",
    "Mais Vendidos",
    "Artigos Religiosos",
    "Acessórios Femininos",
    "Chaveiro",
    "Acessórios & Embalagem",
    "Coleções",
  ];

  /*
   * =======================================================
   * CARRINHO
   * =======================================================
   */

  useEffect(() => {
    function updateCartCount() {
      setCartCount(
        getStoredCartCount()
      );
    }

    function handleStorage(
      event: StorageEvent
    ) {
      if (
        event.key ===
          "laico-cart" ||
        event.key === null
      ) {
        updateCartCount();
      }
    }

    function handleCartUpdated() {
      updateCartCount();
    }

    function handleFocus() {
      updateCartCount();
    }

    updateCartCount();

    /*
     * storage:
     * sincroniza outras abas.
     *
     * laico-cart-updated:
     * permite atualização imediata na mesma aba.
     *
     * focus:
     * sincroniza novamente quando o usuário
     * volta para a página.
     */
    window.addEventListener(
      "storage",
      handleStorage
    );

    window.addEventListener(
      "laico-cart-updated",
      handleCartUpdated
    );

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );

      window.removeEventListener(
        "laico-cart-updated",
        handleCartUpdated
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, []);

  /*
   * =======================================================
   * SESSÃO DO CLIENTE
   * =======================================================
   */

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadSession() {
      try {
        const response =
          await fetch(
            "/api/auth/session",
            {
              method: "GET",

              credentials:
                "same-origin",

              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        if (
          !response.ok
        ) {
          setAuthenticated(
            false
          );

          return;
        }

        const data =
          (await response.json()) as SessionResponse;

        if (
          data.authenticated ===
            true &&
          typeof data.firstName ===
            "string" &&
          data.firstName.trim()
        ) {
          setAuthenticated(
            true
          );

          setFirstName(
            data.firstName.trim()
          );

          return;
        }

        setAuthenticated(
          false
        );
      } catch (error) {
        if (
          error instanceof
            Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        setAuthenticated(
          false
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setSessionLoaded(
            true
          );
        }
      }
    }

    void loadSession();

    return () => {
      controller.abort();
    };
  }, []);

  /*
   * =======================================================
   * CONTA
   * =======================================================
   */

  const accountHref =
    authenticated
      ? "/minha-conta"
      : "/entrar";

  const accountLabel =
    authenticated
      ? `Olá, ${firstName}`
      : "Cadastre-se ou faça login";

  return (
    <>
      <header className="relative z-40 w-full bg-[#fffdf7] shadow-sm">
        {/* FRETE */}

        <div className="flex min-h-[34px] items-center justify-center bg-gradient-to-r from-[#b8872b] via-[#f3de9b] to-[#cfa74a] px-4 text-center text-[12px] font-semibold tracking-[0.3px] text-white sm:text-[15px]">
          <Truck
            size={15}
            className="mr-2 shrink-0"
          />

          Frete Grátis acima de
          R$1000* para todo o
          Brasil
        </div>

        {/* HEADER PRINCIPAL */}

        <div className="border-b border-[#f3e7c7] bg-[#fffdf7]">
          <div className="mx-auto flex min-h-[115px] max-w-[1370px] flex-col items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:flex-row">
            {/* BUSCA */}

            <div className="order-3 flex h-[46px] w-full items-center rounded-[10px] border border-[#e3c97a] bg-white px-4 shadow-sm lg:order-1 lg:w-[320px]">
              <input
                placeholder="O que você está procurando?"
                aria-label="Pesquisar produtos"
                className="flex-1 bg-transparent text-[14px] text-[#9f7a2f] outline-none placeholder:text-[#c9b27b]"
              />

              <Search
                size={21}
                className="text-[#cfa74a]"
              />
            </div>

            {/* LOGO */}

            <Link
              href="/"
              className="order-1 lg:order-2"
            >
              <img
                src="/logo3.png"
                alt="Laico"
                className="h-auto w-[190px] object-contain mix-blend-multiply sm:w-[230px] lg:w-[270px]"
              />
            </Link>

            {/* AÇÕES */}

            <div className="order-2 flex w-full items-center justify-between gap-4 text-[13px] font-medium text-[#b58b36] sm:gap-8 sm:text-[15px] lg:order-3 lg:w-auto lg:justify-end">
              {/* MENU MOBILE */}

              <button
                type="button"
                onClick={() =>
                  setMenuOpen(
                    true
                  )
                }
                aria-label="Abrir menu"
                className="flex items-center gap-2 transition hover:text-[#d4af37] lg:hidden"
              >
                <Menu
                  size={24}
                />

                Menu
              </button>

              {/* FAVORITOS */}

              <div className="hidden cursor-pointer items-center gap-2 transition hover:text-[#d4af37] sm:flex">
                <Heart
                  size={22}
                />

                Favoritos
              </div>

              {/* CONTA */}

              <Link
                href={
                  accountHref
                }
                className="hidden max-w-[210px] items-center gap-2 transition hover:text-[#d4af37] sm:flex"
              >
                <User
                  size={22}
                  className="shrink-0"
                />

                {sessionLoaded ? (
                  <span className="leading-tight">
                    {
                      accountLabel
                    }
                  </span>
                ) : (
                  <span className="h-4 w-[115px] animate-pulse rounded bg-[#eadfbf]" />
                )}
              </Link>

              {/* CARRINHO */}

              <Link
                href="/carrinho"
                aria-label={`Carrinho com ${cartCount} produto(s)`}
                className="relative flex h-10 w-10 items-center justify-center transition hover:text-[#d4af37]"
              >
                <ShoppingCart
                  size={26}
                />

                {cartCount >
                  0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] px-1 text-[10px] font-extrabold text-white shadow">
                    {cartCount >
                    99
                      ? "99+"
                      : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DESKTOP */}

        <nav className="hidden overflow-x-auto border-b border-[#f3e7c7] bg-[#fffdf7] lg:block">
          <div className="mx-auto flex h-[56px] max-w-[1370px] items-center justify-between gap-6 whitespace-nowrap px-4 text-[12px] font-semibold uppercase tracking-[0.6px] text-[#9f7a2f] sm:px-6 sm:text-[13px]">
            {menuItems.map(
              (item) => (
                <span
                  key={item}
                  className={`relative flex h-full cursor-pointer items-center px-1 transition-all duration-300 hover:text-[#d4af37] sm:px-4 ${
                    item ===
                    "Artigos Religiosos"
                      ? "text-[#cfa74a]"
                      : ""
                  }`}
                >
                  {item}

                  {item ===
                    "Artigos Religiosos" && (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[#f3de9b] to-[#cfa74a]" />
                  )}
                </span>
              )
            )}
          </div>
        </nav>
      </header>

      {/* ===================================================
          MENU MOBILE
      =================================================== */}

      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          menuOpen
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      >
        {/* FUNDO */}

        <button
          type="button"
          aria-label="Fechar menu"
          className="absolute inset-0 h-full w-full bg-black/40"
          onClick={() =>
            setMenuOpen(
              false
            )
          }
        />

        {/* PAINEL */}

        <div
          className={`absolute left-0 top-0 h-full w-[min(320px,88vw)] bg-[#fffdf7] shadow-2xl transition-transform duration-300 ${
            menuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >
          {/* CABEÇALHO */}

          <div className="flex h-[80px] items-center justify-between border-b border-[#f3e7c7] px-5">
            <Link
              href="/"
              onClick={() =>
                setMenuOpen(
                  false
                )
              }
            >
              <img
                src="/logo3.png"
                alt="Laico"
                className="w-[140px] object-contain"
              />
            </Link>

            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  false
                )
              }
              aria-label="Fechar menu"
              className="text-[#b58b36]"
            >
              <X
                size={28}
              />
            </button>
          </div>

          {/* CATEGORIAS */}

          <div className="py-4">
            {menuItems.map(
              (item) => (
                <button
                  type="button"
                  key={item}
                  className={`h-[54px] w-full border-b border-[#f7edd5] px-5 text-left text-[14px] font-semibold uppercase tracking-[0.5px] transition hover:bg-[#fff5de] hover:text-[#cfa74a] ${
                    item ===
                    "Artigos Religiosos"
                      ? "bg-[#fff8e8] text-[#cfa74a]"
                      : "text-[#9f7a2f]"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          {/* CONTA / FAVORITOS */}

          <div className="space-y-2 border-t border-[#f3e7c7] px-5 pt-6">
            <div className="flex h-11 items-center gap-3 text-[#9f7a2f]">
              <Heart
                size={20}
              />

              Favoritos
            </div>

            <Link
              href={
                accountHref
              }
              onClick={() =>
                setMenuOpen(
                  false
                )
              }
              className="flex min-h-11 items-center gap-3 text-[#9f7a2f] transition hover:text-[#cfa74a]"
            >
              <User
                size={20}
                className="shrink-0"
              />

              {sessionLoaded ? (
                <span>
                  {
                    accountLabel
                  }
                </span>
              ) : (
                <span className="h-4 w-[150px] animate-pulse rounded bg-[#eadfbf]" />
              )}
            </Link>

            {/* CARRINHO MOBILE */}

            <Link
              href="/carrinho"
              onClick={() =>
                setMenuOpen(
                  false
                )
              }
              className="flex min-h-11 items-center gap-3 text-[#9f7a2f] transition hover:text-[#cfa74a]"
            >
              <div className="relative">
                <ShoppingCart
                  size={20}
                />

                {cartCount >
                  0 && (
                  <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#cfa74a] px-1 text-[9px] font-bold text-white">
                    {cartCount >
                    99
                      ? "99+"
                      : cartCount}
                  </span>
                )}
              </div>

              Ver carrinho
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}