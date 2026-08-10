import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import type {
  ReactNode,
} from "react";

import {
  CheckCircle,
  CreditCard,
  Home,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import AddToCartButton from "@/components/AddToCartButton";
import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";
import ProductGallery from "@/components/products/ProductGallery";
import ProductShippingCalculator from "@/components/products/ProductShippingCalculator";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeSlug(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .slice(
      0,
      180
    );
}

function isValidSlug(
  slug: string
) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    slug
  );
}

function formatPrice(
  value: unknown
) {
  return Number(
    value
  ).toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    }
  );
}

function formatMeasurement(
  value: unknown,
  suffix: string
) {
  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    ) ||
    number <=
      0
  ) {
    return null;
  }

  return `${number.toLocaleString(
    "pt-BR",
    {
      maximumFractionDigits:
        3,
    }
  )} ${suffix}`;
}

/*
 * =========================================================
 * SEO
 * =========================================================
 */

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const {
    slug: rawSlug,
  } =
    await params;

  const slug =
    normalizeSlug(
      rawSlug
    );

  if (
    !slug ||
    !isValidSlug(
      slug
    )
  ) {
    return {
      title:
        "Produto não encontrado",
    };
  }

  const product =
    await prisma.product.findFirst({
      where: {
        slug,
        active:
          true,
        archivedAt:
          null,
      },

      select: {
        name: true,
        shortDescription:
          true,
        seoTitle: true,
        seoDescription:
          true,
        image: true,

        images: {
          where: {
            isPrimary:
              true,
          },

          orderBy: {
            position:
              "asc",
          },

          take:
            1,

          select: {
            url:
              true,
          },
        },
      },
    });

  if (!product) {
    return {
      title:
        "Produto não encontrado",

      robots: {
        index:
          false,
        follow:
          false,
      },
    };
  }

  const title =
    product.seoTitle ||
    product.name;

  const description =
    product.seoDescription ||
    product.shortDescription ||
    `Conheça ${product.name} na Laico.`;

  const image =
    product.images[
      0
    ]?.url ||
    product.image;

  return {
    title,
    description,

    alternates: {
      canonical:
        `/produtos/${slug}`,
    },

    openGraph: {
      title,
      description,
      type:
        "website",

      images:
        image
          ? [
              {
                url:
                  image,
                alt:
                  product.name,
              },
            ]
          : undefined,
    },
  };
}

/*
 * =========================================================
 * PÁGINA
 * =========================================================
 */

export default async function ProductPage({
  params,
}: Props) {
  const {
    slug: rawSlug,
  } =
    await params;

  const slug =
    normalizeSlug(
      rawSlug
    );

  if (
    !slug ||
    !isValidSlug(
      slug
    )
  ) {
    notFound();
  }

  const product =
    await prisma.product.findFirst({
      where: {
        slug,
        active:
          true,
        archivedAt:
          null,
      },

      select: {
        id: true,
        slug: true,
        sku: true,
        name: true,

        shortDescription:
          true,
        description:
          true,

        price: true,
        salePrice:
          true,

        image: true,

        religion:
          true,
        religions:
          true,
        category:
          true,

        stock: true,
        weight: true,
        height: true,
        width: true,
        length: true,

        images: {
          orderBy: [
            {
              isPrimary:
                "desc",
            },
            {
              position:
                "asc",
            },
          ],

          select: {
            id: true,
            url: true,
            alt: true,
          },
        },
      },
    });

  if (!product) {
    notFound();
  }

  /*
   * GALERIA
   */

  const galleryImages =
    product.images.length >
    0
      ? product.images
      : product.image
        ? [
            {
              id:
                "legacy-image",
              url:
                product.image,
              alt:
                product.name,
            },
          ]
        : [];

  const primaryImage =
    galleryImages[
      0
    ]?.url ||
    product.image;

  /*
   * PREÇO
   */

  const normalPrice =
    Number(
      product.price
    );

  const possibleSalePrice =
    product.salePrice ===
    null
      ? null
      : Number(
          product.salePrice
        );

  const promotionalPrice =
    possibleSalePrice !==
      null &&
    Number.isFinite(
      possibleSalePrice
    ) &&
    possibleSalePrice >
      0 &&
    possibleSalePrice <
      normalPrice
      ? possibleSalePrice
      : null;

  const hasPromotion =
    promotionalPrice !==
    null;

  const currentPrice =
    promotionalPrice ??
    normalPrice;

  const discount =
    promotionalPrice !==
    null
      ? Math.round(
          ((normalPrice -
            promotionalPrice) /
            normalPrice) *
            100
        )
      : 0;

  /*
   * RELIGIÕES
   */

  const productReligions =
    product.religions.length >
    0
      ? product.religions
      : product.religion
        ? [
            product.religion,
          ]
        : [];

  /*
   * RELACIONADOS
   */

  const related =
    await prisma.product.findMany({
      where: {
        active:
          true,
        archivedAt:
          null,
        category:
          product.category,

        id: {
          not:
            product.id,
        },
      },

      take:
        4,

      orderBy: [
        {
          featured:
            "desc",
        },
        {
          createdAt:
            "desc",
        },
      ],

      select: {
        id: true,
        slug: true,
        name: true,
        image: true,
        price: true,
        salePrice:
          true,
        stock: true,

        images: {
          where: {
            isPrimary:
              true,
          },

          orderBy: {
            position:
              "asc",
          },

          take:
            1,

          select: {
            url:
              true,
          },
        },
      },
    });

  /*
   * MEDIDAS
   */

  const measurements =
    [
      {
        label:
          "Peso",

        value:
          formatMeasurement(
            product.weight,
            "kg"
          ),
      },
      {
        label:
          "Altura",

        value:
          formatMeasurement(
            product.height,
            "cm"
          ),
      },
      {
        label:
          "Largura",

        value:
          formatMeasurement(
            product.width,
            "cm"
          ),
      },
      {
        label:
          "Comprimento",

        value:
          formatMeasurement(
            product.length,
            "cm"
          ),
      },
    ].filter(
      (
        item
      ): item is {
        label: string;
        value: string;
      } =>
        Boolean(
          item.value
        )
    );

  return (
    <main className="min-h-screen bg-[#fffdf9]">
      <Header
        initialActiveMenu={
          product.category
        }
      />

      <section className="mx-auto max-w-[1370px] px-4 py-6 sm:px-6 sm:py-8">
        {/* BREADCRUMB */}

        <nav className="mb-6 flex min-w-0 flex-wrap items-center gap-2 text-xs text-neutral-600 sm:mb-8 sm:text-[13px]">
          <Home
            size={15}
            aria-hidden="true"
          />

          <Link
            href="/"
            className="hover:text-[#b98218]"
          >
            Início
          </Link>

          <span>
            ›
          </span>

          <Link
            href={`/?categoria=${encodeURIComponent(
              product.category
            )}`}
            className="hover:text-[#b98218]"
          >
            {
              product.category
            }
          </Link>

          <span>
            ›
          </span>

          <span className="truncate font-semibold text-[#20170f]">
            {
              product.name
            }
          </span>
        </nav>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-2 xl:grid-cols-[minmax(0,560px)_minmax(0,1fr)_320px]">
          {/* GALERIA */}

          <ProductGallery
            productName={
              product.name
            }
            images={
              galleryImages
            }
          />

          {/* INFORMAÇÕES */}

          <section className="min-w-0">
            <div className="flex flex-wrap gap-2">
              {productReligions.map(
                (religion) => (
                  <Link
                    key={
                      religion
                    }
                    href={`/?religiao=${encodeURIComponent(
                      religion
                    )}`}
                    className="inline-flex rounded-full bg-[#fff8e8] px-3 py-1 text-xs font-bold text-[#b98218]"
                  >
                    {
                      religion
                    }
                  </Link>
                )
              )}
            </div>

            <h1 className="mt-4 text-[28px] font-extrabold leading-tight text-[#20170f] sm:text-[34px]">
              {
                product.name
              }
            </h1>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500 sm:text-sm">
              <span>
                Categoria:{" "}
                {
                  product.category
                }
              </span>

              <span>
                Cód:{" "}
                {product.sku ||
                  "—"}
              </span>
            </div>

            {product.shortDescription && (
              <p className="mt-5 text-[15px] leading-7 text-neutral-600">
                {
                  product.shortDescription
                }
              </p>
            )}

            <div className="mt-6">
              {hasPromotion && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500 line-through">
                    {formatPrice(
                      normalPrice
                    )}
                  </span>

                  <span className="rounded-full bg-[#e6007e] px-2.5 py-1 text-xs font-bold text-white">
                    -
                    {
                      discount
                    }
                    %
                  </span>
                </div>
              )}

              <p className="mt-1 text-[32px] font-extrabold text-[#b98218] sm:text-[36px]">
                {formatPrice(
                  currentPrice
                )}
              </p>

              <p className="text-sm text-neutral-600">
                ou 6x de{" "}
                {formatPrice(
                  currentPrice /
                    6
                )}
              </p>
            </div>

            <div className="mt-6 whitespace-pre-line text-[15px] leading-7 text-neutral-700">
              {
                product.description
              }
            </div>

            {measurements.length >
              0 && (
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {measurements.map(
                  (
                    measurement
                  ) => (
                    <div
                      key={
                        measurement.label
                      }
                      className="rounded-xl border border-[#e8dcc2] bg-white p-3"
                    >
                      <strong className="block text-xs text-[#20170f]">
                        {
                          measurement.label
                        }
                      </strong>

                      <span className="mt-1 block text-neutral-600">
                        {
                          measurement.value
                        }
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            {product.stock >
            0 ? (
              <p className="mt-5 flex items-center gap-2 text-sm font-bold text-green-700">
                <CheckCircle
                  size={17}
                  aria-hidden="true"
                />

                Em estoque:{" "}
                {
                  product.stock
                }{" "}
                unidade(s)
              </p>
            ) : (
              <p className="mt-5 text-sm font-bold text-red-600">
                Produto
                indisponível no
                momento
              </p>
            )}
          </section>

          {/* COMPRA E FRETE */}

          <aside className="h-fit overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm lg:col-span-2 xl:col-span-1">
            <div className="border-b border-[#eee2cc] p-5">
              <AddToCartButton
                product={{
                  id:
                    product.id,
                  slug:
                    product.slug,
                  name:
                    product.name,
                  image:
                    primaryImage,
                  price:
                    currentPrice,
                  stock:
                    product.stock,
                }}
              />
            </div>

            {product.stock >
              0 && (
              <div className="border-b border-[#eee2cc] p-5">
                <ProductShippingCalculator
                  productId={
                    product.id
                  }
                />
              </div>
            )}

            <div className="space-y-5 p-5">
              <Benefit
                icon={
                  <Truck />
                }
                title="Entrega para todo o Brasil"
                text="Valor calculado de acordo com o CEP."
              />

              <Benefit
                icon={
                  <CreditCard />
                }
                title="Pagamento seguro"
                text="Formas disponíveis no checkout."
              />

              <Benefit
                icon={
                  <RotateCcw />
                }
                title="Direito de arrependimento"
                text="Consulte nossa política de devolução."
              />

              <Benefit
                icon={
                  <ShieldCheck />
                }
                title="Compra protegida"
                text="Ambiente seguro e pedido acompanhado."
              />
            </div>
          </aside>
        </div>

        {/* RELACIONADOS */}

        <section className="mt-14">
          <h2 className="text-2xl font-extrabold text-[#20170f] sm:text-[26px]">
            Produtos
            relacionados
          </h2>

          <p className="mt-1 text-sm text-neutral-500">
            Outros produtos
            da mesma
            categoria
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
            {related.map(
              (item) => {
                const relatedNormalPrice =
                  Number(
                    item.price
                  );

                const relatedSalePrice =
                  item.salePrice ===
                  null
                    ? null
                    : Number(
                        item.salePrice
                      );

                const relatedCurrentPrice =
                  relatedSalePrice !==
                    null &&
                  relatedSalePrice >
                    0 &&
                  relatedSalePrice <
                    relatedNormalPrice
                    ? relatedSalePrice
                    : relatedNormalPrice;

                const relatedImage =
                  item.images[
                    0
                  ]?.url ||
                  item.image;

                return (
                  <Link
                    href={`/produtos/${item.slug}`}
                    key={
                      item.id
                    }
                    className="rounded-xl border border-[#e8dcc2] bg-white p-3 transition hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl sm:p-4"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-[#faf9f6] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}

                      <img
                        src={
                          relatedImage
                        }
                        alt={
                          item.name
                        }
                        loading="lazy"
                        className="max-h-full max-w-full object-contain mix-blend-multiply"
                      />
                    </div>

                    <h3 className="mt-3 line-clamp-2 text-xs font-bold text-[#20170f] sm:mt-4 sm:text-sm">
                      {
                        item.name
                      }
                    </h3>

                    <p className="mt-2 text-base font-extrabold text-[#b98218] sm:text-lg">
                      {formatPrice(
                        relatedCurrentPrice
                      )}
                    </p>

                    <p
                      className={`mt-2 text-[11px] font-bold ${
                        item.stock >
                        0
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {item.stock >
                      0
                        ? "Disponível"
                        : "Esgotado"}
                    </p>
                  </Link>
                );
              }
            )}

            {related.length ===
              0 && (
              <p className="col-span-full rounded-2xl border border-[#e8dcc2] bg-white p-6 text-neutral-500">
                Nenhum produto
                relacionado
                encontrado.
              </p>
            )}
          </div>
        </section>
      </section>

      <Footer />

      <Link
        href="/contato"
        aria-label="Fale conosco"
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl sm:bottom-8 sm:right-8 sm:h-[62px] sm:w-[62px]"
      >
        <MessageCircle
          size={30}
          aria-hidden="true"
        />
      </Link>
    </main>
  );
}

function Benefit({
  icon,
  title,
  text,
}: {
  icon:
    ReactNode;

  title:
    string;

  text:
    string;
}) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 text-[#b98218]">
        {
          icon
        }
      </span>

      <div>
        <p className="text-[13px] font-bold text-[#20170f]">
          {
            title
          }
        </p>

        <p className="mt-0.5 text-xs leading-5 text-neutral-500">
          {
            text
          }
        </p>
      </div>
    </div>
  );
}