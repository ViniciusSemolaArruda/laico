"use client";

import {
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";

import Link from "next/link";

import {
  useState,
} from "react";

type ProductCatalogFiltersProps = {
  religions:
    readonly string[];

  categories:
    readonly string[];

  selectedReligions:
    readonly string[];

  selectedCategories:
    readonly string[];

  minimumPrice:
    string;

  maximumPrice:
    string;

  search:
    string;

  order:
    string;
};

const RELIGION_ICONS: Record<
  string,
  string
> = {
  "Católicos e Protestantes":
    "✝️",

  Islamismo:
    "☪️",

  Judaísmo:
    "✡️",

  Hinduísmo:
    "🕉️",

  Budismo:
    "☸️",

  Espiritismo:
    "🕯️",

  "Matriz Africana":
    "⚱️",

  "Povos Originários":
    "🪶",

  Quilombolas:
    "🧑🏾",

  Ciganos:
    "🎪",

  Ortodoxos:
    "⛪",

  Anglicanismo:
    "✟",
};

type FilterFormProps =
  ProductCatalogFiltersProps & {
    mobile?:
      boolean;

    onFinished?:
      () => void;
  };

function FilterForm({
  religions,
  categories,
  selectedReligions,
  selectedCategories,
  minimumPrice,
  maximumPrice,
  search,
  order,
  mobile = false,
  onFinished,
}: FilterFormProps) {
  return (
    <form
      action="/catalogo"
      method="GET"
      className="bg-white"
    >
      {/* PRESERVAR BUSCA */}

      {search && (
        <input
          type="hidden"
          name="busca"
          value={search}
        />
      )}

      {/* PRESERVAR ORDENAÇÃO */}

      {order && (
        <input
          type="hidden"
          name="ordem"
          value={order}
        />
      )}

      {/* RELIGIÕES */}

      <div className="border-b border-[#f0e3c2] p-5 sm:p-6">
        <details open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-[#20170f] [&::-webkit-details-marker]:hidden">
            <strong className="text-sm">
              Religião
            </strong>

            <ChevronDown
              size={18}
              className="text-[#cfa74a]"
            />
          </summary>

          <div className="mt-4 max-h-[330px] space-y-3 overflow-y-auto pr-1">
            {religions.map(
              (
                religion
              ) => (
                <label
                  key={
                    religion
                  }
                  className="flex cursor-pointer items-center gap-3 text-sm text-neutral-800"
                >
                  <input
                    type="checkbox"
                    name="religiao"
                    value={
                      religion
                    }
                    defaultChecked={selectedReligions.includes(
                      religion
                    )}
                    className="h-4 w-4 shrink-0 accent-[#cfa74a]"
                  />

                  <span
                    className="w-5 shrink-0 text-center"
                    aria-hidden="true"
                  >
                    {RELIGION_ICONS[
                      religion
                    ] ||
                      "•"}
                  </span>

                  <span>
                    {
                      religion
                    }
                  </span>
                </label>
              )
            )}
          </div>
        </details>
      </div>

      {/* CATEGORIAS */}

      <div className="border-b border-[#f0e3c2] p-5 sm:p-6">
        <details
          open={
            selectedCategories.length >
              0 ||
            categories.length <=
              8
          }
        >
          <summary className="flex cursor-pointer list-none items-center justify-between text-[#20170f] [&::-webkit-details-marker]:hidden">
            <strong className="text-sm">
              Categoria
            </strong>

            <ChevronDown
              size={18}
              className="text-[#cfa74a]"
            />
          </summary>

          <div className="mt-4 max-h-[260px] space-y-3 overflow-y-auto pr-1">
            {categories.length >
            0 ? (
              categories.map(
                (
                  category
                ) => (
                  <label
                    key={
                      category
                    }
                    className="flex cursor-pointer items-center gap-3 text-sm text-neutral-800"
                  >
                    <input
                      type="checkbox"
                      name="categoria"
                      value={
                        category
                      }
                      defaultChecked={selectedCategories.includes(
                        category
                      )}
                      className="h-4 w-4 shrink-0 accent-[#cfa74a]"
                    />

                    <span>
                      {
                        category
                      }
                    </span>
                  </label>
                )
              )
            ) : (
              <p className="text-xs leading-5 text-neutral-500">
                Nenhuma
                categoria
                disponível.
              </p>
            )}
          </div>
        </details>
      </div>

      {/* FAIXA DE PREÇO */}

      <div className="p-5 sm:p-6">
        <strong className="text-sm text-[#20170f]">
          Faixa de preço
        </strong>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* MÍNIMO */}

          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Mínimo
            </span>

            <input
              type="number"
              name="precoMin"
              min="0"
              step="0.01"
              defaultValue={
                minimumPrice
              }
              inputMode="decimal"
              placeholder="R$ 0,00"
              className="mt-1.5 h-11 w-full rounded-lg border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218]"
            />
          </label>

          {/* MÁXIMO */}

          <label>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Máximo
            </span>

            <input
              type="number"
              name="precoMax"
              min="0"
              step="0.01"
              defaultValue={
                maximumPrice
              }
              inputMode="decimal"
              placeholder="Sem limite"
              className="mt-1.5 h-11 w-full rounded-lg border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none focus:border-[#b98218]"
            />
          </label>
        </div>

        {/* APLICAR */}

        <button
          type="submit"
          onClick={
            onFinished
          }
          className="mt-5 h-11 w-full rounded-lg bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#cfa74a] text-sm font-bold text-white shadow-[0_4px_12px_rgba(207,167,74,0.25)] transition hover:brightness-95"
        >
          Aplicar filtros
        </button>

        {/* LIMPAR */}

        <Link
          href="/catalogo"
          onClick={
            onFinished
          }
          className="mt-3 flex h-10 w-full items-center justify-center rounded-lg border border-[#e8dcc2] text-xs font-bold text-[#7a5422] transition hover:bg-[#fff8e8]"
        >
          Limpar filtros
        </Link>
      </div>

      {mobile && (
        <div className="h-5" />
      )}
    </form>
  );
}

export default function ProductCatalogFilters(
  props:
    ProductCatalogFiltersProps
) {
  const [
    mobileOpen,
    setMobileOpen,
  ] =
    useState(
      false
    );

  return (
    <>
      {/* BOTÃO MOBILE */}

      <button
        type="button"
        onClick={() =>
          setMobileOpen(
            true
          )
        }
        className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e8dcc2] bg-white text-sm font-bold text-[#7a5422] shadow-sm lg:hidden"
      >
        <SlidersHorizontal
          size={18}
        />

        Filtrar produtos
      </button>

      {/* FILTRO DESKTOP */}

      <aside className="sticky top-6 hidden w-[315px] overflow-hidden rounded-lg border border-[#f0e3c2] bg-white shadow-[0_2px_10px_rgba(207,167,74,0.08)] lg:block">
        <div className="flex h-[58px] items-center gap-3 border-b border-[#f0e3c2] px-6 text-[#9f7a2f]">
          <SlidersHorizontal
            size={20}
          />

          <strong className="text-base uppercase">
            Filtrar
            produtos
          </strong>
        </div>

        <FilterForm
          {...props}
        />
      </aside>

      {/* FILTRO MOBILE */}

      <div
        className={`fixed inset-0 z-[100] lg:hidden ${
          mobileOpen
            ? "visible"
            : "invisible pointer-events-none"
        }`}
        aria-hidden={
          !mobileOpen
        }
      >
        {/* FUNDO */}

        <button
          type="button"
          aria-label="Fechar filtros"
          onClick={() =>
            setMobileOpen(
              false
            )
          }
          className={`absolute inset-0 bg-black/45 transition-opacity ${
            mobileOpen
              ? "opacity-100"
              : "opacity-0"
          }`}
        />

        {/* PAINEL */}

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Filtros do catálogo"
          className={`absolute right-0 top-0 h-full w-[min(92vw,380px)] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ${
            mobileOpen
              ? "translate-x-0"
              : "translate-x-full"
          }`}
        >
          {/* CABEÇALHO */}

          <div className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#f0e3c2] bg-white px-5">
            <div className="flex items-center gap-2 text-[#9f7a2f]">
              <SlidersHorizontal
                size={19}
              />

              <strong className="text-sm uppercase">
                Filtrar
                produtos
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  false
                )
              }
              aria-label="Fechar filtros"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100"
            >
              <X
                size={21}
              />
            </button>
          </div>

          <FilterForm
            {...props}
            mobile
            onFinished={() =>
              setMobileOpen(
                false
              )
            }
          />
        </aside>
      </div>
    </>
  );
}