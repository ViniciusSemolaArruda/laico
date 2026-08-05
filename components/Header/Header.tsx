"use client";

import {
  Menu,
  Phone,
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
      window.localStorage.getItem(
        "laico-cart"
      );

    if (!storedCart) {
      return 0;
    }

    const parsed: unknown =
      JSON.parse(storedCart);

    if (!Array.isArray(parsed)) {
      return 0;
    }

    return parsed.reduce(
      (
        total,
        item: unknown
      ) => {
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

        return (
          total +
          Math.floor(quantity)
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
  ] = useState(false);

  const [
    cartCount,
    setCartCount,
  ] = useState(0);

  const [
    sessionLoaded,
    setSessionLoaded,
  ] = useState(false);

  const [
    authenticated,
    setAuthenticated,
  ] = useState(false);

  const [
    firstName,
    setFirstName,
  ] = useState("");

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

              cache:
                "no-store",

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
        if (
          !controller.signal.aborted
        ) {
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
   * VALORES
   * =======================================================
   */

  const accountHref =
    authenticated
      ? "/minha-conta"
      : "/entrar";

  const cartLabel =
    cartCount > 99
      ? "99+"
      : cartCount;

  return (
    <>
      <header className={styles.header}>
        {/* =================================================
            FAIXA PROMOCIONAL
        ================================================= */}

        <PromotionalBar />

        {/* =================================================
            DESKTOP / NOTEBOOK
        ================================================= */}

        <div className={styles.desktopHeader}>
          {/* ===============================================
              ESQUERDA - BUSCA
          ================================================ */}

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

          {/* ===============================================
              CENTRO - LOGO
          ================================================ */}

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

          {/* ===============================================
              DIREITA
          ================================================ */}

          <div className={styles.desktopActions}>
            {/* FALE CONOSCO */}

            <Link
              href="/contato"
              className={styles.contact}
            >
              <Phone
                size={27}
                strokeWidth={1.8}
              />

              <span className={styles.contactText}>
                <strong>
                  Fale Conosco
                </strong>

                <span>
                  Clique aqui
                </span>
              </span>
            </Link>

            {/* CONTA */}

            {sessionLoaded ? (
              authenticated ? (
                <Link
                  href="/minha-conta"
                  className={
                    styles.accountLoggedLink
                  }
                >
                  <User
                    size={24}
                    strokeWidth={1.8}
                  />

                  <span>
                    Olá, {firstName}
                  </span>
                </Link>
              ) : (
                <div
                  className={
                    styles.accountGuestWrapper
                  }
                >
                  <User
                    size={26}
                    strokeWidth={1.8}
                  />

                  <div
                    className={
                      styles.accountGuest
                    }
                  >
                    <Link
                      href="/criar-conta"
                      className={
                        styles.accountGuestLink
                      }
                    >
                      Cadastre-se
                    </Link>

                    <Link
                      href="/entrar"
                      className={
                        styles.accountGuestLink
                      }
                    >
                      faça seu login
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div
                className={
                  styles.accountLoadingWrapper
                }
              >
                <User
                  size={26}
                  strokeWidth={1.8}
                />

                <span
                  className={
                    styles.accountLoading
                  }
                />
              </div>
            )}

            {/* CARRINHO */}

            <Link
              href="/carrinho"
              aria-label={`Carrinho com ${cartCount} produto(s)`}
              className={styles.cartButton}
            >
              <ShoppingCart size={27} />

              <span
                className={styles.cartBadge}
              >
                {cartLabel}
              </span>
            </Link>
          </div>
        </div>

        {/* =================================================
            MOBILE
        ================================================= */}

        <div className={styles.mobileHeader}>
          {/* MENU | LOGO | CARRINHO */}

          <div className={styles.mobileTop}>
            {/* MENU */}

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

            {/* LOGO */}

            <Link
              href="/"
              aria-label="Página inicial"
              className={
                styles.mobileLogo
              }
            >
              <img
                src="/logo3.png"
                alt="Laico"
              />
            </Link>

            {/* CARRINHO */}

            <Link
              href="/carrinho"
              aria-label={`Carrinho com ${cartCount} produto(s)`}
              className={
                styles.mobileCartButton
              }
            >
              <ShoppingCart size={27} />

              <span
                className={styles.cartBadge}
              >
                {cartLabel}
              </span>
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
            NAVEGAÇÃO
        ================================================= */}

        <nav className={styles.navigation}>
          <div className={styles.navigationInner}>
            {menuItems.map(
              (item) => (
                <button
                  type="button"
                  key={item}
                  className={`${
                    styles.navigationItem
                  } ${
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
              )
            )}
          </div>
        </nav>
      </header>

      {/* ===================================================
          MENU LATERAL MOBILE
      =================================================== */}

      <div
        className={`${
          styles.mobileMenuOverlay
        } ${
          menuOpen
            ? styles.mobileMenuOverlayOpen
            : ""
        }`}
      >
        {/* FUNDO */}

        <button
          type="button"
          aria-label="Fechar menu"
          className={
            styles.mobileBackdrop
          }
          onClick={() =>
            setMenuOpen(false)
          }
        />

        {/* PAINEL */}

        <aside
          className={`${
            styles.mobileMenuPanel
          } ${
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

          <div className={styles.mobileCategories}>
            {menuItems.map(
              (item) => (
                <button
                  type="button"
                  key={item}
                  className={`${
                    styles.mobileCategory
                  } ${
                    item ===
                    "Artigos Religiosos"
                      ? styles.mobileCategoryActive
                      : ""
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          {/* AÇÕES */}

          <div
            className={
              styles.mobileMenuActions
            }
          >
            {/* FALE CONOSCO */}

            <Link
              href="/contato"
              onClick={() =>
                setMenuOpen(false)
              }
              className={styles.mobileContact}
            >
              <Phone
                size={21}
                strokeWidth={1.8}
              />

              <span>
                <strong>
                  Fale Conosco
                </strong>

                <small>
                  Clique aqui
                </small>
              </span>
            </Link>

            {/* CONTA */}

            {sessionLoaded ? (
              authenticated ? (
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

                  <span>
                    Olá, {firstName}
                  </span>
                </Link>
              ) : (
                <div
                  className={
                    styles.mobileGuestAccount
                  }
                >
                  <User size={20} />

                  <div>
                    <Link
                      href="/criar-conta"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      Cadastre-se
                    </Link>

                    <Link
                      href="/entrar"
                      onClick={() =>
                        setMenuOpen(false)
                      }
                    >
                      faça seu login
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div
                className={
                  styles.mobileMenuAction
                }
              >
                <User size={20} />

                <span
                  className={
                    styles.mobileAccountLoading
                  }
                />
              </div>
            )}

            {/* CARRINHO */}

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
                  styles.mobileDrawerCart
                }
              >
                <ShoppingCart size={20} />

                <span
                  className={
                    styles.drawerCartBadge
                  }
                >
                  {cartLabel}
                </span>
              </span>

              <span>
                Ver carrinho
              </span>
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}