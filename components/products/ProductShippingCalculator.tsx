"use client";

import {
  LoaderCircle,
  MapPin,
  Truck,
} from "lucide-react";

import {
  type FormEvent,
  useState,
} from "react";

type ShippingOption = {
  serviceId: string;
  serviceName: string;
  companyId:
    | string
    | null;
  companyName: string;
  customerPrice: number;
  deliveryTime: number;

  deliveryRange: {
    minimum: number;
    maximum: number;
  };

  freeShipping: boolean;
};

type QuoteResponse = {
  success?: boolean;

  quote?: {
    freeShippingEligible:
      boolean;

    options:
      ShippingOption[];
  };

  error?: string;
};

function formatCep(
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

export default function ProductShippingCalculator({
  productId,
}: {
  productId:
    string;
}) {
  const [
    cep,
    setCep,
  ] =
    useState("");

  const [
    options,
    setOptions,
  ] =
    useState<
      ShippingOption[]
    >([]);

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

  async function calculateShipping(
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

    setLoading(
      true
    );

    setError(
      null
    );

    setOptions(
      []
    );

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

                items: [
                  {
                    productId,
                    quantity:
                      1,
                  },
                ],
              }),
          }
        );

      const data =
        (await response
          .json()
          .catch(
            () => ({})
          )) as QuoteResponse;

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
          "Nenhuma entrega está disponível para este CEP."
        );

        return;
      }

      setOptions(
        data.quote.options
      );
    } catch {
      setError(
        "Não foi possível calcular o frete agora."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <MapPin
          size={18}
          className="text-[#b98218]"
          aria-hidden="true"
        />

        <h3 className="text-sm font-extrabold text-[#20170f]">
          Calcular entrega
        </h3>
      </div>

      <p className="mb-4 text-xs leading-5 text-neutral-500">
        Consulte o valor
        para uma unidade.
        O carrinho calculará
        todas as quantidades.
      </p>

      <form
        onSubmit={
          calculateShipping
        }
      >
        <label className="sr-only">
          CEP de destino
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
                formatCep(
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
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-3 text-sm outline-none transition focus:border-[#b98218] disabled:opacity-60"
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

      {options.length >
        0 && (
        <div className="mt-4 space-y-2">
          {options.map(
            (option) => (
              <div
                key={
                  option.serviceId
                }
                className="rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-2">
                    <Truck
                      size={17}
                      className="mt-0.5 shrink-0 text-[#b98218]"
                      aria-hidden="true"
                    />

                    <div className="min-w-0">
                      <strong className="block truncate text-xs text-[#20170f]">
                        {
                          option.serviceName
                        }
                      </strong>

                      <span className="mt-1 block text-[11px] leading-4 text-neutral-500">
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
                    className={`shrink-0 text-xs ${
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
              </div>
            )
          )}

          <p className="text-[11px] leading-5 text-neutral-400">
            Estimativa para
            uma unidade. O
            valor será
            confirmado no
            carrinho e no
            checkout.
          </p>
        </div>
      )}
    </div>
  );
}