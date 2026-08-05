"use client";

import {
  CheckCircle2,
  Save,
  UserRound,
} from "lucide-react";

import {
  FormEvent,
  useState,
} from "react";

type Props = {
  initialName: string;
  initialPhone: string | null;
  email: string;
};

type UpdateProfileResponse = {
  success?: boolean;

  profile?: {
    name?: string;
    phone?: string | null;
  };

  message?: string;
  error?: string;
};

function formatPhone(
  value: string
) {
  const digits =
    value
      .replace(/\D/g, "")
      .slice(0, 11);

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 6
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(2)}`;
  }

  if (
    digits.length <= 10
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      6
    )}-${digits.slice(6)}`;
  }

  return `(${digits.slice(
    0,
    2
  )}) ${digits.slice(
    2,
    7
  )}-${digits.slice(7)}`;
}

export default function AccountProfileForm({
  initialName,
  initialPhone,
  email,
}: Props) {
  const [
    name,
    setName,
  ] =
    useState(
      initialName
    );

  const [
    phone,
    setPhone,
  ] =
    useState(
      formatPhone(
        initialPhone ?? ""
      )
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response =
        await fetch(
          "/api/account/profile",
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
                name,
                phone,
              }),
          }
        );

      const data =
        (await response.json()) as UpdateProfileResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Não foi possível atualizar seus dados."
        );

        return;
      }

      if (
        data.profile
          ?.name
      ) {
        setName(
          data.profile.name
        );
      }

      setPhone(
        formatPhone(
          data.profile
            ?.phone ??
            ""
        )
      );

      setSuccess(
        "Dados atualizados com sucesso."
      );
    } catch {
      setError(
        "Não foi possível atualizar seus dados agora."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <UserRound
          size={22}
          className="text-[#b98218]"
        />

        <div>
          <h2 className="text-xl font-extrabold text-[#20170f]">
            Meus dados
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Atualize suas informações pessoais.
          </p>
        </div>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Nome
          </span>

          <input
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
            required
            maxLength={120}
            autoComplete="name"
            disabled={loading}
            className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none focus:border-[#b98218]"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            E-mail
          </span>

          <input
            value={email}
            readOnly
            disabled
            className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-neutral-100 px-4 text-sm text-neutral-500"
          />

          <p className="mt-1.5 text-[11px] leading-5 text-neutral-400">
            Seu e-mail foi verificado e
            não pode ser alterado por este formulário.
          </p>
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Telefone
          </span>

          <input
            value={phone}
            onChange={(
              event
            ) =>
              setPhone(
                formatPhone(
                  event.target
                    .value
                )
              )
            }
            maxLength={15}
            autoComplete="tel"
            inputMode="tel"
            placeholder="(21) 99999-9999"
            disabled={loading}
            className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none focus:border-[#b98218]"
          />
        </label>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2
              size={17}
            />

            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#b98218] px-5 text-sm font-extrabold text-white transition hover:bg-[#9f6f14] disabled:opacity-60"
        >
          <Save
            size={17}
          />

          {loading
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      </form>
    </section>
  );
}