"use client";

import {
  Heart,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import Link from "next/link";
import { useEffect, useState } from "react";

import PromotionalBar from "@/components/PromotionalBar/PromotionalBar";

import styles from "./Header.module.css";

type SessionResponse = {
  authenticated?: boolean;
  firstName?: string;
};

type StoredCartItem = {
  quantity?: unknown;
};

function getStoredCartCount() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const storedCart =
      window.localStorage.getItem("laico-cart");

    if (!storedCart) {
      return 0;
    }

    const parsed: unknown =
      JSON.parse(storedCart);

    if (!Array.isArray(parsed)) {
      return 0;
    }

    return parsed.reduce(
      (total, item: unknown) => {
        if (
          typeof item !== "object" ||
          item === null ||
          !("quantity" in item)
        ) {
          return total;
        }

        const cartItem =
          item as StoredCartItem;

        const quantity =
          Number(cartItem.quantity);

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          return total;
        }

        return total + Math.floor(quantity);
      },
      0
    );
  } catch {
    return 0;
  }
}

export default function Header() {
  const [menuOpen, setMenuOpen] =
    useState(false);

  const [cartCount, setCartCount] =
    useState(0);

  const [
    sessionLoaded,
    setSessionLoaded,
  ] = useState(false);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [firstName, setFirstName] =
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
        event.key === "laico-cart" ||
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
   * SESSÃO
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
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          setAuthenticated(false);
          return;
        }

        const data =
          (await response.json()) as SessionResponse;

        if (
          data.authenticated === true &&
          typeof data.firstName === "string" &&
          data.firstName.trim()
        ) {
          setAuthenticated(true);

          setFirstName(
            data.firstName.trim()
          );

          return;
        }

        setAuthenticated(false);
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "AbortError"
        ) {
          return;
        }

        setAuthenticated(false);
      } finally {
        if (!controller.signal.aborted) {
          setSessionLoaded(true);
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

  return (
    <>
      <header className={styles.header}>
        {/* FAIXA PROMOCIONAL */}

        <PromotionalBar />

        {/* =================================================
            NOTEBOOK / DESKTOP
        ================================================= */}

        <div className={styles.desktopHeader}>
          {/* ESQUERDA - BUSCA */}

          <div className={styles.desktopLeft}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="O que você está procurando?"
                aria-label="Pesquisar produtos"
              />

              <Search size={21} />
            </div>
          </div>

          {/* CENTRO - LOGO */}

          <Link
            href="/"
            aria-label="Página inicial"
            className={styles.desktopLogo}
          >
            <img
              src="/logo3.png"
              alt="Laico"
            />
          </Link>

          {/* DIREITA - AÇÕES */}

          <div className={styles.desktopActions}>
            <button
              type="button"
              className={styles.favoriteButton}
            >
              <Heart size={22} />

              <span>Favoritos</span>
            </button>

            <Link
              href={accountHref}
              className={styles.account}
            >
              <User size={22} />

              {sessionLoaded ? (
                authenticated ? (
                  <span className={styles.accountLogged}>
                    Olá, {firstName}
                  </span>
                ) : (
                  <span className={styles.accountGuest}>
                    <span>
                      Cadastre-se ou
                    </span>

                    <span>
                      faça login
                    </span>
                  </span>
                )
              ) : (
                <span
                  className={
                    styles.accountLoading
                  }
                />
              )}
            </Link>

            <Link
              href="/carrinho"
              aria-label={`Carrinho com ${cartCount} produto(s)`}
              className={styles.cartButton}
            >
              <ShoppingCart size={26} />

              {cartCount > 0 && (
                <span
                  className={styles.cartBadge}
                >
                  {cartCount > 99
                    ? "99+"
                    : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* =================================================
            MOBILE
        ================================================= */}

        <div className={styles.mobileHeader}>
          {/* MENU | LOGO | CARRINHO */}

          <div className={styles.mobileTop}>
            <button
              type="button"
              onClick={() =>
                setMenuOpen(true)
              }
              aria-label="Abrir menu"
              className={
                styles.mobileMenuButton
              }
            >
              <Menu size={27} />
            </button>

            <Link
              href="/"
              aria-label="Página inicial"
              className={styles.mobileLogo}
            >
              <img
                src="/logo3.png"
                alt="Laico"
              />
            </Link>

            <Link
              href="/carrinho"
              aria-label={`Carrinho com ${cartCount} produto(s)`}
              className={
                styles.mobileCartButton
              }
            >
              <ShoppingCart size={27} />

              {cartCount > 0 && (
                <span
                  className={styles.cartBadge}
                >
                  {cartCount > 99
                    ? "99+"
                    : cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* BUSCA */}

          <div className={styles.mobileSearch}>
            <input
              type="text"
              placeholder="O que você está procurando?"
              aria-label="Pesquisar produtos"
            />

            <Search size={21} />
          </div>
        </div>

        {/* =================================================
            NAVEGAÇÃO DESKTOP
        ================================================= */}

        <nav className={styles.navigation}>
          <div className={styles.navigationInner}>
            {menuItems.map((item) => (
              <button
                type="button"
                key={item}
                className={`${styles.navigationItem} ${
                  item ===
                  "Artigos Religiosos"
                    ? styles.navigationItemActive
                    : ""
                }`}
              >
                {item}

                {item ===
                  "Artigos Religiosos" && (
                  <span
                    className={
                      styles.activeLine
                    }
                  />
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* ===================================================
          MENU LATERAL MOBILE
      =================================================== */}

      <div
        className={`${styles.mobileMenuOverlay} ${
          menuOpen
            ? styles.mobileMenuOverlayOpen
            : ""
        }`}
      >
        {/* FUNDO */}

        <button
          type="button"
          aria-label="Fechar menu"
          className={styles.mobileBackdrop}
          onClick={() =>
            setMenuOpen(false)
          }
        />

        {/* PAINEL */}

        <aside
          className={`${styles.mobileMenuPanel} ${
            menuOpen
              ? styles.mobileMenuPanelOpen
              : ""
          }`}
        >
          {/* CABEÇALHO */}

          <div
            className={
              styles.mobileMenuHeader
            }
          >
            <Link
              href="/"
              onClick={() =>
                setMenuOpen(false)
              }
              className={
                styles.mobileMenuLogo
              }
            >
              <img
                src="/logo3.png"
                alt="Laico"
              />
            </Link>

            <button
              type="button"
              onClick={() =>
                setMenuOpen(false)
              }
              aria-label="Fechar menu"
              className={
                styles.closeMenuButton
              }
            >
              <X size={28} />
            </button>
          </div>

          {/* CATEGORIAS */}

          <div
            className={
              styles.mobileCategories
            }
          >
            {menuItems.map((item) => (
              <button
                type="button"
                key={item}
                className={`${styles.mobileCategory} ${
                  item ===
                  "Artigos Religiosos"
                    ? styles.mobileCategoryActive
                    : ""
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* AÇÕES */}

          <div
            className={
              styles.mobileMenuActions
            }
          >
            <button
              type="button"
              className={
                styles.mobileMenuAction
              }
            >
              <Heart size={20} />

              <span>Favoritos</span>
            </button>

            <Link
              href={accountHref}
              onClick={() =>
                setMenuOpen(false)
              }
              className={
                styles.mobileMenuAction
              }
            >
              <User size={20} />

              {sessionLoaded ? (
                authenticated ? (
                  <span>
                    Olá, {firstName}
                  </span>
                ) : (
                  <span
                    className={
                      styles.mobileAccountGuest
                    }
                  >
                    <span>
                      Cadastre-se ou
                    </span>

                    <span>
                      faça login
                    </span>
                  </span>
                )
              ) : (
                <span
                  className={
                    styles.mobileAccountLoading
                  }
                />
              )}
            </Link>

            <Link
              href="/carrinho"
              onClick={() =>
                setMenuOpen(false)
              }
              className={
                styles.mobileMenuAction
              }
            >
              <span
                className={
                  styles.mobileMenuCart
                }
              >
                <ShoppingCart size={20} />

                {cartCount > 0 && (
                  <span
                    className={
                      styles.drawerCartBadge
                    }
                  >
                    {cartCount > 99
                      ? "99+"
                      : cartCount}
                  </span>
                )}
              </span>

              <span>Ver carrinho</span>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}