"use client";

import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";

type LoginResponse = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
};

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
   * Somente caminhos internos.
   *
   * Bloqueia:
   *
   * //site-malicioso.com
   * https://site-malicioso.com
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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

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

      const data =
        (await response.json()) as LoginResponse;

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
       * A API criou o cookie HttpOnly.
       *
       * Nenhum token é armazenado em:
       *
       * localStorage
       * sessionStorage
       * JavaScript
       */

      const redirect =
        getSafeRedirect();

      window.location.replace(
        redirect
      );
    } catch {
      setError(
        "Não foi possível entrar agora. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* LADO INSTITUCIONAL */}

        <section className="relative hidden overflow-hidden bg-[#20170f] px-12 py-14 text-white lg:flex lg:items-center lg:justify-center">
          <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_1px_1px,#d9b66b_1px,transparent_0)] [background-size:32px_32px]" />

          <div className="relative max-w-[560px]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b98218] shadow-xl">
              <ShoppingBag
                size={30}
              />
            </div>

            <h1 className="mt-8 text-[44px] font-extrabold leading-tight">
              Sua conta Laico
            </h1>

            <p className="mt-5 max-w-[500px] text-[17px] leading-8 text-white/70">
              Acompanhe seus pedidos,
              entregas e informações de
              compra em um ambiente
              protegido.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#d9b66b]">
                  <ShieldCheck
                    size={20}
                  />
                </div>

                <p className="text-sm text-white/80">
                  Sessão protegida e
                  acesso exclusivo aos
                  seus pedidos.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#d9b66b]">
                  <ShoppingBag
                    size={20}
                  />
                </div>

                <p className="text-sm text-white/80">
                  Histórico de compras
                  e acompanhamento de
                  entrega.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* LOGIN */}

        <section className="flex items-center justify-center bg-white px-5 py-12 sm:px-8">
          <div className="w-full max-w-[430px]">
            <Link
              href="/"
              className="mb-10 inline-flex text-sm font-bold text-[#b98218] hover:underline"
            >
              ← Voltar para a loja
            </Link>

            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
                Área do cliente
              </p>

              <h2 className="mt-3 text-[34px] font-extrabold text-[#20170f]">
                Entre na sua conta
              </h2>

              <p className="mt-2 text-[15px] leading-6 text-neutral-500">
                Informe seu e-mail e
                senha para continuar.
              </p>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-8 space-y-5"
            >
              {/* E-MAIL */}

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
                    className="text-xs font-bold text-[#b98218] hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>

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
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    disabled={
                      loading
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
                    className="text-neutral-400 transition hover:text-[#20170f]"
                    aria-label={
                      showPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
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
                disabled={
                  loading
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
                      size={
                        18
                      }
                    />

                    Entrar

                    <ArrowRight
                      size={
                        17
                      }
                    />
                  </>
                )}
              </button>
            </form>

            {/* CADASTRO */}

            <div className="mt-8 border-t border-[#eee2cc] pt-7 text-center">
              <p className="text-sm text-neutral-500">
                Ainda não possui
                uma conta?
              </p>

              <Link
                href="/criar-conta"
                className="mt-3 inline-flex font-extrabold text-[#b98218] hover:underline"
              >
                Criar minha conta
              </Link>
            </div>

            <div className="mt-8 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <p className="text-xs leading-5 text-neutral-500">
                  Sua sessão é protegida
                  e seus pedidos somente
                  podem ser acessados
                  pela sua conta ou pelo
                  acesso seguro recebido
                  durante a compra.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}