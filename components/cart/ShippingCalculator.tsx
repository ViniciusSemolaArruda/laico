"use client";

import {
  Check,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";

import {
  type FormEvent,
  useState,
} from "react";

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type ShippingCartItem = {
  id: string;
  quantity: number;
};

type ShippingOption = {
  serviceId:
    string;

  serviceName:
    string;

  companyId:
    string | null;

  companyName:
    string;

  customerPrice:
    number;

  deliveryTime:
    number;

  deliveryRange: {
    minimum:
      number;

    maximum:
      number;
  };

  currency:
    "BRL";

  freeShipping:
    boolean;
};

type ShippingQuote = {
  destinationCep:
    string;

  subtotal:
    number;

  totalQuantity:
    number;

  freeShippingEligible:
    boolean;

  freeShippingMinimum:
    number;

  freeShippingDiscount:
    number;

  options:
    ShippingOption[];

  quotedAt:
    string;

  expiresAt:
    string;
};

type ShippingResponse = {
  success?:
    boolean;

  quote?:
    ShippingQuote;

  error?:
    string;

  code?:
    string;
};

export type SelectedShippingOption = {
  destinationCep:
    string;

  serviceId:
    string;

  serviceName:
    string;

  companyId:
    string | null;

  companyName:
    string;

  price:
    number;

  deliveryTime:
    number;

  deliveryRange: {
    minimum:
      number;

    maximum:
      number;
  };

  freeShipping:
    boolean;

  expiresAt:
    string;
};

type ShippingCalculatorProps = {
  items:
    ShippingCartItem[];

  onSelectionChange: (
    selection:
      | SelectedShippingOption
      | null
  ) => void;
};

/*
 * =========================================================
 * FORMATAÇÃO
 * =========================================================
 */

function formatPrice(
  value: number
) {
  return value.toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL",
    }
  );
}

function formatCepInput(
  value: string
) {
  const digits =
    value
      .replace(
        /\D/g,
        ""
      )
      .slice(
        0,
        8
      );

  if (
    digits.length <=
    5
  ) {
    return digits;
  }

  return `${digits.slice(
    0,
    5
  )}-${digits.slice(
    5
  )}`;
}

function getDeliveryText(
  option:
    ShippingOption
) {
  const minimum =
    option
      .deliveryRange
      .minimum;

  const maximum =
    option
      .deliveryRange
      .maximum;

  if (
    minimum ===
    maximum
  ) {
    return `${maximum} ${
      maximum === 1
        ? "dia útil"
        : "dias úteis"
    }`;
  }

  return `${minimum} a ${maximum} dias úteis`;
}

/*
 * =========================================================
 * COMPONENTE
 * =========================================================
 */

export default function ShippingCalculator({
  items,
  onSelectionChange,
}: ShippingCalculatorProps) {
  const [
    cep,
    setCep,
  ] =
    useState("");

  const [
    quote,
    setQuote,
  ] =
    useState<
      ShippingQuote |
      null
    >(null);

  const [
    selectedServiceId,
    setSelectedServiceId,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(null);

  /*
   * =====================================================
   * LIMPAR SELEÇÃO
   * =====================================================
   */

  function clearSelection() {
    setSelectedServiceId(
      null
    );

    onSelectionChange(
      null
    );

    sessionStorage.removeItem(
      "laico-shipping-selection"
    );
  }

  /*
   * =====================================================
   * CALCULAR
   * =====================================================
   */

  async function handleCalculate(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      loading
    ) {
      return;
    }

    const normalizedCep =
      cep.replace(
        /\D/g,
        ""
      );

    if (
      normalizedCep.length !==
      8
    ) {
      setError(
        "Informe um CEP válido."
      );

      return;
    }

    if (
      items.length ===
      0
    ) {
      setError(
        "O carrinho está vazio."
      );

      return;
    }

    setLoading(
      true
    );

    setError(
      null
    );

    setQuote(
      null
    );

    clearSelection();

    try {
      const response =
        await fetch(
          "/api/shipping/quote",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            cache:
              "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                destinationCep:
                  normalizedCep,

                items:
                  items.map(
                    (item) => ({
                      productId:
                        item.id,

                      quantity:
                        item.quantity,
                    })
                  ),
              }),
          }
        );

      const data =
        (await response
          .json()
          .catch(
            () => ({})
          )) as ShippingResponse;

      if (
        !response.ok ||
        !data.success ||
        !data.quote
      ) {
        setError(
          data.error ||
            "Não foi possível calcular o frete."
        );

        return;
      }

      if (
        !Array.isArray(
          data.quote.options
        ) ||
        data.quote
          .options
          .length ===
          0
      ) {
        setError(
          "Nenhuma opção de entrega está disponível para este CEP."
        );

        return;
      }

      setQuote(
        data.quote
      );
    } catch {
      setError(
        "Não foi possível calcular o frete agora. Tente novamente."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * =====================================================
   * SELECIONAR
   * =====================================================
   */

  function selectOption(
    option:
      ShippingOption
  ) {
    if (
      !quote
    ) {
      return;
    }

    const selection:
      SelectedShippingOption =
      {
        destinationCep:
          quote.destinationCep,

        serviceId:
          option.serviceId,

        serviceName:
          option.serviceName,

        companyId:
          option.companyId,

        companyName:
          option.companyName,

        price:
          option.customerPrice,

        deliveryTime:
          option.deliveryTime,

        deliveryRange:
          option.deliveryRange,

        freeShipping:
          option.freeShipping,

        expiresAt:
          quote.expiresAt,
      };

    setSelectedServiceId(
      option.serviceId
    );

    onSelectionChange(
      selection
    );

    /*
     * Serve apenas para manter a escolha durante
     * a navegação até o checkout.
     *
     * O checkout nunca confiará neste valor e
     * realizará uma nova cotação no servidor.
     */
    sessionStorage.setItem(
      "laico-shipping-selection",
      JSON.stringify(
        selection
      )
    );
  }

  return (
    <div className="border-t border-[#f0e3c2] pt-5">
      <div className="mb-4 flex items-center gap-2">
        <MapPin
          size={18}
          className="text-[#cfa74a]"
          aria-hidden="true"
        />

        <h3 className="text-sm font-extrabold text-[#20170f]">
          Calcular entrega
        </h3>
      </div>

      <form
        onSubmit={
          handleCalculate
        }
      >
        <label className="sr-only">
          CEP de entrega
        </label>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={
              cep
            }
            onChange={(
              event
            ) => {
              setCep(
                formatCepInput(
                  event
                    .target
                    .value
                )
              );

              if (
                error
              ) {
                setError(
                  null
                );
              }
            }}
            maxLength={9}
            placeholder="Digite seu CEP"
            disabled={
              loading
            }
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none transition focus:border-[#cfa74a] disabled:cursor-not-allowed disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={
              loading ||
              cep.replace(
                /\D/g,
                ""
              ).length !==
                8
            }
            className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-[#20170f] px-4 text-sm font-bold text-white transition hover:bg-[#38291d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
                aria-label="Calculando"
              />
            ) : (
              "Calcular"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
        >
          {
            error
          }
        </div>
      )}

      {quote && (
        <div className="mt-5 space-y-3">
          {quote
            .freeShippingEligible && (
            <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-xs text-green-800">
              <PackageCheck
                size={17}
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />

              <span>
                Seu carrinho
                atingiu o valor
                mínimo para frete
                grátis na opção
                econômica.
              </span>
            </div>
          )}

          <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">
            Escolha uma opção
          </p>

          {quote.options.map(
            (option) => {
              const selected =
                selectedServiceId ===
                option.serviceId;

              return (
                <button
                  key={
                    option.serviceId
                  }
                  type="button"
                  onClick={() =>
                    selectOption(
                      option
                    )
                  }
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-[#cfa74a] bg-[#fff8e8] ring-2 ring-[#cfa74a]/15"
                      : "border-[#e8dcc2] bg-white hover:border-[#cfa74a]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          selected
                            ? "bg-[#cfa74a] text-white"
                            : "bg-[#faf9f6] text-[#cfa74a]"
                        }`}
                      >
                        {selected ? (
                          <Check
                            size={16}
                            aria-hidden="true"
                          />
                        ) : (
                          <Truck
                            size={16}
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <div className="min-w-0">
                        <strong className="block truncate text-sm text-[#20170f]">
                          {
                            option.serviceName
                          }
                        </strong>

                        <span className="mt-1 block text-[11px] text-neutral-500">
                          {
                            option.companyName
                          }
                          {" · "}
                          {getDeliveryText(
                            option
                          )}
                        </span>
                      </div>
                    </div>

                    <strong
                      className={`shrink-0 text-sm ${
                        option.freeShipping
                          ? "text-green-700"
                          : "text-[#b98218]"
                      }`}
                    >
                      {option.freeShipping
                        ? "Grátis"
                        : formatPrice(
                            option.customerPrice
                          )}
                    </strong>
                  </div>
                </button>
              );
            }
          )}

          <p className="text-[11px] leading-5 text-neutral-400">
            Os valores e prazos
            serão confirmados
            novamente no checkout.
          </p>
        </div>
      )}
    </div>
  );
}