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

import {
  useEffect,
  useState,
} from "react";

import PromotionalBar from "@/components/PromotionalBar/PromotionalBar";

import styles from "./Header.module.css";

type SessionResponse = {
  authenticated?: boolean;
  firstName?: string;
};

type StoredCartItem = {
  quantity?: unknown;
};

type HeaderProps = {
  initialSearch?: string;
  initialActiveMenu?: string;
};

const CATALOG_MENU_ITEMS = [
  {
    label:
      "Todos",

    href:
      "/",
  },

  {
    label:
      "Novidades",

    href:
      "/?ordem=recentes",
  },

  {
    label:
      "Mais Vendidos",

    href:
      "/?ordem=mais-vendidos",
  },

  {
    label:
      "Artigos Religiosos",

    href:
      "/?categoria=Artigos+Religiosos",
  },

  {
    label:
      "Acessórios Femininos",

    href:
      "/?categoria=Acessórios+Femininos",
  },

  {
    label:
      "Chaveiro",

    href:
      "/?categoria=Chaveiro",
  },

  {
    label:
      "Acessórios & Embalagem",

    href:
      "/?categoria=Acessórios+%26+Embalagem",
  },

  {
    label:
      "Coleções",

    href:
      "/?categoria=Coleções",
  },
] as const;

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

    const parsed:
      unknown =
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
          quantity <=
            0
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

export default function Header({
  initialSearch = "",
  initialActiveMenu =
    "Todos",
}: HeaderProps = {}) {
  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(
      false
    );

  const [
    cartCount,
    setCartCount,
  ] =
    useState(
      0
    );

  const [
    sessionLoaded,
    setSessionLoaded,
  ] =
    useState(
      false
    );

  const [
    authenticated,
    setAuthenticated,
  ] =
    useState(
      false
    );

  const [
    firstName,
    setFirstName,
  ] =
    useState(
      ""
    );

  const [
    activeMenu,
    setActiveMenu,
  ] =
    useState(
      initialActiveMenu
    );

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

  const animationFrame =
    window.requestAnimationFrame(
      updateCartCount
    );

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
    window.cancelAnimationFrame(
      animationFrame
    );

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
              method:
                "GET",

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
      } catch (
        error
      ) {
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
          !controller
            .signal
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
   * VALORES
   * =======================================================
   */

  const accountHref =
    authenticated
      ? "/minha-conta"
      : "/entrar";

  const cartLabel =
    cartCount >
    99
      ? "99+"
      : cartCount;

  return (
    <>
      <header
        className={
          styles.header
        }
      >
        {/* FAIXA PROMOCIONAL */}

        <PromotionalBar />

        {/* DESKTOP */}

        <div
          className={
            styles.desktopHeader
          }
        >
          {/* BUSCA */}

          <div
            className={
              styles.desktopLeft
            }
          >
            <form
              action="/"
              method="GET"
              role="search"
              className={
                styles.searchBox
              }
            >
              <input
                type="text"
                name="busca"
                defaultValue={
                  initialSearch
                }
                maxLength={
                  120
                }
                autoComplete="off"
                placeholder="O que você está procurando?"
                aria-label="Pesquisar produtos"
              />

              <button
                type="submit"
                aria-label="Pesquisar"
                className="flex shrink-0 items-center justify-center border-0 bg-transparent p-0 text-inherit"
              >
                <Search
                  size={21}
                />
              </button>
            </form>
          </div>

          {/* LOGO */}

          <Link
            href="/"
            aria-label="Página inicial"
            className={
              styles.desktopLogo
            }
          >
            <img
              src="/logo3.png"
              alt="Laico"
            />
          </Link>

          {/* AÇÕES */}

          <div
            className={
              styles.desktopActions
            }
          >
            {/* CONTATO */}

            <Link
              href="/contato"
              className={
                styles.contact
              }
            >
              <Phone
                size={27}
                strokeWidth={
                  1.8
                }
              />

              <span
                className={
                  styles.contactText
                }
              >
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
                    size={
                      24
                    }
                    strokeWidth={
                      1.8
                    }
                  />

                  <span>
                    Olá,{" "}
                    {
                      firstName
                    }
                  </span>
                </Link>
              ) : (
                <div
                  className={
                    styles.accountGuestWrapper
                  }
                >
                  <User
                    size={
                      26
                    }
                    strokeWidth={
                      1.8
                    }
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
                      faça seu
                      login
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
                  strokeWidth={
                    1.8
                  }
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
              className={
                styles.cartButton
              }
            >
              <ShoppingCart
                size={27}
              />

              <span
                className={
                  styles.cartBadge
                }
              >
                {
                  cartLabel
                }
              </span>
            </Link>
          </div>
        </div>

        {/* MOBILE */}

        <div
          className={
            styles.mobileHeader
          }
        >
          <div
            className={
              styles.mobileTop
            }
          >
            {/* MENU */}

            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  true
                )
              }
              aria-label="Abrir menu"
              className={
                styles.mobileMenuButton
              }
            >
              <Menu
                size={27}
              />
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
              <ShoppingCart
                size={27}
              />

              <span
                className={
                  styles.cartBadge
                }
              >
                {
                  cartLabel
                }
              </span>
            </Link>
          </div>

          {/* BUSCA MOBILE */}

          <form
            action="/"
            method="GET"
            role="search"
            className={
              styles.mobileSearch
            }
          >
            <input
              type="text"
              name="busca"
              defaultValue={
                initialSearch
              }
              maxLength={
                120
              }
              autoComplete="off"
              placeholder="O que você está procurando?"
              aria-label="Pesquisar produtos"
            />

            <button
              type="submit"
              aria-label="Pesquisar"
              className="flex shrink-0 items-center justify-center border-0 bg-transparent p-0 text-inherit"
            >
              <Search
                size={21}
              />
            </button>
          </form>
        </div>

        {/* NAVEGAÇÃO */}

        <nav
          className={
            styles.navigation
          }
        >
          <div
            className={
              styles.navigationInner
            }
          >
            {CATALOG_MENU_ITEMS.map(
              (
                item
              ) => (
                <Link
                  href={
                    item.href
                  }
                  key={
                    item.label
                  }
                  onClick={() =>
                    setActiveMenu(
                      item.label
                    )
                  }
                  className={`${
                    styles.navigationItem
                  } ${
                    activeMenu ===
                    item.label
                      ? styles.navigationItemActive
                      : ""
                  }`}
                >
                  {
                    item.label
                  }

                  {activeMenu ===
                    item.label && (
                    <span
                      className={
                        styles.activeLine
                      }
                    />
                  )}
                </Link>
              )
            )}
          </div>
        </nav>
      </header>

      {/* MENU MOBILE */}

      <div
        className={`${
          styles.mobileMenuOverlay
        } ${
          menuOpen
            ? styles.mobileMenuOverlayOpen
            : ""
        }`}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          className={
            styles.mobileBackdrop
          }
          onClick={() =>
            setMenuOpen(
              false
            )
          }
        />

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
                setMenuOpen(
                  false
                )
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
                setMenuOpen(
                  false
                )
              }
              aria-label="Fechar menu"
              className={
                styles.closeMenuButton
              }
            >
              <X
                size={28}
              />
            </button>
          </div>

          {/* CATEGORIAS */}

          <div
            className={
              styles.mobileCategories
            }
          >
            {CATALOG_MENU_ITEMS.map(
              (
                item
              ) => (
                <Link
                  href={
                    item.href
                  }
                  key={
                    item.label
                  }
                  onClick={() => {
                    setActiveMenu(
                      item.label
                    );

                    setMenuOpen(
                      false
                    );
                  }}
                  className={`${
                    styles.mobileCategory
                  } ${
                    activeMenu ===
                    item.label
                      ? styles.mobileCategoryActive
                      : ""
                  }`}
                >
                  {
                    item.label
                  }
                </Link>
              )
            )}
          </div>

          {/* AÇÕES */}

          <div
            className={
              styles.mobileMenuActions
            }
          >
            {/* CONTATO */}

            <Link
              href="/contato"
              onClick={() =>
                setMenuOpen(
                  false
                )
              }
              className={
                styles.mobileContact
              }
            >
              <Phone
                size={21}
                strokeWidth={
                  1.8
                }
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
                  href={
                    accountHref
                  }
                  onClick={() =>
                    setMenuOpen(
                      false
                    )
                  }
                  className={
                    styles.mobileMenuAction
                  }
                >
                  <User
                    size={20}
                  />

                  <span>
                    Olá,{" "}
                    {
                      firstName
                    }
                  </span>
                </Link>
              ) : (
                <div
                  className={
                    styles.mobileGuestAccount
                  }
                >
                  <User
                    size={20}
                  />

                  <div>
                    <Link
                      href="/criar-conta"
                      onClick={() =>
                        setMenuOpen(
                          false
                        )
                      }
                    >
                      Cadastre-se
                    </Link>

                    <Link
                      href="/entrar"
                      onClick={() =>
                        setMenuOpen(
                          false
                        )
                      }
                    >
                      faça seu
                      login
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
                <User
                  size={20}
                />

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
                setMenuOpen(
                  false
                )
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
                <ShoppingCart
                  size={20}
                />

                <span
                  className={
                    styles.drawerCartBadge
                  }
                >
                  {
                    cartLabel
                  }
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