"use client";

import {
  Check,
  ShoppingCart,
  Zap,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

type ProductCart = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  stock: number;
};

type StoredCartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

function isStoredCartItem(
  value: unknown
): value is StoredCartItem {
  if (
    typeof value !==
      "object" ||
    value === null
  ) {
    return false;
  }

  const item =
    value as Partial<StoredCartItem>;

  return (
    typeof item.id ===
      "string" &&
    typeof item.slug ===
      "string" &&
    typeof item.name ===
      "string" &&
    typeof item.image ===
      "string" &&
    typeof item.price ===
      "number" &&
    Number.isFinite(
      item.price
    ) &&
    typeof item.quantity ===
      "number" &&
    Number.isInteger(
      item.quantity
    ) &&
    item.quantity >
      0
  );
}

function getStoredCart(): StoredCartItem[] {
  try {
    const storedCart =
      window.localStorage.getItem(
        "laico-cart"
      );

    if (!storedCart) {
      return [];
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
      return [];
    }

    return parsed.filter(
      isStoredCartItem
    );
  } catch {
    return [];
  }
}

function notifyCartUpdated() {
  window.dispatchEvent(
    new CustomEvent(
      "laico-cart-updated"
    )
  );
}

export default function AddToCartButton({
  product,
}: {
  product:
    ProductCart;
}) {
  const router =
    useRouter();

  const [
    added,
    setAdded,
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(
      null
    );

  const unavailable =
    product.stock <=
      0 ||
    !Number.isFinite(
      product.price
    ) ||
    product.price <=
      0;

  function addToCart() {
    if (
      unavailable
    ) {
      setMessage(
        "Este produto não está disponível."
      );

      return;
    }

    const currentCart =
      getStoredCart();

    const existingIndex =
      currentCart.findIndex(
        (
          item
        ) =>
          item.id ===
          product.id
      );

    if (
      existingIndex >=
      0
    ) {
      const existingItem =
        currentCart[
          existingIndex
        ];

      const nextQuantity =
        Math.min(
          existingItem.quantity +
            1,

          product.stock
        );

      currentCart[
        existingIndex
      ] = {
        ...existingItem,

        /*
         * Atualizamos os dados visuais
         * usando os valores mais recentes.
         */
        slug:
          product.slug,

        name:
          product.name,

        image:
          product.image,

        price:
          product.price,

        quantity:
          nextQuantity,
      };

      if (
        nextQuantity ===
        existingItem.quantity
      ) {
        setMessage(
          "A quantidade máxima disponível já está no carrinho."
        );
      } else {
        setMessage(
          "Mais uma unidade foi adicionada ao carrinho."
        );
      }
    } else {
      currentCart.push({
        id:
          product.id,

        slug:
          product.slug,

        name:
          product.name,

        image:
          product.image,

        price:
          product.price,

        quantity:
          1,
      });

      setMessage(
        "Produto adicionado ao carrinho."
      );
    }

    try {
      window.localStorage.setItem(
        "laico-cart",

        JSON.stringify(
          currentCart
        )
      );

      notifyCartUpdated();

      setAdded(
        true
      );
    } catch {
      setMessage(
        "Não foi possível atualizar o carrinho neste navegador."
      );

      setAdded(
        false
      );
    }
  }

  function buyNow() {
    if (
      unavailable
    ) {
      setMessage(
        "Este produto não está disponível."
      );

      return;
    }

    const item:
      StoredCartItem =
      {
        id:
          product.id,

        slug:
          product.slug,

        name:
          product.name,

        image:
          product.image,

        price:
          product.price,

        quantity:
          1,
      };

    try {
      window.localStorage.setItem(
        "laico-checkout",

        JSON.stringify([
          item,
        ])
      );

      router.push(
        "/checkout"
      );
    } catch {
      setMessage(
        "Não foi possível iniciar a compra neste navegador."
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={
          addToCart
        }
        disabled={
          unavailable
        }
        className="flex h-[43px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#b98218] font-bold text-white transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {added ? (
          <Check
            size={17}
          />
        ) : (
          <ShoppingCart
            size={17}
          />
        )}

        {unavailable
          ? "Produto esgotado"
          : added
            ? "Adicionado ao carrinho"
            : "Adicionar ao carrinho"}
      </button>

      <button
        type="button"
        onClick={
          buyNow
        }
        disabled={
          unavailable
        }
        className="mt-3 flex h-[43px] w-full items-center justify-center gap-2 rounded-[4px] border border-[#b98218] font-bold text-[#b98218] transition hover:bg-[#fff8e8] disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
      >
        <Zap
          size={17}
        />

        Comprar agora
      </button>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 text-center text-xs leading-5 ${
            unavailable
              ? "text-red-600"
              : "text-neutral-600"
          }`}
        >
          {
            message
          }
        </p>
      )}

      {/*
       * O preço e o estoque armazenados no navegador
       * servem somente para exibição.
       *
       * O checkout deve sempre consultar novamente
       * preço e estoque no banco antes de criar o pedido.
       */}
    </>
  );
}