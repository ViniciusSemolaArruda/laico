"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Ruler,
  Shirt,
  ShoppingCart,
  X,
  Zap,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  useEffect,
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

  const [sizeGuideOpen, setSizeGuideOpen] =
    useState(false);

  const [sizeGuideVariantId, setSizeGuideVariantId] =
    useState<string | null>(null);

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

  const sizeGuideVariant =
    availableVariants.find(
      (variant) =>
        variant.id === sizeGuideVariantId
    ) ??
    selectedVariant ??
    availableVariants[0] ??
    null;

  useEffect(() => {
    if (!sizeGuideOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setSizeGuideOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [sizeGuideOpen]);

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

      {/* INFORMAÇÕES RECOLHIDAS */}

      {clothing && (
        <div className="mb-5 border-y border-[#e8dcc2]">
          {availableVariants.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSizeGuideVariantId(
                  selectedVariant?.id ??
                    availableVariants[0]?.id ??
                    null
                );
                setSizeGuideOpen(true);
              }}
              className="flex w-full items-center justify-between gap-3 py-3.5 text-left text-sm font-bold text-[#20170f]"
            >
              <span className="flex items-center gap-2">
                <Ruler size={18} className="text-[#b98218]" />
                Tabela de medidas
              </span>
              <ChevronRight size={18} className="text-[#b98218]" />
            </button>
          )}

          {product.materialComposition && (
            <details className="group border-t border-[#e8dcc2]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-bold text-[#20170f]">
                Composição do produto
                <ChevronDown
                  size={18}
                  className="text-[#b98218] transition group-open:rotate-180"
                />
              </summary>
              <p className="pb-4 text-sm leading-6 text-neutral-600">
                {product.materialComposition}
              </p>
            </details>
          )}
        </div>
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

      {sizeGuideOpen && sizeGuideVariant && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-guide-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSizeGuideOpen(false);
            }
          }}
        >
          <div className="relative max-h-[92vh] w-full max-w-[900px] overflow-y-auto rounded-2xl bg-[#fffdf9] shadow-2xl">
            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              aria-label="Fechar tabela de medidas"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#e8dcc2] bg-white shadow-sm hover:bg-[#faf9f6]"
            >
              <X size={20} />
            </button>

            <header className="border-b border-[#e8dcc2] px-5 py-5 pr-16 sm:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b98218]">
                Guia de tamanho
              </p>
              <h2 id="size-guide-title" className="mt-1 text-2xl font-extrabold text-[#20170f]">
                Tabela de medidas
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Selecione um tamanho e confira as medidas da peça.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-[#e8dcc2] bg-[#faf9f6] p-5 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="flex min-h-[230px] items-center justify-center rounded-2xl border border-[#e8dcc2] bg-white p-6 text-center">
                  <div>
                    {product.productType === "CLOTHING_TOP" ? (
                      <Shirt size={110} strokeWidth={1} className="mx-auto text-[#b98218]" />
                    ) : (
                      <Ruler size={95} strokeWidth={1} className="mx-auto text-[#b98218]" />
                    )}
                    <strong className="mt-4 block text-sm text-[#20170f]">
                      Como medir a peça
                    </strong>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      Coloque a peça aberta sobre uma superfície plana e meça sem esticar o tecido.
                    </p>
                  </div>
                </div>

                {product.materialComposition && (
                  <div className="mt-5">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#b98218]">
                      Composição
                    </span>
                    <p className="mt-1 text-sm leading-6 text-neutral-600">
                      {product.materialComposition}
                    </p>
                  </div>
                )}
              </aside>

              <section className="p-5 sm:p-8">
                <p className="text-center text-sm font-semibold text-[#20170f]">
                  Selecione um tamanho
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {availableVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSizeGuideVariantId(variant.id)}
                      className={`flex h-11 min-w-14 items-center justify-center rounded-xl border px-4 text-sm font-bold transition ${
                        sizeGuideVariant.id === variant.id
                          ? "border-[#20170f] bg-[#20170f] text-white"
                          : "border-[#e8dcc2] bg-white text-[#20170f] hover:border-[#b98218]"
                      }`}
                    >
                      {variant.size}
                    </button>
                  ))}
                </div>

                <div className="mt-6 rounded-full bg-[#20170f] py-2 text-center text-xs font-bold text-white">
                  Medidas da peça — tamanho {sizeGuideVariant.size}
                </div>

                <div className="mt-5 divide-y divide-[#eee2cc]">
                  <MeasurementRow label="Comprimento da peça" value={formatMeasurement(sizeGuideVariant.pieceLength)} />
                  {product.productType === "CLOTHING_TOP" ? (
                    <>
                      <MeasurementRow label="Comprimento da manga" value={formatMeasurement(sizeGuideVariant.sleeveLength)} />
                      <MeasurementRow label="Ombro a ombro" value={formatMeasurement(sizeGuideVariant.shoulderWidth)} />
                      <MeasurementRow label="Circunferência do tórax" value={formatMeasurement(sizeGuideVariant.chestCircumference)} />
                    </>
                  ) : (
                    <>
                      <MeasurementRow label="Circunferência da cintura" value={formatMeasurement(sizeGuideVariant.waistCircumference)} />
                      <MeasurementRow label="Circunferência do quadril" value={formatMeasurement(sizeGuideVariant.hipCircumference)} />
                      <MeasurementRow label="Circunferência da coxa" value={formatMeasurement(sizeGuideVariant.thighCircumference)} />
                      <MeasurementRow label="Comprimento da entreperna" value={formatMeasurement(sizeGuideVariant.inseamLength)} />
                    </>
                  )}
                </div>

                <p className="mt-5 text-xs leading-5 text-neutral-500">
                  As medidas estão em centímetros e podem apresentar pequena variação de fabricação.
                </p>
                <button
                  type="button"
                  disabled={sizeGuideVariant.stock <= 0}
                  onClick={() => {
                    selectVariant(sizeGuideVariant);
                    setSizeGuideOpen(false);
                  }}
                  className="mt-6 h-12 w-full rounded-xl bg-[#b98218] font-bold text-white hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {sizeGuideVariant.stock > 0
                    ? `Escolher tamanho ${sizeGuideVariant.size}`
                    : `Tamanho ${sizeGuideVariant.size} esgotado`}
                </button>
              </section>
            </div>
          </div>
        </div>
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

function MeasurementRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4 text-sm">
      <span className="text-neutral-600">{label}</span>
      <strong className="shrink-0 text-[#20170f]">{value}</strong>
    </div>
  );
}