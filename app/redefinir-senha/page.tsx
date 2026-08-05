"use client";

import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ResetResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
};

type TokenState =
  | undefined
  | null
  | string;

export default function ResetPasswordPage() {
  const [
    token,
    setToken,
  ] =
    useState<TokenState>(
      undefined
    );

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    success,
    setSuccess,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * =====================================================
   * TOKEN DA URL
   * =====================================================
   *
   * Capturamos e removemos imediatamente
   * da barra de endereço.
   */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const receivedToken =
      params
        .get("token")
        ?.trim() ??
      "";

    window.history.replaceState(
      null,
      "",
      "/redefinir-senha"
    );

    if (
      receivedToken.length <
        32 ||
      receivedToken.length >
        200 ||
      !/^[A-Za-z0-9_-]+$/.test(
        receivedToken
      )
    ) {
      setToken(null);
      return;
    }

    setToken(
      receivedToken
    );
  }, []);

  const passwordRules =
    useMemo(
      () => ({
        length:
          password.length >=
          12,

        uppercase:
          /[A-Z]/.test(
            password
          ),

        lowercase:
          /[a-z]/.test(
            password
          ),

        number:
          /\d/.test(
            password
          ),

        special:
          /[^a-zA-Z0-9]/.test(
            password
          ),
      }),
      [password]
    );

  const passwordIsValid =
    Object.values(
      passwordRules
    ).every(Boolean);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      loading ||
      !token
    ) {
      return;
    }

    setError(null);

    if (!passwordIsValid) {
      setError(
        "A nova senha ainda não atende aos requisitos de segurança."
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "As senhas não são iguais."
      );

      return;
    }

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/reset-password",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,
                password,
              }),
          }
        );

      const data =
        (await response.json()) as ResetResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Não foi possível redefinir sua senha."
        );

        return;
      }

      /*
       * Token deixa o estado depois do uso.
       */

      setToken(null);
      setPassword("");
      setConfirmPassword("");

      setSuccess(true);
    } catch {
      setError(
        "Não foi possível redefinir sua senha agora."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Ainda estamos obtendo o token.
   */

  if (
    token === undefined
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#e8dcc2] border-t-[#b98218]" />
      </main>
    );
  }

  /*
   * Sucesso.
   */

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-5 py-12">
        <section className="w-full max-w-[520px] rounded-[28px] border border-[#e8dcc2] bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2
              size={40}
            />
          </div>

          <h1 className="mt-7 text-[30px] font-extrabold text-[#20170f]">
            Senha alterada!
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-neutral-600">
            Sua senha foi atualizada
            e todas as sessões anteriores
            foram encerradas por segurança.
          </p>

          <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5 text-left">
            <div className="flex gap-4">
              <ShieldCheck
                size={22}
                className="mt-0.5 shrink-0 text-green-600"
              />

              <p className="text-[13px] leading-6 text-green-800">
                Entre novamente usando
                sua nova senha.
              </p>
            </div>
          </div>

          <Link
            href="/entrar?password=changed"
            className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#20170f] font-extrabold text-white"
          >
            Entrar na minha conta
          </Link>
        </section>
      </main>
    );
  }

  /*
   * Link ausente/inválido.
   */

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-5 py-12">
        <section className="w-full max-w-[520px] rounded-[28px] border border-[#e8dcc2] bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
            <TriangleAlert
              size={38}
            />
          </div>

          <h1 className="mt-7 text-[28px] font-extrabold text-[#20170f]">
            Link inválido
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-neutral-600">
            Este link de redefinição
            não é válido. Solicite um
            novo link para continuar.
          </p>

          <Link
            href="/esqueci-senha"
            className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] font-extrabold text-white"
          >
            Solicitar novo link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-5 py-12">
      <section className="w-full max-w-[520px] rounded-[28px] border border-[#e8dcc2] bg-white p-8 shadow-xl sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff8e8] text-[#b98218]">
          <KeyRound
            size={27}
          />
        </div>

        <h1 className="mt-6 text-[32px] font-extrabold text-[#20170f]">
          Criar nova senha
        </h1>

        <p className="mt-3 text-[15px] leading-7 text-neutral-500">
          Escolha uma senha forte
          e diferente da sua senha atual.
        </p>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-5"
        >
          {/* NOVA SENHA */}

          <label className="block">
            <span className="text-sm font-bold text-[#20170f]">
              Nova senha
            </span>

            <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218]">
              <LockKeyhole
                size={18}
                className="shrink-0 text-[#b98218]"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event
                      .target
                      .value
                  )
                }
                required
                autoComplete="new-password"
                placeholder="Nova senha"
                disabled={
                  loading
                }
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                aria-label={
                  showPassword
                    ? "Ocultar senha"
                    : "Mostrar senha"
                }
                className="text-neutral-400"
              >
                {showPassword ? (
                  <EyeOff
                    size={
                      18
                    }
                  />
                ) : (
                  <Eye
                    size={
                      18
                    }
                  />
                )}
              </button>
            </div>
          </label>

          {/* REQUISITOS */}

          <div className="grid grid-cols-1 gap-2 rounded-xl bg-[#faf9f6] p-4 text-xs sm:grid-cols-2">
            <PasswordRule
              valid={
                passwordRules.length
              }
              label="12 caracteres"
            />

            <PasswordRule
              valid={
                passwordRules.uppercase
              }
              label="Letra maiúscula"
            />

            <PasswordRule
              valid={
                passwordRules.lowercase
              }
              label="Letra minúscula"
            />

            <PasswordRule
              valid={
                passwordRules.number
              }
              label="Número"
            />

            <PasswordRule
              valid={
                passwordRules.special
              }
              label="Caractere especial"
            />
          </div>

          {/* CONFIRMAR */}

          <label className="block">
            <span className="text-sm font-bold text-[#20170f]">
              Confirmar nova senha
            </span>

            <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4">
              <LockKeyhole
                size={18}
                className="shrink-0 text-[#b98218]"
              />

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event
                      .target
                      .value
                  )
                }
                required
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                disabled={
                  loading
                }
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading
            }
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:opacity-60"
          >
            {loading
              ? "Alterando senha..."
              : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordRule({
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
      <div
        className={`flex h-4 w-4 items-center justify-center rounded-full ${
          valid
            ? "bg-green-100"
            : "bg-neutral-100"
        }`}
      >
        <Check
          size={11}
        />
      </div>

      {label}
    </div>
  );
}