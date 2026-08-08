import AdminShell from "@/app/components/admin/AdminShell";
import ProductActions from "@/app/components/admin/ProductActions";
import ProductStockManager from "@/app/components/admin/ProductStockManager";

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Package,
  Plus,
  Search,
  X,
} from "lucide-react";

import type { Prisma } from "@prisma/client";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

import { prisma } from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

/*
 * =====================================================
 * CONFIGURAÇÃO
 * =====================================================
 */

const PRODUCTS_PER_PAGE =
  20;

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

/*
 * =====================================================
 * TIPOS
 * =====================================================
 */

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    religion?: string;
    status?: string;
    stock?: string;
    featured?: string;
    page?: string;
  }>;
};

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  image: string;
  category: string;
  religions: string[];
  price: unknown;
  salePrice: unknown;
  stock: number;
  minimumStock: number;
  active: boolean;
  featured: boolean;
};

/*
 * =====================================================
 * UTILITÁRIOS
 * =====================================================
 */

function formatPrice(
  value: unknown
) {
  return Number(
    value
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function normalizeSearch(
  value: string | undefined,
  maximumLength = 100
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function getPage(
  value: string | undefined
) {
  const parsed =
    Number(value);

  if (
    !Number.isInteger(
      parsed
    ) ||
    parsed < 1
  ) {
    return 1;
  }

  return parsed;
}

/*
 * =====================================================
 * URL DA PAGINAÇÃO
 * =====================================================
 */

function buildProductsUrl({
  page,
  q,
  category,
  religion,
  status,
  stock,
  featured,
}: {
  page: number;
  q: string;
  category: string;
  religion: string;
  status: string;
  stock: string;
  featured: string;
}) {
  const params =
    new URLSearchParams();

  if (q) {
    params.set(
      "q",
      q
    );
  }

  if (category) {
    params.set(
      "category",
      category
    );
  }

  if (religion) {
    params.set(
      "religion",
      religion
    );
  }

  if (status) {
    params.set(
      "status",
      status
    );
  }

  if (stock) {
    params.set(
      "stock",
      stock
    );
  }

  if (featured) {
    params.set(
      "featured",
      featured
    );
  }

  if (page > 1) {
    params.set(
      "page",
      String(page)
    );
  }

  const query =
    params.toString();

  return query
    ? `/admin/produtos?${query}`
    : "/admin/produtos";
}

/*
 * =====================================================
 * PÁGINA
 * =====================================================
 */

export default async function AdminProductsPage({
  searchParams,
}: PageProps) {
  /*
   * ===================================================
   * AUTORIZAÇÃO
   * ===================================================
   */

  let session;

  try {
    session =
      await requireAdminPermission(
        "PRODUCTS",
        "VIEW"
      );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      redirect(
        "/admin/login"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_FORBIDDEN"
    ) {
      redirect(
        "/admin/acesso-negado?redirect=/admin/produtos"
      );
    }

    throw error;
  }

  /*
   * ===================================================
   * PERMISSÕES
   * ===================================================
   *
   * Essas variáveis controlam a interface.
   *
   * As APIs verificam novamente a autorização
   * no servidor.
   */

  let canEdit =
    session.isSuperAdmin;

  let canManage =
    session.isSuperAdmin;

  if (
    !session.isSuperAdmin
  ) {
    const permission =
      await prisma.adminPermission.findUnique({
        where: {
          userId_module: {
            userId:
              session.userId,

            module:
              "PRODUCTS",
          },
        },

        select: {
          level:
            true,
        },
      });

    canEdit =
      permission?.level ===
        "EDIT" ||
      permission?.level ===
        "MANAGE";

    canManage =
      permission?.level ===
      "MANAGE";
  }

  /*
   * ===================================================
   * PARÂMETROS
   * ===================================================
   */

  const params =
    await searchParams;

  const q =
    normalizeSearch(
      params.q
    );

  const category =
    normalizeSearch(
      params.category
    );

  const religion =
    normalizeSearch(
      params.religion
    );

  const status =
    params.status ===
      "active" ||
    params.status ===
      "inactive"
      ? params.status
      : "";

  const stock =
    params.stock ===
      "available" ||
    params.stock ===
      "out"
      ? params.stock
      : "";

  const featured =
    params.featured ===
      "yes" ||
    params.featured ===
      "no"
      ? params.featured
      : "";

  const requestedPage =
    getPage(
      params.page
    );

  /*
   * ===================================================
   * FILTROS DO PRISMA
   * ===================================================
   */

  const where: Prisma.ProductWhereInput =
    {
      /*
       * Produtos arquivados nunca aparecem
       * no catálogo administrativo principal.
       */
      archivedAt:
        null,
    };

  /*
   * BUSCA
   */

  if (q) {
    where.OR = [
      {
        name: {
          contains:
            q,

          mode:
            "insensitive",
        },
      },

      {
        sku: {
          contains:
            q,

          mode:
            "insensitive",
        },
      },

      {
        slug: {
          contains:
            q,

          mode:
            "insensitive",
        },
      },
    ];
  }

  /*
   * CATEGORIA
   */

  if (category) {
    where.category =
      category;
  }

  /*
   * RELIGIÃO
   */

  if (
    religion &&
    RELIGIONS.includes(
      religion as
        (typeof RELIGIONS)[number]
    )
  ) {
    where.religions = {
      has:
        religion,
    };
  }

  /*
   * STATUS
   */

  if (
    status ===
    "active"
  ) {
    where.active =
      true;
  }

  if (
    status ===
    "inactive"
  ) {
    where.active =
      false;
  }

  /*
   * ESTOQUE
   */

  if (
    stock ===
    "available"
  ) {
    where.stock = {
      gt:
        0,
    };
  }

  if (
    stock ===
    "out"
  ) {
    where.stock = {
      lte:
        0,
    };
  }

  /*
   * DESTAQUE
   */

  if (
    featured ===
    "yes"
  ) {
    where.featured =
      true;
  }

  if (
    featured ===
    "no"
  ) {
    where.featured =
      false;
  }

  /*
   * ===================================================
   * CATEGORIAS
   * ===================================================
   */

  const categoryRows =
    await prisma.product.findMany({
      where: {
        archivedAt:
          null,
      },

      distinct: [
        "category",
      ],

      orderBy: {
        category:
          "asc",
      },

      select: {
        category:
          true,
      },
    });

  const categories =
    categoryRows
      .map(
        (item) =>
          item.category.trim()
      )
      .filter(
        (
          value,
          index,
          array
        ) =>
          Boolean(value) &&
          array.indexOf(
            value
          ) ===
            index
      );

  /*
   * ===================================================
   * PAGINAÇÃO
   * ===================================================
   */

  const totalProducts =
    await prisma.product.count({
      where,
    });

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalProducts /
          PRODUCTS_PER_PAGE
      )
    );

  const currentPage =
    Math.min(
      requestedPage,
      totalPages
    );

  const skip =
    (currentPage - 1) *
    PRODUCTS_PER_PAGE;

  /*
   * ===================================================
   * PRODUTOS
   * ===================================================
   */

  const products: AdminProduct[] =
    await prisma.product.findMany({
      where,

      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        image: true,
        category: true,
        religions: true,
        price: true,
        salePrice: true,

        stock: true,

        minimumStock:
          true,

        active: true,
        featured: true,
      },

      orderBy: [
        {
          createdAt:
            "desc",
        },

        {
          id:
            "desc",
        },
      ],

      skip,

      take:
        PRODUCTS_PER_PAGE,
    });

  const hasFilters =
    Boolean(
      q ||
        category ||
        religion ||
        status ||
        stock ||
        featured
    );

  const firstProduct =
    totalProducts === 0
      ? 0
      : skip + 1;

  const lastProduct =
    Math.min(
      skip +
        products.length,
      totalProducts
    );

  return (
    <AdminShell
      title="Produtos"
      description="Gerencie o catálogo da loja"
    >
      {/* =================================================
          CABEÇALHO
      ================================================= */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#20170f]">
            Catálogo de produtos
          </h1>

          <p className="mt-1 text-sm text-neutral-600">
            {totalProducts}{" "}
            {totalProducts ===
            1
              ? "produto encontrado"
              : "produtos encontrados"}
          </p>
        </div>

        {canEdit && (
          <Link
            href="/admin/produtos/novo"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-5 font-bold text-white shadow-lg transition hover:bg-[#9f6f14]"
          >
            <Plus
              size={18}
            />

            Novo produto
          </Link>
        )}
      </div>

      {/* =================================================
          BUSCA E FILTROS
      ================================================= */}

      <section className="mb-5 rounded-2xl border border-[#e8dcc2] bg-white p-4 shadow-sm sm:p-5">
        <form
          method="GET"
          action="/admin/produtos"
        >
          <div className="flex items-center gap-2">
            <Filter
              size={18}
              className="text-[#b98218]"
            />

            <h2 className="font-extrabold text-[#20170f]">
              Buscar e filtrar
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
            {/* BUSCA */}

            <label className="lg:col-span-4">
              <span className="sr-only">
                Buscar produto
              </span>

              <div className="flex h-11 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218]">
                <Search
                  size={17}
                  className="shrink-0 text-[#b98218]"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={
                    q
                  }
                  maxLength={
                    100
                  }
                  placeholder="Nome, SKU ou slug..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </label>

            {/* CATEGORIA */}

            <select
              name="category"
              defaultValue={
                category
              }
              className="h-11 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218] lg:col-span-2"
            >
              <option value="">
                Todas as categorias
              </option>

              {categories.map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            {/* RELIGIÃO */}

            <select
              name="religion"
              defaultValue={
                religion
              }
              className="h-11 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218] lg:col-span-2"
            >
              <option value="">
                Todas as religiões
              </option>

              {RELIGIONS.map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    {item}
                  </option>
                )
              )}
            </select>

            {/* STATUS */}

            <select
              name="status"
              defaultValue={
                status
              }
              className="h-11 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218] lg:col-span-2"
            >
              <option value="">
                Todos os status
              </option>

              <option value="active">
                Ativos
              </option>

              <option value="inactive">
                Inativos
              </option>
            </select>

            {/* ESTOQUE */}

            <select
              name="stock"
              defaultValue={
                stock
              }
              className="h-11 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218] lg:col-span-2"
            >
              <option value="">
                Todo estoque
              </option>

              <option value="available">
                Com estoque
              </option>

              <option value="out">
                Sem estoque
              </option>
            </select>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* DESTAQUE */}

            <select
              name="featured"
              defaultValue={
                featured
              }
              className="h-11 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218] sm:w-[220px]"
            >
              <option value="">
                Todos os produtos
              </option>

              <option value="yes">
                Somente destaques
              </option>

              <option value="no">
                Não destacados
              </option>
            </select>

            <div className="flex flex-col gap-2 sm:flex-row">
              {hasFilters && (
                <Link
                  href="/admin/produtos"
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#e8dcc2] px-4 text-sm font-bold text-neutral-600 transition hover:bg-[#faf9f6]"
                >
                  <X
                    size={16}
                  />

                  Limpar filtros
                </Link>
              )}

              <button
                type="submit"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#20170f] px-6 text-sm font-extrabold text-white transition hover:bg-[#38291d]"
              >
                <Search
                  size={16}
                />

                Buscar
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* =================================================
          TABELA
      ================================================= */}

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead className="bg-[#faf9f6] text-[#20170f]">
              <tr>
                <th className="p-4 text-left">
                  Produto
                </th>

                <th className="p-4 text-left">
                  SKU
                </th>

                <th className="p-4 text-left">
                  Categoria
                </th>

                <th className="p-4 text-left">
                  Religião
                </th>

                <th className="p-4 text-left">
                  Preço
                </th>

                <th className="p-4 text-left">
                  Estoque
                </th>

                <th className="p-4 text-left">
                  Status
                </th>

                {/*
                 * Sempre mostramos a coluna.
                 *
                 * Usuários VIEW podem abrir o histórico
                 * de estoque, mas não movimentá-lo.
                 */}

                <th className="p-4 text-right">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map(
                (
                  product
                ) => {
                  const lowStock =
                    product.stock >
                      0 &&
                    product.stock <=
                      product.minimumStock;

                  return (
                    <tr
                      key={
                        product.id
                      }
                      className="border-t border-[#eee2cc] transition hover:bg-[#faf9f6]"
                    >
                      {/* PRODUTO */}

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                            className="h-12 w-12 shrink-0 rounded-xl border object-cover"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <strong className="block max-w-[220px] truncate text-[#20170f]">
                                {
                                  product.name
                                }
                              </strong>

                              {product.featured && (
                                <span className="rounded-full bg-[#fff8e8] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#b98218]">
                                  Destaque
                                </span>
                              )}
                            </div>

                            <p className="mt-1 max-w-[240px] truncate text-xs text-neutral-500">
                              {
                                product.slug
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}

                      <td className="p-4">
                        <span className="rounded-lg bg-[#faf9f6] px-2.5 py-1 font-mono text-xs font-bold text-[#7a5422]">
                          {product.sku ??
                            "-"}
                        </span>
                      </td>

                      {/* CATEGORIA */}

                      <td className="p-4">
                        {
                          product.category
                        }
                      </td>

                      {/* RELIGIÕES */}

                      <td className="p-4">
                        <div className="flex max-w-[240px] flex-wrap gap-1">
                          {product.religions
                            .slice(
                              0,
                              2
                            )
                            .map(
                              (
                                item
                              ) => (
                                <span
                                  key={
                                    item
                                  }
                                  className="rounded-full bg-[#fff8e8] px-2 py-1 text-[10px] font-bold text-[#9f6f14]"
                                >
                                  {
                                    item
                                  }
                                </span>
                              )
                            )}

                          {product
                            .religions
                            .length >
                            2 && (
                            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500">
                              +
                              {product
                                .religions
                                .length -
                                2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PREÇO */}

                      <td className="p-4">
                        {product.salePrice ? (
                          <div>
                            <strong className="block text-green-700">
                              {formatPrice(
                                product.salePrice
                              )}
                            </strong>

                            <span className="text-xs text-neutral-400 line-through">
                              {formatPrice(
                                product.price
                              )}
                            </span>
                          </div>
                        ) : (
                          <strong>
                            {formatPrice(
                              product.price
                            )}
                          </strong>
                        )}
                      </td>

                      {/* ESTOQUE */}

                      <td className="p-4">
                        <div>
                          <strong
                            className={
                              product.stock <=
                              0
                                ? "text-red-700"
                                : lowStock
                                  ? "text-orange-600"
                                  : "text-green-700"
                            }
                          >
                            {
                              product.stock
                            }
                          </strong>

                          {product.stock <=
                          0 ? (
                            <p className="mt-1 text-[10px] font-bold text-red-600">
                              Sem estoque
                            </p>
                          ) : lowStock ? (
                            <p className="mt-1 text-[10px] font-bold text-orange-600">
                              Estoque baixo
                            </p>
                          ) : null}

                          <p className="mt-1 text-[10px] text-neutral-400">
                            Mín.{" "}
                            {
                              product.minimumStock
                            }
                          </p>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.active
                            ? "Ativo"
                            : "Inativo"}
                        </span>
                      </td>

                      {/* =====================================
                          AÇÕES
                      ===================================== */}

                      <td className="p-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {/*
                           * VIEW pode consultar histórico.
                           *
                           * O próprio componente usa canEdit
                           * para não permitir movimentação
                           * pela interface.
                           *
                           * A API POST também exige EDIT.
                           */}

                          <ProductStockManager
                            productId={
                              product.id
                            }
                            productName={
                              product.name
                            }
                            sku={
                              product.sku
                            }
                            initialStock={
                              product.stock
                            }
                            minimumStock={
                              product.minimumStock
                            }
                            canEdit={
                              canEdit
                            }
                          />

                          {(canEdit ||
                            canManage) && (
                            <ProductActions
                              productId={
                                product.id
                              }
                              productName={
                                product.name
                              }
                              canEdit={
                                canEdit
                              }
                              canManage={
                                canManage
                              }
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}

              {/* SEM RESULTADOS */}

              {products.length ===
                0 && (
                <tr>
                  <td
                    colSpan={
                      8
                    }
                    className="p-12 text-center"
                  >
                    <Package
                      size={36}
                      className="mx-auto text-neutral-300"
                    />

                    <strong className="mt-4 block text-[#20170f]">
                      Nenhum produto encontrado
                    </strong>

                    <p className="mt-2 text-sm text-neutral-500">
                      Tente alterar os
                      termos da busca ou
                      remover alguns
                      filtros.
                    </p>

                    {hasFilters && (
                      <Link
                        href="/admin/produtos"
                        className="mt-5 inline-flex text-sm font-bold text-[#b98218] hover:underline"
                      >
                        Limpar todos os
                        filtros
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================
            PAGINAÇÃO
        ================================================= */}

        <div className="flex flex-col gap-4 border-t border-[#eee2cc] bg-[#faf9f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            {totalProducts >
            0 ? (
              <>
                Mostrando{" "}
                <strong className="text-[#20170f]">
                  {
                    firstProduct
                  }
                </strong>{" "}
                até{" "}
                <strong className="text-[#20170f]">
                  {
                    lastProduct
                  }
                </strong>{" "}
                de{" "}
                <strong className="text-[#20170f]">
                  {
                    totalProducts
                  }
                </strong>{" "}
                produtos
              </>
            ) : (
              "Nenhum produto encontrado"
            )}
          </p>

          {totalPages >
            1 && (
            <div className="flex items-center gap-2">
              {/* ANTERIOR */}

              {currentPage >
              1 ? (
                <Link
                  href={buildProductsUrl({
                    page:
                      currentPage -
                      1,

                    q,
                    category,
                    religion,
                    status,
                    stock,
                    featured,
                  })}
                  className="flex h-10 items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-[#20170f] transition hover:bg-[#fff8e8]"
                >
                  <ChevronLeft
                    size={16}
                  />

                  Anterior
                </Link>
              ) : (
                <span className="flex h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-neutral-300">
                  <ChevronLeft
                    size={16}
                  />

                  Anterior
                </span>
              )}

              {/* PÁGINA ATUAL */}

              <span className="px-2 text-xs text-neutral-500">
                Página{" "}
                <strong className="text-[#20170f]">
                  {
                    currentPage
                  }
                </strong>{" "}
                de{" "}
                <strong className="text-[#20170f]">
                  {
                    totalPages
                  }
                </strong>
              </span>

              {/* PRÓXIMA */}

              {currentPage <
              totalPages ? (
                <Link
                  href={buildProductsUrl({
                    page:
                      currentPage +
                      1,

                    q,
                    category,
                    religion,
                    status,
                    stock,
                    featured,
                  })}
                  className="flex h-10 items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-[#20170f] transition hover:bg-[#fff8e8]"
                >
                  Próxima

                  <ChevronRight
                    size={16}
                  />
                </Link>
              ) : (
                <span className="flex h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-[#e8dcc2] bg-white px-3 text-xs font-bold text-neutral-300">
                  Próxima

                  <ChevronRight
                    size={16}
                  />
                </span>
              )}
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}