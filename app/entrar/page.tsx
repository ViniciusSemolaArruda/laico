"use client";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  MailWarning,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import Footer from "@/components/Footer";
import Header2 from "@/components/Header2";

type LoginResponse = {
  success?: boolean;
  error?: string;
  code?: string;

  requiresEmailVerification?:
    boolean;

  redirectTo?: string;
};

type ResendResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

/*
 * =========================================================
 * REDIRECT SEGURO
 * =========================================================
 */

function getSafeRedirect() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "/minha-conta";
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const redirect =
    params.get(
      "redirect"
    );

  /*
   * Permitimos somente caminhos internos.
   */

  if (
    !redirect ||
    !redirect.startsWith(
      "/"
    ) ||
    redirect.startsWith(
      "//"
    ) ||
    redirect.startsWith(
      "/api/"
    )
  ) {
    return "/minha-conta";
  }

  return redirect;
}

export default function CustomerLoginPage() {
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

  /*
   * =======================================================
   * CONFIRMAÇÃO DE E-MAIL
   * =======================================================
   */

  const [
    requiresEmailVerification,
    setRequiresEmailVerification,
  ] =
    useState(false);

  const [
    resending,
    setResending,
  ] =
    useState(false);

  const [
    resendMessage,
    setResendMessage,
  ] =
    useState<string | null>(
      null
    );

  const [
    resendError,
    setResendError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * =======================================================
   * ALTERAR E-MAIL
   * =======================================================
   *
   * Se o usuário mudar o endereço depois de receber
   * o aviso, removemos o estado anterior.
   */

  function handleEmailChange(
    value: string
  ) {
    setEmail(
      value
    );

    setError(
      null
    );

    setRequiresEmailVerification(
      false
    );

    setResendMessage(
      null
    );

    setResendError(
      null
    );
  }

  /*
   * =======================================================
   * LOGIN
   * =======================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      loading ||
      resending
    ) {
      return;
    }

    setLoading(
      true
    );

    setError(
      null
    );

    setRequiresEmailVerification(
      false
    );

    setResendMessage(
      null
    );

    setResendError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/auth/login",
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
                email,
                password,
              }),
          }
        );

      let data:
        LoginResponse = {};

      try {
        data =
          (await response.json()) as LoginResponse;
      } catch {
        // Tratado abaixo.
      }

      /*
       * ===================================================
       * E-MAIL NÃO CONFIRMADO
       * ===================================================
       *
       * A API só retorna este código depois de
       * confirmar que a senha informada está correta.
       */

      if (
        response.status ===
          403 &&
        data.code ===
          "EMAIL_NOT_VERIFIED" &&
        data.requiresEmailVerification
      ) {
        /*
         * A senha não é mais necessária.
         *
         * Removemos imediatamente do estado.
         */

        setPassword(
          ""
        );

        setShowPassword(
          false
        );

        setRequiresEmailVerification(
          true
        );

        return;
      }

      /*
       * ===================================================
       * ERRO NORMAL
       * ===================================================
       */

      if (
        !response.ok ||
        !data.success
      ) {
        setError(
          data.error ||
            "Não foi possível entrar."
        );

        return;
      }

      /*
       * ===================================================
       * LOGIN REALIZADO
       * ===================================================
       *
       * O servidor criou a sessão HttpOnly.
       *
       * Nenhum token é armazenado em:
       *
       * - localStorage;
       * - sessionStorage;
       * - JavaScript.
       */

      setPassword(
        ""
      );

      setShowPassword(
        false
      );

      const redirect =
        getSafeRedirect();

      window.location.replace(
        redirect
      );
    } catch {
      setPassword(
        ""
      );

      setShowPassword(
        false
      );

      setError(
        "Não foi possível entrar agora. Tente novamente."
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * =======================================================
   * REENVIAR CONFIRMAÇÃO
   * =======================================================
   */

  async function handleResendVerification() {
    if (
      resending ||
      loading
    ) {
      return;
    }

    setResending(
      true
    );

    setResendMessage(
      null
    );

    setResendError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/auth/resend-verification",
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
                email,
              }),
          }
        );

      let data:
        ResendResponse = {};

      try {
        data =
          (await response.json()) as ResendResponse;
      } catch {
        // Tratado abaixo.
      }

      /*
       * Rate limit.
       */

      if (
        response.status ===
        429
      ) {
        setResendError(
          data.error ||
            "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente."
        );

        return;
      }

      if (
        !response.ok
      ) {
        setResendError(
          data.error ||
            "Não foi possível reenviar o e-mail agora."
        );

        return;
      }

      /*
       * A API utiliza uma resposta genérica,
       * justamente para não revelar contas.
       */

      setResendMessage(
        data.message ||
          "Se existir uma conta aguardando confirmação para este e-mail, enviaremos um novo link."
      );
    } catch {
      setResendError(
        "Não foi possível reenviar o e-mail agora. Tente novamente."
      );
    } finally {
      setResending(
        false
      );
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f4efe6]">
      {/* HEADER */}

      <Header2 />

      {/* CONTEÚDO */}

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="w-full max-w-[560px]">
          {/* CARD */}

          <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-[0_12px_40px_rgba(58,42,18,0.08)] sm:rounded-[28px]">
            {/* CABEÇALHO */}

            <div className="border-b border-[#eee2cc] bg-gradient-to-b from-[#fffdf8] to-white px-5 py-6 text-center sm:px-9 sm:py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                <LogIn
                  size={23}
                />
              </div>

              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
                Área do cliente
              </p>

              <h1 className="mt-2 text-[27px] font-extrabold leading-tight text-[#20170f] sm:text-[34px]">
                Entre na sua conta
              </h1>

              <p className="mx-auto mt-2 max-w-[390px] text-sm leading-6 text-neutral-500">
                Informe seu e-mail
                e senha para acessar
                seus pedidos e sua
                conta.
              </p>
            </div>

            {/* FORMULÁRIO */}

            <div className="px-5 py-6 sm:px-9 sm:py-8">
              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >
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
                      value={
                        email
                      }
                      onChange={(
                        event
                      ) =>
                        handleEmailChange(
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
                        loading ||
                        resending
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
                    />
                  </div>
                </label>

                {/* SENHA */}

                <label className="block">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-[#20170f]">
                      Senha
                    </span>

                    <Link
                      href="/esqueci-senha"
                      className="text-right text-xs font-bold text-[#b98218] transition hover:underline"
                    >
                      Esqueci minha
                      senha
                    </Link>
                  </div>

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
                        password
                      }
                      onChange={(
                        event
                      ) => {
                        setPassword(
                          event
                            .target
                            .value
                        );

                        setError(
                          null
                        );
                      }}
                      required
                      maxLength={
                        72
                      }
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      disabled={
                        loading ||
                        resending
                      }
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:opacity-60"
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

                {/* ERRO NORMAL */}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* EMAIL NÃO CONFIRMADO */}

                {requiresEmailVerification && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                        <MailWarning
                          size={19}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <strong className="block text-sm text-amber-900">
                          Confirme seu
                          e-mail para
                          continuar
                        </strong>

                        <p className="mt-1 text-xs leading-5 text-amber-800/80">
                          Sua senha está
                          correta, mas sua
                          conta ainda não
                          foi ativada.
                          Confira sua caixa
                          de entrada e
                          também a pasta de
                          spam.
                        </p>

                        {/* SUCESSO DO REENVIO */}

                        {resendMessage && (
                          <div
                            role="status"
                            className="mt-3 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs leading-5 text-green-700"
                          >
                            <CheckCircle2
                              size={16}
                              className="mt-0.5 shrink-0"
                            />

                            <span>
                              {
                                resendMessage
                              }
                            </span>
                          </div>
                        )}

                        {/* ERRO DO REENVIO */}

                        {resendError && (
                          <div
                            role="alert"
                            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700"
                          >
                            {
                              resendError
                            }
                          </div>
                        )}

                        {/* REENVIAR */}

                        <button
                          type="button"
                          onClick={
                            handleResendVerification
                          }
                          disabled={
                            resending ||
                            loading
                          }
                          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw
                            size={15}
                            className={
                              resending
                                ? "animate-spin"
                                : ""
                            }
                          />

                          {resending
                            ? "Reenviando..."
                            : "Reenviar e-mail de confirmação"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ENTRAR */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    resending
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b98218] px-6 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn
                        size={18}
                      />

                      Entrar

                      <ArrowRight
                        size={17}
                      />
                    </>
                  )}
                </button>
              </form>

              {/* CADASTRO */}

              <div className="mt-7 border-t border-[#eee2cc] pt-6 text-center">
                <p className="text-sm text-neutral-500">
                  Ainda não possui
                  uma conta?
                </p>

                <Link
                  href="/criar-conta"
                  className="mt-2 inline-flex font-extrabold text-[#b98218] transition hover:underline"
                >
                  Cadastre-se
                </Link>
              </div>

              {/* SEGURANÇA */}

              <div className="mt-6 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <p className="text-xs leading-5 text-neutral-500">
                    Sua sessão é
                    protegida e seus
                    pedidos somente
                    podem ser acessados
                    pela sua conta ou
                    pelo acesso seguro
                    recebido durante uma
                    compra como
                    visitante.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* VOLTAR */}

          <div className="mt-5 text-center">
            <Link
              href="/"
              className="text-sm font-bold text-[#b98218] transition hover:underline"
            >
              Voltar para a loja
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}

      <Footer />
    </main>
  );
}