"use client";

import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
} from "lucide-react";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

type PasswordResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
};

export default function AccountPasswordForm() {
  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPasswords,
    setShowPasswords,
  ] =
    useState(false);

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

  const rules =
    useMemo(
      () => ({
        length:
          newPassword.length >=
          12,

        uppercase:
          /[A-Z]/.test(
            newPassword
          ),

        lowercase:
          /[a-z]/.test(
            newPassword
          ),

        number:
          /\d/.test(
            newPassword
          ),

        special:
          /[^a-zA-Z0-9]/.test(
            newPassword
          ),
      }),
      [newPassword]
    );

  const valid =
    Object.values(
      rules
    ).every(Boolean);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError(null);

    if (!valid) {
      setError(
        "A nova senha ainda não atende aos requisitos de segurança."
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "As novas senhas não são iguais."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/account/password",
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
                currentPassword,
                newPassword,
              }),
          }
        );

      const data =
        (await response.json()) as PasswordResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Não foi possível alterar sua senha."
        );

        return;
      }

      /*
       * A sessão foi revogada.
       * Novo login obrigatório.
       */

      window.location.replace(
        data.redirectTo ||
          "/entrar?password=changed"
      );
    } catch {
      setError(
        "Não foi possível alterar sua senha agora."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <KeyRound
          size={22}
          className="text-[#b98218]"
        />

        <div>
          <h2 className="text-xl font-extrabold text-[#20170f]">
            Segurança
          </h2>

          <p className="mt-1 text-xs text-neutral-500">
            Altere a senha da sua conta.
          </p>
        </div>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >
        <PasswordInput
          label="Senha atual"
          value={
            currentPassword
          }
          onChange={
            setCurrentPassword
          }
          show={
            showPasswords
          }
          autoComplete="current-password"
        />

        <PasswordInput
          label="Nova senha"
          value={
            newPassword
          }
          onChange={
            setNewPassword
          }
          show={
            showPasswords
          }
          autoComplete="new-password"
        />

        <div className="grid grid-cols-1 gap-2 rounded-xl bg-[#faf9f6] p-4 text-xs sm:grid-cols-2">
          <Rule
            valid={
              rules.length
            }
            label="12 caracteres"
          />

          <Rule
            valid={
              rules.uppercase
            }
            label="Maiúscula"
          />

          <Rule
            valid={
              rules.lowercase
            }
            label="Minúscula"
          />

          <Rule
            valid={
              rules.number
            }
            label="Número"
          />

          <Rule
            valid={
              rules.special
            }
            label="Caractere especial"
          />
        </div>

        <PasswordInput
          label="Confirmar nova senha"
          value={
            confirmPassword
          }
          onChange={
            setConfirmPassword
          }
          show={
            showPasswords
          }
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={() =>
            setShowPasswords(
              (current) =>
                !current
            )
          }
          className="flex items-center gap-2 text-xs font-bold text-[#b98218]"
        >
          {showPasswords ? (
            <EyeOff
              size={15}
            />
          ) : (
            <Eye
              size={15}
            />
          )}

          {showPasswords
            ? "Ocultar senhas"
            : "Mostrar senhas"}
        </button>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading
          }
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#20170f] px-5 text-sm font-extrabold text-white transition hover:bg-[#38291d] disabled:opacity-60"
        >
          <LockKeyhole
            size={17}
          />

          {loading
            ? "Alterando..."
            : "Alterar senha"}
        </button>
      </form>
    </section>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  show: boolean;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </span>

      <input
        type={
          show
            ? "text"
            : "password"
        }
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        required
        autoComplete={
          autoComplete
        }
        className="mt-2 h-11 w-full rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 text-sm outline-none focus:border-[#b98218]"
      />
    </label>
  );
}

function Rule({
  valid,
  label,
}: {
  valid: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        valid
          ? "text-green-700"
          : "text-neutral-400"
      }`}
    >
      <Check
        size={13}
      />

      {label}
    </div>
  );
}