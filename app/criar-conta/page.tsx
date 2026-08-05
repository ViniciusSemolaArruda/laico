"use client";

import {
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Link from "next/link";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

type RegisterResponse = {
  success?: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
  error?: string;
};

export default function CreateAccountPage() {
  const [
    name,
    setName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

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
    useState(false);

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

    if (loading) {
      return;
    }

    setError(null);

    if (
      name.trim().length <
      2
    ) {
      setError(
        "Informe seu nome completo."
      );

      return;
    }

    if (!passwordIsValid) {
      setError(
        "Sua senha ainda não atende aos requisitos de segurança."
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
          "/api/auth/register",
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
                name,
                email,
                password,
              }),
          }
        );

      const data =
        (await response.json()) as RegisterResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Não foi possível criar sua conta."
        );

        return;
      }

      /*
       * Senhas deixam o estado do componente
       * depois que o servidor aceitou o cadastro.
       */
      setPassword("");
      setConfirmPassword("");

      setSuccess(true);
    } catch {
      setError(
        "Não foi possível criar sua conta agora. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-5 py-12">
        <section className="w-full max-w-[560px] rounded-[28px] border border-[#e8dcc2] bg-white p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
            <CheckCircle2
              size={40}
            />
          </div>

          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
            Cadastro recebido
          </p>

          <h1 className="mt-3 text-[30px] font-extrabold text-[#20170f]">
            Verifique seu e-mail
          </h1>

          <p className="mx-auto mt-4 max-w-[430px] text-[15px] leading-7 text-neutral-600">
            Se o endereço informado
            puder ser cadastrado,
            enviaremos um link para
            confirmar sua conta.
          </p>

          <div className="mt-7 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-5 text-left">
            <div className="flex gap-4">
              <Mail
                size={23}
                className="mt-0.5 shrink-0 text-[#b98218]"
              />

              <div>
                <strong className="text-sm text-[#20170f]">
                  Confira sua caixa de entrada
                </strong>

                <p className="mt-1 text-[13px] leading-6 text-neutral-500">
                  O link de confirmação
                  possui validade limitada.
                  Verifique também sua pasta
                  de spam.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/entrar"
            className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#20170f] px-6 font-extrabold text-white transition hover:bg-[#38291d]"
          >
            Ir para o login
          </Link>

          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-bold text-[#b98218] hover:underline"
          >
            Voltar para a loja
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* APRESENTAÇÃO */}

        <section className="relative hidden overflow-hidden bg-[#20170f] px-12 py-14 text-white lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_1px_1px,#d9b66b_1px,transparent_0)] [background-size:32px_32px]" />

          <div className="relative max-w-[560px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b98218] shadow-xl">
              <UserRound
                size={30}
              />
            </div>

            <h1 className="mt-8 text-[44px] font-extrabold leading-tight">
              Crie sua conta
            </h1>

            <p className="mt-5 max-w-[500px] text-[17px] leading-8 text-white/70">
              Tenha seus pedidos,
              informações e entregas
              reunidos em uma área
              protegida.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#d9b66b]">
                  <ShieldCheck
                    size={20}
                  />
                </div>

                <p className="text-sm text-white/80">
                  Confirmação obrigatória
                  do seu endereço de
                  e-mail.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#d9b66b]">
                  <CheckCircle2
                    size={20}
                  />
                </div>

                <p className="text-sm text-white/80">
                  Compras anteriores
                  aparecem somente depois
                  da confirmação.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FORMULÁRIO */}

        <section className="flex items-center justify-center bg-white px-5 py-12 sm:px-8">
          <div className="w-full max-w-[450px]">
            <Link
              href="/"
              className="mb-8 inline-flex text-sm font-bold text-[#b98218] hover:underline"
            >
              ← Voltar para a loja
            </Link>

            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
              Área do cliente
            </p>

            <h2 className="mt-3 text-[34px] font-extrabold text-[#20170f]">
              Criar minha conta
            </h2>

            <p className="mt-2 text-[15px] leading-6 text-neutral-500">
              Preencha seus dados para
              começar.
            </p>

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-8 space-y-5"
            >
              {/* NOME */}

              <label className="block">
                <span className="text-sm font-bold text-[#20170f]">
                  Nome completo
                </span>

                <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218]">
                  <UserRound
                    size={18}
                    className="shrink-0 text-[#b98218]"
                  />

                  <input
                    value={
                      name
                    }
                    onChange={(
                      event
                    ) =>
                      setName(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    maxLength={
                      120
                    }
                    autoComplete="name"
                    placeholder="Seu nome completo"
                    disabled={
                      loading
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              {/* EMAIL */}

              <label className="block">
                <span className="text-sm font-bold text-[#20170f]">
                  E-mail
                </span>

                <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218]">
                  <Mail
                    size={18}
                    className="shrink-0 text-[#b98218]"
                  />

                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event
                          .target
                          .value
                      )
                    }
                    required
                    maxLength={
                      254
                    }
                    autoComplete="email"
                    inputMode="email"
                    placeholder="seu@email.com"
                    disabled={
                      loading
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              {/* SENHA */}

              <label className="block">
                <span className="text-sm font-bold text-[#20170f]">
                  Senha
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
                    placeholder="Crie uma senha forte"
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
                    className="text-neutral-400 hover:text-[#20170f]"
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

              {/* CONFIRMAÇÃO */}

              <label className="block">
                <span className="text-sm font-bold text-[#20170f]">
                  Confirmar senha
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
                    placeholder="Digite novamente"
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
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] px-6 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Criando conta..."
                  : "Criar minha conta"}
              </button>
            </form>

            <div className="mt-7 border-t border-[#eee2cc] pt-6 text-center">
              <p className="text-sm text-neutral-500">
                Já possui uma conta?
              </p>

              <Link
                href="/entrar"
                className="mt-2 inline-flex font-extrabold text-[#b98218] hover:underline"
              >
                Entrar
              </Link>
            </div>
          </div>
        </section>
      </div>
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
            ? "bg-green--100"
            : "bg-neutral-100"
        }`}
      >
        <Check
          size={11}
        />
      </div>

      <span>
        {label}
      </span>
    </div>
  );
}