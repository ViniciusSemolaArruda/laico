"use client";

import {
  Check,
  ChevronDown,
  Ruler,
  ShoppingCart,
  Zap,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useMemo,
  useState,
} from "react";

type ProductType =
  | "STANDARD"
  | "ACCESSORY"
  | "RELIGIOUS_IMAGE"
  | "CLOTHING_TOP"
  | "CLOTHING_BOTTOM";

type ClothingSize =
  | "P"
  | "M"
  | "G"
  | "GG"
  | "XG";

type ProductVariant = {
  id: string;
  size: ClothingSize;
  sku: string | null;
  stock: number;
  active?: boolean;

  pieceLength:
    | number
    | string
    | null;

  sleeveLength:
    | number
    | string
    | null;

  shoulderWidth:
    | number
    | string
    | null;

  chestCircumference:
    | number
    | string
    | null;

  waistCircumference:
    | number
    | string
    | null;

  hipCircumference:
    | number
    | string
    | null;

  thighCircumference:
    | number
    | string
    | null;

  inseamLength:
    | number
    | string
    | null;
};

type ProductCart = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  stock: number;

  productType?: ProductType;

  materialComposition?:
    | string
    | null;

  variants?:
    ProductVariant[];
};

type StoredCartItem = {
  /*
   * id continua sendo o ID do produto
   * para manter compatibilidade com o
   * carrinho existente.
   */
  id: string;

  /*
   * cartKey diferencia cada tamanho.
   *
   * Exemplo:
   * produto-123:variant-456
   */
  cartKey?: string;

  variantId?:
    string | null;

  size?:
    ClothingSize | null;

  variantSku?:
    string | null;

  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

function isClothingType(
  productType:
    ProductType | undefined
) {
  return (
    productType ===
      "CLOTHING_TOP" ||
    productType ===
      "CLOTHING_BOTTOM"
  );
}

function isClothingSize(
  value: unknown
): value is ClothingSize {
  return (
    value === "P" ||
    value === "M" ||
    value === "G" ||
    value === "GG" ||
    value === "XG"
  );
}

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

  const validVariantId =
    item.variantId ===
      undefined ||
    item.variantId ===
      null ||
    typeof item.variantId ===
      "string";

  const validSize =
    item.size ===
      undefined ||
    item.size ===
      null ||
    isClothingSize(
      item.size
    );

  const validVariantSku =
    item.variantSku ===
      undefined ||
    item.variantSku ===
      null ||
    typeof item.variantSku ===
      "string";

  const validCartKey =
    item.cartKey ===
      undefined ||
    typeof item.cartKey ===
      "string";

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
    item.quantity > 0 &&
    validVariantId &&
    validSize &&
    validVariantSku &&
    validCartKey
  );
}

function getStoredCart():
  StoredCartItem[] {
  try {
    const storedCart =
      window.localStorage.getItem(
        "laico-cart"
      );

    if (!storedCart) {
      return [];
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

function createCartKey(
  productId: string,
  variantId:
    | string
    | null
) {
  return variantId
    ? `${productId}:${variantId}`
    : productId;
}

function getItemCartKey(
  item: StoredCartItem
) {
  return (
    item.cartKey ||
    createCartKey(
      item.id,
      item.variantId ??
        null
    )
  );
}

function formatMeasurement(
  value:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    ) ||
    number <= 0
  ) {
    return "—";
  }

  return `${number.toLocaleString(
    "pt-BR",
    {
      maximumFractionDigits:
        2,
    }
  )} cm`;
}

export default function AddToCartButton({
  product,
}: {
  product: ProductCart;
}) {
  const router =
    useRouter();

  const [added, setAdded] =
    useState(false);

  const [
    selectedVariantId,
    setSelectedVariantId,
  ] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const clothing =
    isClothingType(
      product.productType
    );

  const availableVariants =
    useMemo(
      () =>
        (product.variants ?? [])
          .filter(
            (variant) =>
              variant.active !==
                false
          )
          .sort(
            (
              variantA,
              variantB
            ) => {
              const order: Record<
                ClothingSize,
                number
              > = {
                P: 0,
                M: 1,
                G: 2,
                GG: 3,
                XG: 4,
              };

              return (
                order[
                  variantA.size
                ] -
                order[
                  variantB.size
                ]
              );
            }
          ),
      [product.variants]
    );

  const selectedVariant =
    availableVariants.find(
      (variant) =>
        variant.id ===
        selectedVariantId
    ) ?? null;

  const currentStock =
    clothing
      ? selectedVariant?.stock ??
        0
      : product.stock;

  const missingVariant =
    clothing &&
    !selectedVariant;

  const noVariantsAvailable =
    clothing &&
    availableVariants.every(
      (variant) =>
        variant.stock <= 0
    );

  const unavailable =
    noVariantsAvailable ||
    (
      !missingVariant &&
      currentStock <= 0
    ) ||
    !Number.isFinite(
      product.price
    ) ||
    product.price <= 0;

  function selectVariant(
    variant: ProductVariant
  ) {
    if (
      variant.stock <= 0
    ) {
      setMessage(
        `O tamanho ${variant.size} está esgotado.`
      );

      return;
    }

    setSelectedVariantId(
      variant.id
    );

    setAdded(false);
    setMessage(null);
  }

  function validatePurchase() {
    if (
      clothing &&
      !selectedVariant
    ) {
      setMessage(
        "Selecione um tamanho antes de continuar."
      );

      return false;
    }

    if (unavailable) {
      setMessage(
        "Este produto não está disponível."
      );

      return false;
    }

    return true;
  }

  function createCartItem():
    StoredCartItem {
    const variantId =
      selectedVariant?.id ??
      null;

    return {
      id:
        product.id,

      cartKey:
        createCartKey(
          product.id,
          variantId
        ),

      variantId,

      size:
        selectedVariant?.size ??
        null,

      variantSku:
        selectedVariant?.sku ??
        null,

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
  }

  function addToCart() {
    if (
      !validatePurchase()
    ) {
      return;
    }

    const currentCart =
      getStoredCart();

    const cartItem =
      createCartItem();

    const existingIndex =
      currentCart.findIndex(
        (item) =>
          getItemCartKey(
            item
          ) ===
          cartItem.cartKey
      );

    if (
      existingIndex >= 0
    ) {
      const existingItem =
        currentCart[
          existingIndex
        ];

      const nextQuantity =
        Math.min(
          existingItem.quantity +
            1,

          currentStock
        );

      currentCart[
        existingIndex
      ] = {
        ...existingItem,

        slug:
          product.slug,

        name:
          product.name,

        image:
          product.image,

        price:
          product.price,

        variantId:
          selectedVariant?.id ??
          null,

        size:
          selectedVariant?.size ??
          null,

        variantSku:
          selectedVariant?.sku ??
          null,

        cartKey:
          cartItem.cartKey,

        quantity:
          nextQuantity,
      };

      if (
        nextQuantity ===
        existingItem.quantity
      ) {
        setMessage(
          clothing &&
            selectedVariant
            ? `A quantidade máxima do tamanho ${selectedVariant.size} já está no carrinho.`
            : "A quantidade máxima disponível já está no carrinho."
        );
      } else {
        setMessage(
          clothing &&
            selectedVariant
            ? `Mais uma unidade do tamanho ${selectedVariant.size} foi adicionada.`
            : "Mais uma unidade foi adicionada ao carrinho."
        );
      }
    } else {
      currentCart.push(
        cartItem
      );

      setMessage(
        clothing &&
          selectedVariant
          ? `Tamanho ${selectedVariant.size} adicionado ao carrinho.`
          : "Produto adicionado ao carrinho."
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

      setAdded(true);
    } catch {
      setMessage(
        "Não foi possível atualizar o carrinho neste navegador."
      );

      setAdded(false);
    }
  }

  function buyNow() {
    if (
      !validatePurchase()
    ) {
      return;
    }

    const item =
      createCartItem();

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
      {/* SELEÇÃO DO TAMANHO */}

      {clothing && (
        <div className="mb-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              Tamanho:{" "}
              <strong className="text-[#20170f]">
                {selectedVariant?.size ??
                  "selecione"}
              </strong>
            </p>

            {selectedVariant && (
              <span className="text-xs font-medium text-green-700">
                {
                  selectedVariant.stock
                }{" "}
                unidade(s)
              </span>
            )}
          </div>

          <div
            className="mt-3 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Selecione o tamanho"
          >
            {availableVariants.map(
              (variant) => {
                const selected =
                  selectedVariantId ===
                  variant.id;

                const outOfStock =
                  variant.stock <= 0;

                return (
                  <button
                    key={
                      variant.id
                    }
                    type="button"
                    role="radio"
                    aria-checked={
                      selected
                    }
                    disabled={
                      outOfStock
                    }
                    onClick={() =>
                      selectVariant(
                        variant
                      )
                    }
                    title={
                      outOfStock
                        ? `Tamanho ${variant.size} esgotado`
                        : `Selecionar tamanho ${variant.size}`
                    }
                    className={`relative flex h-12 min-w-12 items-center justify-center rounded-full border px-3 text-sm font-bold transition ${
                      selected
                        ? "border-[#20170f] bg-[#20170f] text-white"
                        : outOfStock
                          ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                          : "border-[#e8dcc2] bg-white text-[#20170f] hover:border-[#b98218]"
                    }`}
                  >
                    {
                      variant.size
                    }
                  </button>
                );
              }
            )}
          </div>

          {noVariantsAvailable && (
            <p className="mt-3 text-xs font-bold text-red-600">
              Todos os tamanhos estão esgotados.
            </p>
          )}

          {availableVariants.length ===
            0 && (
            <p className="mt-3 text-xs font-bold text-red-600">
              Nenhum tamanho está disponível.
            </p>
          )}
        </div>
      )}

      {/* COMPOSIÇÃO */}

      {clothing &&
        product.materialComposition && (
          <div className="mb-5 rounded-xl bg-[#faf9f6] p-3">
            <span className="block text-xs font-bold uppercase tracking-wide text-[#9f6f14]">
              Composição
            </span>

            <p className="mt-1 text-sm text-neutral-700">
              {
                product.materialComposition
              }
            </p>
          </div>
        )}

      {/* TABELA DE MEDIDAS */}

      {clothing &&
        availableVariants.length >
          0 && (
          <details className="group mb-5 overflow-hidden rounded-xl border border-[#e8dcc2] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[#20170f]">
              <span className="flex items-center gap-2">
                <Ruler
                  size={17}
                  className="text-[#b98218]"
                />

                Tabela de medidas
              </span>

              <ChevronDown
                size={17}
                className="text-[#b98218] transition group-open:rotate-180"
              />
            </summary>

            <div className="overflow-x-auto border-t border-[#e8dcc2]">
              {product.productType ===
              "CLOTHING_TOP" ? (
                <table className="w-full min-w-[570px] border-collapse text-left text-xs">
                  <thead className="bg-[#faf9f6] text-[#20170f]">
                    <tr>
                      <TableHeader>
                        Tamanho
                      </TableHeader>

                      <TableHeader>
                        Comprimento
                      </TableHeader>

                      <TableHeader>
                        Manga
                      </TableHeader>

                      <TableHeader>
                        Ombro
                      </TableHeader>

                      <TableHeader>
                        Tórax
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {availableVariants.map(
                      (
                        variant
                      ) => (
                        <tr
                          key={
                            variant.id
                          }
                          className={`border-t border-[#eee2cc] ${
                            selectedVariantId ===
                            variant.id
                              ? "bg-[#fff8e8]"
                              : "bg-white"
                          }`}
                        >
                          <TableCell bold>
                            {
                              variant.size
                            }
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.pieceLength
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.sleeveLength
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.shoulderWidth
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.chestCircumference
                            )}
                          </TableCell>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                  <thead className="bg-[#faf9f6] text-[#20170f]">
                    <tr>
                      <TableHeader>
                        Tamanho
                      </TableHeader>

                      <TableHeader>
                        Comprimento
                      </TableHeader>

                      <TableHeader>
                        Cintura
                      </TableHeader>

                      <TableHeader>
                        Quadril
                      </TableHeader>

                      <TableHeader>
                        Coxa
                      </TableHeader>

                      <TableHeader>
                        Entreperna
                      </TableHeader>
                    </tr>
                  </thead>

                  <tbody>
                    {availableVariants.map(
                      (
                        variant
                      ) => (
                        <tr
                          key={
                            variant.id
                          }
                          className={`border-t border-[#eee2cc] ${
                            selectedVariantId ===
                            variant.id
                              ? "bg-[#fff8e8]"
                              : "bg-white"
                          }`}
                        >
                          <TableCell bold>
                            {
                              variant.size
                            }
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.pieceLength
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.waistCircumference
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.hipCircumference
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.thighCircumference
                            )}
                          </TableCell>

                          <TableCell>
                            {formatMeasurement(
                              variant.inseamLength
                            )}
                          </TableCell>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <p className="border-t border-[#e8dcc2] bg-[#faf9f6] px-4 py-3 text-[11px] leading-5 text-neutral-500">
              Todas as medidas estão em centímetros. Pode haver pequena variação dependendo do processo de fabricação.
            </p>
          </details>
        )}

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
          <Check size={17} />
        ) : (
          <ShoppingCart
            size={17}
          />
        )}

        {noVariantsAvailable ||
        (
          !missingVariant &&
          currentStock <= 0
        )
          ? "Produto esgotado"
          : missingVariant
            ? "Selecione um tamanho"
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
        <Zap size={17} />

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
          {message}
        </p>
      )}

      {clothing &&
        !selectedVariant &&
        !noVariantsAvailable && (
          <p className="mt-3 text-center text-xs font-medium text-[#9f6f14]">
            Escolha um tamanho antes de adicionar ao carrinho.
          </p>
        )}

      {selectedVariant && (
        <p className="mt-3 text-center text-xs text-neutral-500">
          Tamanho selecionado:{" "}
          <strong className="text-[#20170f]">
            {
              selectedVariant.size
            }
          </strong>
        </p>
      )}

      {/*
       * O navegador guarda os dados somente
       * para montar visualmente o carrinho.
       *
       * Preço, estoque, produto e variação
       * precisam ser validados novamente no
       * servidor durante o checkout.
       */}
    </>
  );
}

function TableHeader({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-3 py-3 font-bold">
      {children}
    </th>
  );
}

function TableCell({
  children,
  bold = false,
}: {
  children:
    React.ReactNode;

  bold?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-3 ${
        bold
          ? "font-extrabold text-[#20170f]"
          : "text-neutral-600"
      }`}
    >
      {children}
    </td>
  );
}