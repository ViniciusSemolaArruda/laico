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

import Footer from "@/components/Footer";
import Header2 from "@/components/Header2";

type RegisterResponse = {
  success?: boolean;
  requiresEmailVerification?: boolean;
  message?: string;
  error?: string;
};

export default function CreateAccountPage() {
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState(false);

  /*
   * =======================================================
   * REQUISITOS DA SENHA
   * =======================================================
   */

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

  /*
   * =======================================================
   * CADASTRO
   * =======================================================
   */

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
       * Remove as senhas da memória
       * depois que o cadastro foi aceito.
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

  /*
   * =======================================================
   * CADASTRO RECEBIDO / VERIFICAR EMAIL
   * =======================================================
   */

  if (success) {
    return (
      <main className="flex min-h-screen flex-col bg-[#f4efe6]">
        <Header2 />

        <div className="flex flex-1 items-center justify-center px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
          {/*
           * Container responsivo.
           *
           * Desktop: máximo 460px.
           * Mobile: respeita toda a largura disponível.
           */}

          <section className="w-full max-w-[460px] rounded-2xl border border-[#e8dcc2] bg-white px-5 py-6 text-center shadow-[0_12px_40px_rgba(58,42,18,0.08)] sm:rounded-[24px] sm:px-7 sm:py-7">
            {/* ÍCONE */}

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600 sm:h-16 sm:w-16">
              <CheckCircle2
                size={32}
              />
            </div>

            {/* TÍTULO */}

            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.17em] text-[#b98218] sm:text-[11px]">
              Cadastro recebido
            </p>

            <h1 className="mt-2 text-[25px] font-extrabold leading-tight text-[#20170f] sm:text-[29px]">
              Verifique seu e-mail
            </h1>

            <p className="mx-auto mt-3 max-w-[370px] text-[13px] leading-6 text-neutral-600 sm:text-sm">
              Se o endereço informado
              puder ser cadastrado,
              enviaremos um link para
              confirmar sua conta.
            </p>

            {/* CAIXA DE ENTRADA */}

            <div className="mt-5 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8e8] text-[#b98218]">
                  <Mail
                    size={18}
                  />
                </div>

                <div className="min-w-0">
                  <strong className="block text-[13px] text-[#20170f] sm:text-sm">
                    Confira sua caixa
                    de entrada
                  </strong>

                  <p className="mt-1 text-xs leading-5 text-neutral-500 sm:text-[13px]">
                    O link de confirmação
                    possui validade
                    limitada. Verifique
                    também sua pasta de
                    spam.
                  </p>
                </div>
              </div>
            </div>

            {/* LOGIN */}

            <Link
              href="/entrar"
              className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-[#b98218] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#9f6f14]"
            >
              Ir para o login
            </Link>

            {/* VOLTAR */}

            <Link
              href="/"
              className="mt-4 inline-flex text-xs font-bold text-[#b98218] transition hover:underline sm:text-sm"
            >
              Voltar para a loja
            </Link>
          </section>
        </div>

        <Footer />
      </main>
    );
  }

  /*
   * =======================================================
   * FORMULÁRIO DE CADASTRO
   * =======================================================
   */

  return (
    <main className="flex min-h-screen flex-col bg-[#f4efe6]">
      <Header2 />

      <div className="flex flex-1 justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="w-full max-w-[620px]">
          {/* CARD */}

          <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-[0_12px_40px_rgba(58,42,18,0.08)] sm:rounded-[28px]">
            {/* TOPO */}

            <div className="border-b border-[#eee2cc] bg-gradient-to-b from-[#fffdf8] to-white px-5 py-6 text-center sm:px-9 sm:py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                <UserRound
                  size={23}
                />
              </div>

              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
                Área do cliente
              </p>

              <h1 className="mt-2 text-[27px] font-extrabold leading-tight text-[#20170f] sm:text-[34px]">
                Criar minha conta
              </h1>

              <p className="mx-auto mt-2 max-w-[420px] text-sm leading-6 text-neutral-500">
                Crie sua conta para
                acompanhar seus pedidos,
                endereços e entregas.
              </p>
            </div>

            {/* CONTEÚDO */}

            <div className="px-5 py-6 sm:px-9 sm:py-8">
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >
                {/* NOME */}

                <label className="block">
                  <span className="text-sm font-bold text-[#20170f]">
                    Nome completo
                  </span>

                  <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 transition focus-within:border-[#b98218] focus-within:bg-white">
                    <UserRound
                      size={18}
                      className="shrink-0 text-[#b98218]"
                    />

                    <input
                      value={name}
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
                      maxLength={120}
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

                  <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 transition focus-within:border-[#b98218] focus-within:bg-white">
                    <Mail
                      size={18}
                      className="shrink-0 text-[#b98218]"
                    />

                    <input
                      type="email"
                      value={email}
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
                      maxLength={254}
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

                  <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 transition focus-within:border-[#b98218] focus-within:bg-white">
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
                      value={password}
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
                      className="shrink-0 text-neutral-400 transition hover:text-[#20170f]"
                    >
                      {showPassword ? (
                        <EyeOff
                          size={18}
                        />
                      ) : (
                        <Eye
                          size={18}
                        />
                      )}
                    </button>
                  </div>
                </label>

                {/* REQUISITOS */}

                <div className="rounded-xl border border-[#eee2cc] bg-[#faf9f6] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck
                      size={16}
                      className="text-[#b98218]"
                    />

                    <strong className="text-xs text-[#20170f]">
                      Sua senha
                      precisa ter:
                    </strong>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-xs min-[420px]:grid-cols-2">
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
                </div>

                {/* CONFIRMAR SENHA */}

                <label className="block">
                  <span className="text-sm font-bold text-[#20170f]">
                    Confirmar senha
                  </span>

                  <div className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 transition focus-within:border-[#b98218] focus-within:bg-white">
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

                    {confirmPassword &&
                      confirmPassword ===
                        password &&
                      passwordIsValid && (
                        <CheckCircle2
                          size={18}
                          className="shrink-0 text-green-600"
                        />
                      )}
                  </div>
                </label>

                {/* ERRO */}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* BOTÃO */}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] px-6 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Criando conta..."
                    : "Criar minha conta"}
                </button>
              </form>

              {/* LOGIN */}

              <div className="mt-7 border-t border-[#eee2cc] pt-6 text-center">
                <p className="text-sm text-neutral-500">
                  Já possui uma
                  conta?
                </p>

                <Link
                  href="/entrar"
                  className="mt-2 inline-flex font-extrabold text-[#b98218] transition hover:underline"
                >
                  Faça login
                </Link>
              </div>
            </div>
          </section>

          {/* SEGURANÇA */}

          <div className="mt-5 flex items-center justify-center gap-2 px-4 text-center text-[11px] leading-5 text-neutral-500 sm:text-xs">
            <ShieldCheck
              size={15}
              className="shrink-0 text-green-600"
            />

            Seus dados são
            protegidos e sua senha
            nunca é armazenada em
            texto puro.
          </div>
        </div>
      </div>

      <Footer />
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
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          valid
            ? "bg-green-100"
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