import type { Prisma } from "@prisma/client";

import {
  ChevronLeft,
  ChevronRight,
  Home,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";

import Link from "next/link";
import type { ReactNode } from "react";

import ProductCatalogFilters from "@/components/catalog/ProductCatalogFilters";
import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PRODUCTS_PER_PAGE = 20;
const MAXIMUM_FILTER_ITEMS = 20;

const RELIGIONS = [
  "Católicos e Protestantes",
  "Islamismo",
  "Judaísmo",
  "Hinduísmo",
  "Budismo",
  "Espiritismo",
  "Matriz Africana",
  "Povos Originários",
  "Quilombolas",
  "Ciganos",
  "Ortodoxos",
  "Anglicanismo",
] as const;

const VALID_ORDERS = [
  "relevancia",
  "recentes",
  "mais-vendidos",
  "menor-preco",
  "maior-preco",
  "nome",
] as const;

type CatalogOrder = (typeof VALID_ORDERS)[number];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PageProps = {
  searchParams: SearchParams;
};

function normalizeText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function normalizeArray(
  value: string | string[] | undefined,
  maximumItemLength: number,
) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      values
        .slice(0, MAXIMUM_FILTER_ITEMS)
        .map((item) => normalizeText(item, maximumItemLength))
        .filter(Boolean),
    ),
  );
}

function normalizePrice(value: unknown) {
  const normalized = normalizeText(value, 20).replace(",", ".");

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0 || number > 10_000_000) {
    return null;
  }

  return Math.round(number * 100) / 100;
}

function normalizePage(value: unknown) {
  const page = Number(normalizeText(value, 10));

  if (!Number.isInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, 10_000);
}

function normalizeOrder(value: unknown): CatalogOrder {
  const normalized = normalizeText(value, 30);

  return VALID_ORDERS.includes(normalized as CatalogOrder)
    ? (normalized as CatalogOrder)
    : "relevancia";
}

function formatPrice(value: unknown) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getOrderBy(
  order: CatalogOrder,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (order) {
    case "recentes":
      return [{ createdAt: "desc" }];

    case "mais-vendidos":
      return [{ orderItems: { _count: "desc" } }, { createdAt: "desc" }];

    case "menor-preco":
      return [{ price: "asc" }, { createdAt: "desc" }];

    case "maior-preco":
      return [{ price: "desc" }, { createdAt: "desc" }];

    case "nome":
      return [{ name: "asc" }];

    case "relevancia":
    default:
      return [{ featured: "desc" }, { createdAt: "desc" }];
  }
}

function getActiveMenu({
  search,
  categories,
  order,
}: {
  search: string;
  categories: string[];
  order: CatalogOrder;
}) {
  if (categories.length === 1) {
    return categories[0];
  }

  if (order === "recentes") {
    return "Novidades";
  }

  if (order === "mais-vendidos") {
    return "Mais Vendidos";
  }

  if (search) {
    return "";
  }

  return "Todos";
}

function createCatalogHref({
  page,
  search,
  religions,
  categories,
  minimumPrice,
  maximumPrice,
  order,
}: {
  page: number;
  search: string;
  religions: string[];
  categories: string[];
  minimumPrice: number | null;
  maximumPrice: number | null;
  order: CatalogOrder;
}) {
  const params = new URLSearchParams();

  if (search) params.set("busca", search);
  for (const religion of religions) params.append("religiao", religion);
  for (const category of categories) params.append("categoria", category);
  if (minimumPrice !== null) params.set("precoMin", String(minimumPrice));
  if (maximumPrice !== null) params.set("precoMax", String(maximumPrice));
  if (order !== "relevancia") params.set("ordem", order);
  if (page > 1) params.set("pagina", String(page));

  const query = params.toString();
  return query ? `/catalogo?${query}` : "/catalogo";
}

function ProductCard({
  product,
}: {
  product: {
    slug: string;
    name: string;
    sku: string | null;
    image: string;
    price: unknown;
    salePrice: unknown;
    stock: number;
    featured: boolean;
    images: Array<{ url: string }>;
  };
}) {
  const normalPrice = Number(product.price);
  const salePrice =
    product.salePrice === null ? null : Number(product.salePrice);
  const hasPromotion =
    salePrice !== null &&
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < normalPrice;

  const currentPrice = hasPromotion ? salePrice : normalPrice;
  const discount = hasPromotion
    ? Math.round(((normalPrice - salePrice) / normalPrice) * 100)
    : 0;

  const image = product.images[0]?.url || product.image;

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="relative block min-w-0 overflow-hidden rounded-lg border border-[#f0e3c2] bg-white p-2.5 shadow-[0_2px_10px_rgba(207,167,74,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(207,167,74,0.18)] sm:min-h-[390px] sm:p-4"
    >
      {product.featured && (
        <span className="absolute left-2 top-2 z-10 rounded-sm bg-[#168a2f] px-1.5 py-1 text-[8px] font-bold text-white sm:left-5 sm:top-5 sm:px-2 sm:text-[11px]">
          DESTAQUE
        </span>
      )}

      {discount > 0 && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-[#e6007e] px-1.5 py-1 text-[8px] font-bold text-white sm:right-5 sm:top-5 sm:px-3 sm:text-xs">
          -{discount}%
        </span>
      )}

      <div className="mt-2 flex h-[135px] w-full items-center justify-center sm:h-[210px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          className="max-h-[120px] max-w-full object-contain mix-blend-multiply sm:max-h-[190px] sm:max-w-[190px]"
        />
      </div>

      <h2 className="mt-3 min-h-[52px] text-[13px] font-medium leading-[17px] text-[#20170f] sm:min-h-[44px] sm:text-[17px] sm:leading-[21px]">
        {product.name}
      </h2>

      <p className="mt-2 text-[10px] text-[#6f5a28] sm:text-[13px]">
        Cód: {product.sku || "—"}
      </p>

      {hasPromotion && (
        <p className="mt-2 text-[11px] text-neutral-500 line-through sm:text-[13px]">
          {formatPrice(normalPrice)}
        </p>
      )}

      <p className="mt-1 leading-tight text-[#c18a1a]">
        <strong className="text-[17px] sm:text-[22px]">
          {formatPrice(currentPrice)}
        </strong>
      </p>

      {currentPrice > 0 && (
        <p className="mt-1 text-[10px] leading-[14px] text-neutral-500 sm:text-[13px]">
          ou 6x de {formatPrice(currentPrice / 6)}
        </p>
      )}

      <p
        className={`mt-3 text-[11px] font-bold sm:text-[13px] ${
          product.stock > 0 ? "text-green-700" : "text-red-600"
        }`}
      >
        {product.stock > 0 ? "Produto disponível" : "Produto esgotado"}
      </p>
    </Link>
  );
}

function InfoCard({
  icon,
  title,
  text,
  href,
  linkLabel,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex min-h-[118px] items-center gap-5 overflow-hidden rounded-lg border border-[#f0e3c2] bg-[#fffdf7] px-6 py-5 shadow-[0_2px_10px_rgba(207,167,74,0.08)]">
      <div className="flex h-[68px] min-w-[68px] items-center justify-center rounded-full bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] text-white">
        {icon}
      </div>

      <div className="flex-1">
        <h3 className="font-serif text-lg font-bold leading-[22px] text-[#20170f]">
          {title}
        </h3>
        <p className="mt-2 text-[13px] leading-[18px] text-neutral-600">
          {text}
        </p>
        <Link
          href={href}
          aria-label={`${linkLabel}: ${title}`}
          className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[#c18a1a] transition hover:text-[#9f6f14] hover:underline"
        >
          {linkLabel}
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  const search = normalizeText(params.busca, 120);
  const selectedReligions = normalizeArray(params.religiao, 80).filter(
    (religion) => RELIGIONS.includes(religion as (typeof RELIGIONS)[number]),
  );
  const requestedCategories = normalizeArray(params.categoria, 100);
  const minimumPrice = normalizePrice(params.precoMin);
  const maximumPrice = normalizePrice(params.precoMax);
  const order = normalizeOrder(params.ordem);
  const requestedPage = normalizePage(params.pagina);

  const categoryRows = await prisma.product.findMany({
    where: {
      active: true,
      archivedAt: null,
      category: { not: "" },
    },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  const categories = categoryRows.map((row) => row.category).filter(Boolean);
  const selectedCategories = requestedCategories.filter((category) =>
    categories.includes(category),
  );

  const where: Prisma.ProductWhereInput = {
    active: true,
    archivedAt: null,
  };

  const andFilters: Prisma.ProductWhereInput[] = [];

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
      { shortDescription: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (selectedCategories.length > 0) {
    where.category = { in: selectedCategories };
  }

  if (selectedReligions.length > 0) {
    andFilters.push({
      OR: [
        { religions: { hasSome: selectedReligions } },
        { religion: { in: selectedReligions } },
      ],
    });
  }

  if (minimumPrice !== null || maximumPrice !== null) {
    const priceFilter = {
      ...(minimumPrice !== null ? { gte: minimumPrice } : {}),
      ...(maximumPrice !== null ? { lte: maximumPrice } : {}),
    };

    andFilters.push({
      OR: [
        { salePrice: { not: null, ...priceFilter } },
        { salePrice: null, price: priceFilter },
      ],
    });
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const totalProducts = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);

  const products = await prisma.product.findMany({
    where,
    orderBy: getOrderBy(order),
    skip: (page - 1) * PRODUCTS_PER_PAGE,
    take: PRODUCTS_PER_PAGE,
    select: {
      id: true,
      slug: true,
      name: true,
      sku: true,
      image: true,
      price: true,
      salePrice: true,
      stock: true,
      featured: true,
      images: {
        where: { isPrimary: true },
        orderBy: { position: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const activeMenu = getActiveMenu({
    search,
    categories: selectedCategories,
    order,
  });

  const title = search
    ? `Resultados para “${search}”`
    : selectedCategories.length === 1
      ? selectedCategories[0]
      : "Todos os produtos";

  const paginationPages = Array.from(
    new Set(
      [1, page - 1, page, page + 1, totalPages].filter(
        (item) => item >= 1 && item <= totalPages,
      ),
    ),
  ).sort((a, b) => a - b);

  return (
    <main className="min-h-screen bg-white">
      <Header initialSearch={search} initialActiveMenu={activeMenu} />
      <section className="mx-auto max-w-[1370px] px-3 pb-8 pt-5 sm:px-6 sm:pt-6">
        <div className="mb-6 flex items-center gap-2 text-xs text-neutral-600 sm:mb-8 sm:text-sm">
          <Home size={16} />
          <span>›</span>
          <span>{title}</span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_315px] lg:gap-8">
          <div className="lg:order-2">
            <ProductCatalogFilters
              religions={RELIGIONS}
              categories={categories}
              selectedReligions={selectedReligions}
              selectedCategories={selectedCategories}
              minimumPrice={minimumPrice === null ? "" : String(minimumPrice)}
              maximumPrice={maximumPrice === null ? "" : String(maximumPrice)}
              search={search}
              order={order}
            />
          </div>

          <div className="min-w-0 lg:order-1">
            <div className="mb-7 text-center sm:mb-9">
              <h1 className="font-serif text-[27px] text-[#20170f] sm:text-[33px]">
                {title}
              </h1>
              <div className="mx-auto mt-2 h-0.5 w-[110px] bg-gradient-to-r from-[#f3de9b] to-[#cfa74a] sm:w-[130px]" />
              <p className="mt-4 text-[13px] text-neutral-500 sm:text-base">
                {totalProducts}{" "}
                {totalProducts === 1
                  ? "produto encontrado"
                  : "produtos encontrados"}
              </p>
            </div>

            <form
              action="/catalogo"
              method="GET"
              className="mb-5 flex flex-wrap items-end gap-2"
            >
              {search && <input type="hidden" name="busca" value={search} />}
              {selectedReligions.map((religion) => (
                <input
                  key={religion}
                  type="hidden"
                  name="religiao"
                  value={religion}
                />
              ))}
              {selectedCategories.map((category) => (
                <input
                  key={category}
                  type="hidden"
                  name="categoria"
                  value={category}
                />
              ))}
              {minimumPrice !== null && (
                <input type="hidden" name="precoMin" value={minimumPrice} />
              )}
              {maximumPrice !== null && (
                <input type="hidden" name="precoMax" value={maximumPrice} />
              )}

              <label>
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-neutral-500">
                  Ordenar por
                </span>
                <select
                  name="ordem"
                  defaultValue={order}
                  className="h-10 rounded-lg border border-[#f0e3c2] bg-white px-3 text-xs text-[#6f5a28] outline-none sm:text-sm"
                >
                  <option value="relevancia">Relevância</option>
                  <option value="recentes">Mais recentes</option>
                  <option value="mais-vendidos">Mais vendidos</option>
                  <option value="menor-preco">Menor preço</option>
                  <option value="maior-preco">Maior preço</option>
                  <option value="nome">Nome: A–Z</option>
                </select>
              </label>

              <button
                type="submit"
                className="h-10 rounded-lg bg-[#b98218] px-4 text-xs font-bold text-white transition hover:bg-[#9f6f14]"
              >
                Ordenar
              </button>
            </form>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#eee2cc] bg-[#faf9f6] px-5 py-16 text-center">
                <PackageSearch size={42} className="mx-auto text-[#cfa74a]" />
                <h2 className="mt-4 text-xl font-bold text-[#20170f]">
                  Nenhum produto encontrado
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
                  Tente remover alguns filtros ou pesquisar por outro termo.
                </p>
                <Link
                  href="/catalogo"
                  className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#b98218] px-5 text-sm font-bold text-white"
                >
                  Ver todos os produtos
                </Link>
              </div>
            )}

            {totalPages > 1 && (
              <nav
                aria-label="Paginação do catálogo"
                className="mt-8 flex flex-wrap justify-center gap-2"
              >
                {page > 1 && (
                  <Link
                    href={createCatalogHref({
                      page: page - 1,
                      search,
                      religions: selectedReligions,
                      categories: selectedCategories,
                      minimumPrice,
                      maximumPrice,
                      order,
                    })}
                    aria-label="Página anterior"
                    className="flex h-9 w-9 items-center justify-center rounded border border-[#f0e3c2] bg-white text-[#6f5a28]"
                  >
                    <ChevronLeft size={16} />
                  </Link>
                )}

                {paginationPages.map((paginationPage, index) => (
                  <span key={paginationPage} className="contents">
                    {index > 0 &&
                      paginationPage - paginationPages[index - 1] > 1 && (
                        <span className="flex h-9 w-7 items-center justify-center text-sm text-neutral-400">
                          …
                        </span>
                      )}
                    <Link
                      href={createCatalogHref({
                        page: paginationPage,
                        search,
                        religions: selectedReligions,
                        categories: selectedCategories,
                        minimumPrice,
                        maximumPrice,
                        order,
                      })}
                      aria-current={
                        paginationPage === page ? "page" : undefined
                      }
                      className={`flex h-9 w-9 items-center justify-center rounded border text-sm ${
                        paginationPage === page
                          ? "border-[#cfa74a] bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] font-bold text-white"
                          : "border-[#f0e3c2] bg-white text-[#6f5a28]"
                      }`}
                    >
                      {paginationPage}
                    </Link>
                  </span>
                ))}

                {page < totalPages && (
                  <Link
                    href={createCatalogHref({
                      page: page + 1,
                      search,
                      religions: selectedReligions,
                      categories: selectedCategories,
                      minimumPrice,
                      maximumPrice,
                      order,
                    })}
                    aria-label="Próxima página"
                    className="flex h-9 w-9 items-center justify-center rounded border border-[#f0e3c2] bg-white text-[#6f5a28]"
                  >
                    <ChevronRight size={16} />
                  </Link>
                )}
              </nav>
            )}

            <div className="mb-8 mt-9 grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoCard
                icon={<Truck size={34} />}
                title="Entrega para todo o Brasil"
                text="Enviamos para todas as regiões com segurança e agilidade."
                href="/prazo-de-entrega"
                linkLabel="Saiba mais"
              />

              <InfoCard
                icon={<WalletCards size={34} />}
                title="Pagamento seguro"
                text="Aceitamos Pix, cartão de crédito, débito e boleto."
                href="/formas-de-pagamento"
                linkLabel="Formas de pagamento"
              />

              <InfoCard
                icon={<ShieldCheck size={34} />}
                title="Respeito e diversidade"
                text="Valorizamos todas as religiões, culturas e tradições."
                href="/sobre#nossa-missao"
                linkLabel="Nossa missão"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* <Link
        href="/contato"
        aria-label="Fale conosco"
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl sm:bottom-8 sm:right-8 sm:h-[62px] sm:w-[62px]"
      >
        <MessageCircle size={30} />
      </Link> */}
    </main>
  );
}