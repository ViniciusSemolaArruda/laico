"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Ruler,
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
  useRef,
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

  bodyChestMinimum:
    | number
    | string
    | null;

  bodyChestMaximum:
    | number
    | string
    | null;

  bodyWaistMinimum:
    | number
    | string
    | null;

  bodyWaistMaximum:
    | number
    | string
    | null;

  bodyHipMinimum:
    | number
    | string
    | null;

  bodyHipMaximum:
    | number
    | string
    | null;
};

type GuideMode =
  | "body"
  | "piece";

type MeasurementKey =
  | "bodyChest"
  | "bodyWaist"
  | "bodyHip"
  | "pieceLength"
  | "sleeveLength"
  | "shoulderWidth"
  | "chestCircumference"
  | "waistCircumference"
  | "hipCircumference"
  | "thighCircumference"
  | "inseamLength";

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

function formatMeasurementRange(
  minimum:
    | number
    | string
    | null,
  maximum:
    | number
    | string
    | null
) {
  const minimumNumber =
    Number(minimum);

  const maximumNumber =
    Number(maximum);

  if (
    !Number.isFinite(minimumNumber) ||
    !Number.isFinite(maximumNumber) ||
    minimumNumber <= 0 ||
    maximumNumber <= 0
  ) {
    return "—";
  }

  return `${minimumNumber.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} a ${maximumNumber.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  })} cm`;
}

function formatRecommendedRange({
  minimum,
  maximum,
  pieceMeasurement,
  minimumReduction,
  maximumReduction,
}: {
  minimum: number | string | null;
  maximum: number | string | null;
  pieceMeasurement: number | string | null;
  minimumReduction: number;
  maximumReduction: number;
}) {
  const explicitMinimum = Number(minimum);
  const explicitMaximum = Number(maximum);

  if (
    Number.isFinite(explicitMinimum) &&
    Number.isFinite(explicitMaximum) &&
    explicitMinimum > 0 &&
    explicitMaximum >= explicitMinimum
  ) {
    return formatMeasurementRange(
      explicitMinimum,
      explicitMaximum
    );
  }

  const piece = Number(pieceMeasurement);

  if (!Number.isFinite(piece) || piece <= 0) {
    return "—";
  }

  const estimatedMinimum = Math.max(
    1,
    piece - minimumReduction
  );

  const estimatedMaximum = Math.max(
    estimatedMinimum,
    piece - maximumReduction
  );

  return formatMeasurementRange(
    estimatedMinimum,
    estimatedMaximum
  );
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

  const [guideMode, setGuideMode] =
    useState<GuideMode>("piece");

  const [activeMeasurement, setActiveMeasurement] =
    useState<MeasurementKey>("pieceLength");

  const mobileIllustrationRef =
    useRef<HTMLDivElement>(null);

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

  const guideMeasurements =
    useMemo(() => {
      if (!sizeGuideVariant) {
        return [];
      }

      if (guideMode === "body") {
        return product.productType === "CLOTHING_TOP"
          ? [
              {
                key: "bodyChest" as const,
                label: "Tórax / busto",
                value: formatRecommendedRange({
                  minimum: sizeGuideVariant.bodyChestMinimum,
                  maximum: sizeGuideVariant.bodyChestMaximum,
                  pieceMeasurement: sizeGuideVariant.chestCircumference,
                  minimumReduction: 10,
                  maximumReduction: 4,
                }),
              },
              {
                key: "bodyWaist" as const,
                label: "Cintura",
                value: formatRecommendedRange({
                  minimum: sizeGuideVariant.bodyWaistMinimum,
                  maximum: sizeGuideVariant.bodyWaistMaximum,
                  pieceMeasurement: sizeGuideVariant.chestCircumference,
                  minimumReduction: 18,
                  maximumReduction: 8,
                }),
              },
            ]
          : [
              {
                key: "bodyWaist" as const,
                label: "Cintura",
                value: formatRecommendedRange({
                  minimum: sizeGuideVariant.bodyWaistMinimum,
                  maximum: sizeGuideVariant.bodyWaistMaximum,
                  pieceMeasurement: sizeGuideVariant.waistCircumference,
                  minimumReduction: 8,
                  maximumReduction: 2,
                }),
              },
              {
                key: "bodyHip" as const,
                label: "Quadril",
                value: formatRecommendedRange({
                  minimum: sizeGuideVariant.bodyHipMinimum,
                  maximum: sizeGuideVariant.bodyHipMaximum,
                  pieceMeasurement: sizeGuideVariant.hipCircumference,
                  minimumReduction: 10,
                  maximumReduction: 4,
                }),
              },
            ];
      }

      return product.productType === "CLOTHING_TOP"
        ? [
            {
              key: "pieceLength" as const,
              label: "Comprimento",
              value: formatMeasurement(sizeGuideVariant.pieceLength),
            },
            {
              key: "sleeveLength" as const,
              label: "Comprimento da manga",
              value: formatMeasurement(sizeGuideVariant.sleeveLength),
            },
            {
              key: "shoulderWidth" as const,
              label: "Ombro a ombro",
              value: formatMeasurement(sizeGuideVariant.shoulderWidth),
            },
            {
              key: "chestCircumference" as const,
              label: "Tórax (circunferência)",
              value: formatMeasurement(sizeGuideVariant.chestCircumference),
            },
          ]
        : [
            {
              key: "pieceLength" as const,
              label: "Comprimento total",
              value: formatMeasurement(sizeGuideVariant.pieceLength),
            },
            {
              key: "waistCircumference" as const,
              label: "Cintura",
              value: formatMeasurement(sizeGuideVariant.waistCircumference),
            },
            {
              key: "hipCircumference" as const,
              label: "Quadril",
              value: formatMeasurement(sizeGuideVariant.hipCircumference),
            },
            {
              key: "thighCircumference" as const,
              label: "Coxa",
              value: formatMeasurement(sizeGuideVariant.thighCircumference),
            },
            {
              key: "inseamLength" as const,
              label: "Entreperna",
              value: formatMeasurement(sizeGuideVariant.inseamLength),
            },
          ];
    }, [
      guideMode,
      product.productType,
      sizeGuideVariant,
    ]);

  function activateGuideMeasurement(
    measurement: MeasurementKey
  ) {
    setActiveMeasurement(measurement);

    if (
      typeof window !== "undefined" &&
      window.innerWidth < 1024
    ) {
      window.requestAnimationFrame(() => {
        mobileIllustrationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

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
                setGuideMode("piece");
                setActiveMeasurement("pieceLength");
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
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 p-2 backdrop-blur-[2px] sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSizeGuideOpen(false);
            }
          }}
        >
          <div className="relative max-h-[95vh] w-full max-w-[980px] overflow-y-auto rounded-xl bg-[#fffdf9] shadow-2xl sm:rounded-2xl">
            <button
              type="button"
              onClick={() => setSizeGuideOpen(false)}
              aria-label="Fechar tabela de medidas"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#e8dcc2] bg-white shadow-sm hover:bg-[#faf9f6]"
            >
              <X size={20} />
            </button>

            <div className="grid min-h-[590px] grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)]">
              <aside className="hidden border-r border-[#dedede] bg-white p-7 lg:block">
                <h2 id="size-guide-title" className="text-center text-lg font-medium text-[#20170f]">
                  Tabela de tamanhos
                </h2>

                <div className="mt-4 flex min-h-[290px] items-center justify-center rounded-lg bg-[#f2f2f2] p-3">
                  <MeasurementIllustration
                    productType={product.productType}
                    mode={guideMode}
                    measurement={activeMeasurement}
                  />
                </div>

                <p className="mt-4 min-h-[58px] text-sm leading-5 text-[#20170f]">
                  {getMeasurementHelp(activeMeasurement)}
                </p>

                <p className="mt-5 border-t border-[#eeeeee] pt-4 text-base underline underline-offset-4">
                  Fita métrica
                </p>
              </aside>

              <section className="p-5 pt-14 sm:p-8 sm:pt-14 lg:px-6">
                <h2 className="mb-5 text-center text-xl font-semibold text-[#20170f] lg:hidden">
                  Tabela de tamanhos
                </h2>

                <p className="text-center text-sm text-[#20170f]">
                  Selecione um tamanho e verifique as medidas
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {availableVariants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSizeGuideVariantId(variant.id)}
                      disabled={variant.stock <= 0}
                      className={`flex h-11 min-w-[92px] items-center justify-center rounded-lg border px-4 text-base transition ${
                        sizeGuideVariant.id === variant.id
                          ? "border-[#20170f] bg-white text-[#20170f]"
                          : variant.stock <= 0
                            ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                            : "border-[#dddddd] bg-white text-[#333333] hover:border-[#20170f]"
                      }`}
                    >
                      {variant.size}
                    </button>
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGuideMode("body");
                      setActiveMeasurement(
                        product.productType === "CLOTHING_TOP"
                          ? "bodyChest"
                          : "bodyWaist"
                      );
                    }}
                    className={`rounded-full px-3 py-2.5 text-xs font-bold transition ${
                      guideMode === "body"
                        ? "bg-[#262626] text-white"
                        : "bg-[#e8e8e8] text-neutral-600 hover:bg-[#dddddd]"
                    }`}
                  >
                    Medidas corporais
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGuideMode("piece");
                      setActiveMeasurement("pieceLength");
                    }}
                    className={`rounded-full px-3 py-2.5 text-xs font-bold transition ${
                      guideMode === "piece"
                        ? "bg-[#262626] text-white"
                        : "bg-[#e8e8e8] text-neutral-600 hover:bg-[#dddddd]"
                    }`}
                  >
                    Medidas da peça
                  </button>
                </div>

                <div className="mt-5 divide-y divide-[#dddddd] border-b border-[#dddddd]">
                  {guideMeasurements.map((measurement) => (
                    <MeasurementRow
                      key={measurement.key}
                      label={measurement.label}
                      value={measurement.value}
                      active={activeMeasurement === measurement.key}
                      onActivate={() => activateGuideMeasurement(measurement.key)}
                    />
                  ))}
                </div>

                <div
                  ref={mobileIllustrationRef}
                  className="scroll-mt-4 pt-6 lg:hidden"
                >
                  <div className="rounded-xl border border-[#dedede] bg-[#f2f2f2] p-3">
                    <MeasurementIllustration
                      productType={product.productType}
                      mode={guideMode}
                      measurement={activeMeasurement}
                    />
                  </div>

                  <p className="mt-4 text-sm leading-5 text-[#20170f]">
                    {getMeasurementHelp(activeMeasurement)}
                  </p>
                </div>

                <p className="mt-5 text-xs leading-5 text-neutral-500">
                  No computador, passe o mouse. No celular, toque em uma medida para visualizar como medir.
                </p>
                <button
                  type="button"
                  disabled={sizeGuideVariant.stock <= 0}
                  onClick={() => {
                    selectVariant(sizeGuideVariant);
                    setSizeGuideOpen(false);
                  }}
                  className="mt-6 h-12 w-full rounded-lg bg-[#b98218] font-bold text-white hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:bg-neutral-300"
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
  active,
  onActivate,
}: {
  label: string;
  value: string;
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onActivate}
      onFocus={onActivate}
      onClick={onActivate}
      className={`flex w-full items-center justify-between gap-5 px-5 py-4 text-left text-sm transition ${
        active
          ? "bg-[#f1f1f1]"
          : "hover:bg-[#f7f7f7]"
      }`}
    >
      <span className="text-neutral-600">{label}</span>
      <strong className="shrink-0 text-[#20170f]">{value}</strong>
    </button>
  );
}

function getMeasurementHelp(
  measurement: MeasurementKey
) {
  const messages: Record<MeasurementKey, string> = {
    bodyChest:
      "Contorne o tórax ou busto com a fita métrica, mantendo-a reta e sem apertar.",
    bodyWaist:
      "Contorne a cintura natural com a fita métrica, sem prender a respiração ou apertar.",
    bodyHip:
      "Contorne a parte mais larga do quadril mantendo a fita paralela ao chão.",
    pieceLength:
      "Meça desde a costura superior até a bainha inferior da peça.",
    sleeveLength:
      "Meça desde a costura onde a manga começa até a extremidade da manga.",
    shoulderWidth:
      "Meça de uma costura do ombro à outra, pela parte traseira da peça.",
    chestCircumference:
      "Meça a largura da peça logo abaixo das axilas e multiplique o resultado por dois.",
    waistCircumference:
      "Meça a largura da cintura da peça e multiplique o resultado por dois.",
    hipCircumference:
      "Meça a parte mais larga do quadril da peça e multiplique o resultado por dois.",
    thighCircumference:
      "Meça a largura da coxa logo abaixo do gancho e multiplique por dois.",
    inseamLength:
      "Meça da costura do gancho até a barra, acompanhando a parte interna da perna.",
  };

  return messages[measurement];
}

function MeasurementIllustration({
  productType,
  mode,
  measurement,
}: {
  productType: ProductType | undefined;
  mode: GuideMode;
  measurement: MeasurementKey;
}) {
  void productType;
  void mode;

  const images: Record<
    MeasurementKey,
    {
      src: string;
      alt: string;
    }
  > = {
    bodyChest: {
      src: "/images/size-guide/medida-torax-busto.png",
      alt: "Como medir o tórax ou busto no corpo",
    },
    bodyWaist: {
      src: "/images/size-guide/medida-cintura.png",
      alt: "Como medir a cintura no corpo",
    },
    bodyHip: {
      src: "/images/size-guide/medida-cintura.png",
      alt: "Como medir a região do quadril",
    },
    pieceLength: {
      src: "/images/size-guide/medida-comprimeto.png",
      alt: "Como medir o comprimento da camisa",
    },
    sleeveLength: {
      src: "/images/size-guide/medida-manga.png",
      alt: "Como medir o comprimento da manga",
    },
    shoulderWidth: {
      src: "/images/size-guide/medida-ombro.png",
      alt: "Como medir de ombro a ombro",
    },
    chestCircumference: {
      src: "/images/size-guide/medida-torax.png",
      alt: "Como medir a circunferência do tórax da camisa",
    },
    waistCircumference: {
      src: "/images/size-guide/medida-cintura.png",
      alt: "Como medir a cintura da peça",
    },
    hipCircumference: {
      src: "/images/size-guide/medida-cintura.png",
      alt: "Como medir o quadril da peça",
    },
    thighCircumference: {
      src: "/images/size-guide/medida-cintura.png",
      alt: "Como medir a coxa da peça",
    },
    inseamLength: {
      src: "/images/size-guide/medida-comprimeto.png",
      alt: "Como medir o comprimento interno da perna",
    },
  };

  const image = images[measurement];

  return (
    <div className="flex min-h-[250px] w-full items-center justify-center overflow-hidden rounded-lg bg-[#eeeeee]">
      <img
        src={image.src}
        alt={image.alt}
        className="h-auto max-h-[310px] w-full object-contain"
        draggable={false}
      />
    </div>
  );
}