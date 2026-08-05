"use client";

import {
  Check,
  Edit3,
  MapPin,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

export type AccountAddress = {
  id: string;
  name: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string | null;
  isDefault: boolean;
};

type Props = {
  initialAddresses: AccountAddress[];
};

type AddressForm = {
  name: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  isDefault: boolean;
};

const EMPTY_FORM: AddressForm = {
  name: "",
  cep: "",
  state: "RJ",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: "",
  isDefault: false,
};

const STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

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
    digits.length <= 5
  ) {
    return digits;
  }

  return `${digits.slice(
    0,
    5
  )}-${digits.slice(5)}`;
}

export default function AccountAddresses({
  initialAddresses,
}: Props) {
  const router =
    useRouter();

  const [
    addresses,
    setAddresses,
  ] =
    useState<AccountAddress[]>(
      initialAddresses
    );

  const [
    form,
    setForm,
  ] =
    useState<AddressForm>(
      EMPTY_FORM
    );

  const [
    formOpen,
    setFormOpen,
  ] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    actionLoadingId,
    setActionLoadingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  function updateField(
    field: keyof AddressForm,
    value: string | boolean
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  function openNewAddress() {
    setEditingId(
      null
    );

    setForm({
      ...EMPTY_FORM,

      /*
       * Se não existe endereço,
       * o primeiro será principal.
       */
      isDefault:
        addresses.length ===
        0,
    });

    setError(
      null
    );

    setSuccess(
      null
    );

    setFormOpen(
      true
    );
  }

  function openEditAddress(
    address: AccountAddress
  ) {
    setEditingId(
      address.id
    );

    setForm({
      name:
        address.name,

      cep:
        formatCep(
          address.cep
        ),

      state:
        address.state,

      city:
        address.city,

      neighborhood:
        address.neighborhood,

      street:
        address.street,

      number:
        address.number,

      complement:
        address.complement ??
        "",

      isDefault:
        address.isDefault,
    });

    setError(
      null
    );

    setSuccess(
      null
    );

    setFormOpen(
      true
    );
  }

  function closeForm() {
    if (loading) {
      return;
    }

    setFormOpen(
      false
    );

    setEditingId(
      null
    );

    setForm(
      EMPTY_FORM
    );

    setError(
      null
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(
      true
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    try {
      const isEditing =
        Boolean(
          editingId
        );

      const url =
        isEditing
          ? `/api/account/addresses/${editingId}`
          : "/api/account/addresses";

      const response =
        await fetch(
          url,
          {
            method:
              isEditing
                ? "PATCH"
                : "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                {
                  name:
                    form.name,

                  cep:
                    form.cep,

                  state:
                    form.state,

                  city:
                    form.city,

                  neighborhood:
                    form.neighborhood,

                  street:
                    form.street,

                  number:
                    form.number,

                  complement:
                    form.complement,

                  isDefault:
                    form.isDefault,
                }
              ),
          }
        );

      const data =
        (await response.json()) as {
          success?: boolean;
          error?: string;
          message?: string;
          address?: AccountAddress;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível salvar o endereço."
        );
      }

      setSuccess(
        isEditing
          ? "Endereço atualizado com sucesso."
          : "Endereço adicionado com sucesso."
      );

      setFormOpen(
        false
      );

      setEditingId(
        null
      );

      setForm(
        EMPTY_FORM
      );

      /*
       * O servidor continua sendo a fonte
       * verdadeira dos dados.
       */
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o endereço."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function makeDefault(
    addressId: string
  ) {
    if (
      actionLoadingId
    ) {
      return;
    }

    setActionLoadingId(
      addressId
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    try {
      const response =
        await fetch(
          `/api/account/addresses/${addressId}`,
          {
            method:
              "PATCH",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                isDefault:
                  true,
              }),
          }
        );

      const data =
        (await response.json()) as {
          error?: string;
          message?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível alterar o endereço principal."
        );
      }

      /*
       * Atualização visual imediata.
       */
      setAddresses(
        (current) =>
          current.map(
            (address) => ({
              ...address,

              isDefault:
                address.id ===
                addressId,
            })
          )
      );

      setSuccess(
        "Endereço principal atualizado."
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o endereço principal."
      );
    } finally {
      setActionLoadingId(
        null
      );
    }
  }

  async function removeAddress(
    address: AccountAddress
  ) {
    if (
      actionLoadingId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Deseja remover o endereço "${address.name}"?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setActionLoadingId(
      address.id
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    try {
      const response =
        await fetch(
          `/api/account/addresses/${address.id}`,
          {
            method:
              "DELETE",

            credentials:
              "same-origin",
          }
        );

      const data =
        (await response.json()) as {
          error?: string;
          message?: string;
        };

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Não foi possível remover o endereço."
        );
      }

      /*
       * Removemos imediatamente da interface.
       * router.refresh() sincronizará novamente
       * com o banco.
       */
      setAddresses(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              address.id
          )
      );

      setSuccess(
        "Endereço removido com sucesso."
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível remover o endereço."
      );
    } finally {
      setActionLoadingId(
        null
      );
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
      {/* CABEÇALHO */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
            <MapPin
              size={20}
            />
          </div>

          <div>
            <h2 className="text-xl font-extrabold text-[#20170f]">
              Endereços
            </h2>

            <p className="mt-0.5 text-xs text-neutral-500">
              Gerencie seus
              endereços de entrega.
            </p>
          </div>
        </div>

        {!formOpen &&
          addresses.length <
            10 && (
            <button
              type="button"
              onClick={
                openNewAddress
              }
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-[#b98218] px-3 text-xs font-bold text-white transition hover:bg-[#9f6f14]"
            >
              <Plus
                size={16}
              />

              <span className="hidden sm:inline xl:hidden 2xl:inline">
                Novo
              </span>
            </button>
          )}
      </div>

      {/* MENSAGENS */}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* FORMULÁRIO */}

      {formOpen && (
        <form
          onSubmit={
            handleSubmit
          }
          className="mt-6 space-y-4 border-t border-[#eee2cc] pt-5"
        >
          <div className="flex items-center justify-between gap-4">
            <strong className="text-sm text-[#20170f]">
              {editingId
                ? "Editar endereço"
                : "Novo endereço"}
            </strong>

            <button
              type="button"
              onClick={
                closeForm
              }
              disabled={
                loading
              }
              aria-label="Fechar formulário"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 disabled:opacity-50"
            >
              <X
                size={17}
              />
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-[#20170f]">
              Identificação *
            </span>

            <input
              type="text"
              value={
                form.name
              }
              onChange={(
                event
              ) =>
                updateField(
                  "name",
                  event
                    .target
                    .value
                )
              }
              required
              maxLength={
                60
              }
              autoComplete="off"
              placeholder="Ex: Casa"
              className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
            />
          </label>

          <div className="grid grid-cols-[1fr_90px] gap-3">
            <label>
              <span className="text-xs font-bold text-[#20170f]">
                CEP *
              </span>

              <input
                type="text"
                inputMode="numeric"
                value={
                  form.cep
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "cep",
                    formatCep(
                      event
                        .target
                        .value
                    )
                  )
                }
                required
                maxLength={
                  9
                }
                autoComplete="postal-code"
                placeholder="00000-000"
                className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
              />
            </label>

            <label>
              <span className="text-xs font-bold text-[#20170f]">
                UF *
              </span>

              <select
                value={
                  form.state
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "state",
                    event
                      .target
                      .value
                  )
                }
                required
                autoComplete="address-level1"
                className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-2 text-sm outline-none transition focus:border-[#b98218]"
              >
                {STATES.map(
                  (state) => (
                    <option
                      key={
                        state
                      }
                      value={
                        state
                      }
                    >
                      {state}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-[#20170f]">
              Cidade *
            </span>

            <input
              type="text"
              value={
                form.city
              }
              onChange={(
                event
              ) =>
                updateField(
                  "city",
                  event
                    .target
                    .value
                )
              }
              required
              maxLength={
                100
              }
              autoComplete="address-level2"
              className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-[#20170f]">
              Bairro *
            </span>

            <input
              type="text"
              value={
                form.neighborhood
              }
              onChange={(
                event
              ) =>
                updateField(
                  "neighborhood",
                  event
                    .target
                    .value
                )
              }
              required
              maxLength={
                100
              }
              autoComplete="address-level3"
              className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-[#20170f]">
              Rua / Logradouro *
            </span>

            <input
              type="text"
              value={
                form.street
              }
              onChange={(
                event
              ) =>
                updateField(
                  "street",
                  event
                    .target
                    .value
                )
              }
              required
              maxLength={
                150
              }
              autoComplete="address-line1"
              className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
            />
          </label>

          <div className="grid grid-cols-[110px_1fr] gap-3">
            <label>
              <span className="text-xs font-bold text-[#20170f]">
                Número *
              </span>

              <input
                type="text"
                value={
                  form.number
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "number",
                    event
                      .target
                      .value
                  )
                }
                required
                maxLength={
                  20
                }
                autoComplete="address-line2"
                className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
              />
            </label>

            <label>
              <span className="text-xs font-bold text-[#20170f]">
                Complemento
              </span>

              <input
                type="text"
                value={
                  form.complement
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "complement",
                    event
                      .target
                      .value
                  )
                }
                maxLength={
                  100
                }
                placeholder="Apto, bloco..."
                className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-white px-3 text-sm outline-none transition focus:border-[#b98218]"
              />
            </label>
          </div>

          {!form.isDefault && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-3">
              <input
                type="checkbox"
                checked={
                  form.isDefault
                }
                onChange={(
                  event
                ) =>
                  updateField(
                    "isDefault",
                    event
                      .target
                      .checked
                  )
                }
                className="mt-0.5 h-4 w-4 accent-[#b98218]"
              />

              <span className="text-xs leading-5 text-neutral-600">
                Definir como
                endereço principal
                da minha conta.
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={
                loading
              }
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-4 text-sm font-bold text-white transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check
                size={17}
              />

              {loading
                ? "Salvando..."
                : "Salvar endereço"}
            </button>

            <button
              type="button"
              onClick={
                closeForm
              }
              disabled={
                loading
              }
              className="h-11 rounded-xl border border-[#e8dcc2] px-4 text-sm font-bold text-neutral-600 transition hover:bg-[#faf9f6] disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTA */}

      {!formOpen && (
        <div className="mt-6">
          {addresses.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-[#e8dcc2] bg-[#faf9f6] px-4 py-7 text-center">
              <MapPin
                size={26}
                className="mx-auto text-neutral-300"
              />

              <p className="mt-3 text-sm font-bold text-[#20170f]">
                Nenhum endereço
              </p>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Cadastre um
                endereço para
                facilitar suas
                próximas compras.
              </p>

              <button
                type="button"
                onClick={
                  openNewAddress
                }
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#b98218] px-4 text-xs font-bold text-white"
              >
                <Plus
                  size={15}
                />

                Adicionar endereço
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map(
                (address) => {
                  const actionLoading =
                    actionLoadingId ===
                    address.id;

                  return (
                    <div
                      key={
                        address.id
                      }
                      className={`rounded-xl border p-4 transition ${
                        address.isDefault
                          ? "border-[#d9b66b] bg-[#fffaf0]"
                          : "border-[#eee2cc] bg-[#faf9f6]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-[#20170f]">
                              {
                                address.name
                              }
                            </strong>

                            {address.isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#b98218] px-2 py-1 text-[10px] font-bold text-white">
                                <Star
                                  size={
                                    10
                                  }
                                  fill="currentColor"
                                />

                                Principal
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs leading-5 text-neutral-500">
                            {
                              address.street
                            }
                            ,{" "}
                            {
                              address.number
                            }

                            {address.complement
                              ? ` · ${address.complement}`
                              : ""}

                            <br />

                            {
                              address.neighborhood
                            }
                            {" · "}
                            {
                              address.city
                            }
                            /
                            {
                              address.state
                            }

                            <br />

                            CEP{" "}
                            {formatCep(
                              address.cep
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#eee2cc] pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            openEditAddress(
                              address
                            )
                          }
                          disabled={
                            Boolean(
                              actionLoadingId
                            )
                          }
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[#b98218] transition hover:bg-[#fff3d8] disabled:opacity-50"
                        >
                          <Edit3
                            size={
                              14
                            }
                          />

                          Editar
                        </button>

                        {!address.isDefault && (
                          <button
                            type="button"
                            onClick={() =>
                              makeDefault(
                                address.id
                              )
                            }
                            disabled={
                              Boolean(
                                actionLoadingId
                              )
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
                          >
                            <Star
                              size={
                                14
                              }
                            />

                            {actionLoading
                              ? "Salvando..."
                              : "Tornar principal"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            removeAddress(
                              address
                            )
                          }
                          disabled={
                            Boolean(
                              actionLoadingId
                            )
                          }
                          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2
                            size={
                              14
                            }
                          />

                          {actionLoading
                            ? "Removendo..."
                            : "Remover"}
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}

          {addresses.length >
            0 && (
            <p className="mt-4 text-center text-[11px] text-neutral-400">
              {
                addresses.length
              }
              /10 endereços
              cadastrados
            </p>
          )}
        </div>
      )}
    </section>
  );
}