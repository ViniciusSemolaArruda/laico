"use client";

import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import Footer from "@/components/Footer";
import Header2 from "@/components/Header2";

type ForgotPasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export default function ForgotPasswordPage() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  /*
   * =======================================================
   * RECUPERAÇÃO
   * =======================================================
   */

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
          "/api/auth/forgot-password",
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

      const data =
        (await response.json()) as ForgotPasswordResponse;

      if (
        response.status ===
        429
      ) {
        setError(
          data.error ||
            "Muitas solicitações. Tente novamente mais tarde."
        );

        return;
      }

      if (!response.ok) {
        setError(
          "Não foi possível processar a solicitação."
        );

        return;
      }

      /*
       * Não usamos a resposta para revelar
       * se o endereço está cadastrado.
       */
      setSuccess(true);
    } catch {
      setError(
        "Não foi possível processar a solicitação agora."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =======================================================
   * SUCESSO
   * =======================================================
   */

  if (success) {
    return (
      <main className="flex min-h-screen flex-col bg-[#f4efe6]">
        <Header2 />

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
          <section className="w-full max-w-[560px] rounded-2xl border border-[#e8dcc2] bg-white p-6 text-center shadow-[0_12px_40px_rgba(58,42,18,0.08)] sm:rounded-[28px] sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600 sm:h-20 sm:w-20">
              <CheckCircle2
                size={40}
              />
            </div>

            <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b98218] sm:text-xs">
              Solicitação recebida
            </p>

            <h1 className="mt-3 text-[27px] font-extrabold leading-tight text-[#20170f] sm:text-[32px]">
              Verifique seu
              e-mail
            </h1>

            <p className="mx-auto mt-4 max-w-[440px] text-sm leading-7 text-neutral-600 sm:text-[15px]">
              Se existir uma
              conta válida para o
              endereço informado,
              enviaremos as
              instruções para
              redefinir sua senha.
            </p>

            {/* AVISO DE SEGURANÇA */}

            <div className="mt-7 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-4 text-left sm:p-5">
              <div className="flex gap-4">
                <ShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0 text-[#b98218]"
                />

                <div>
                  <strong className="text-sm text-[#20170f]">
                    Sua privacidade
                    está protegida
                  </strong>

                  <p className="mt-1 text-[13px] leading-6 text-neutral-500">
                    Por segurança,
                    não informamos
                    se determinado
                    endereço possui
                    ou não uma conta
                    cadastrada.
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/entrar"
              className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] px-6 font-extrabold text-white transition hover:bg-[#9f6f14]"
            >
              Voltar para o login
            </Link>

            <Link
              href="/"
              className="mt-5 inline-flex text-sm font-bold text-[#b98218] transition hover:underline"
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
   * FORMULÁRIO
   * =======================================================
   */

  return (
    <main className="flex min-h-screen flex-col bg-[#f4efe6]">
      {/* HEADER SIMPLIFICADO */}

      <Header2 />

      {/* CONTEÚDO */}

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="w-full max-w-[560px]">
          {/* CARD */}

          <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-[0_12px_40px_rgba(58,42,18,0.08)] sm:rounded-[28px]">
            {/* CABEÇALHO */}

            <div className="border-b border-[#eee2cc] bg-gradient-to-b from-[#fffdf8] to-white px-5 py-6 text-center sm:px-9 sm:py-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff8e8] text-[#b98218]">
                <KeyRound
                  size={23}
                />
              </div>

              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
                Recuperar acesso
              </p>

              <h1 className="mt-2 text-[27px] font-extrabold leading-tight text-[#20170f] sm:text-[34px]">
                Esqueci minha
                senha
              </h1>

              <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-neutral-500">
                Informe seu e-mail.
                Se houver uma conta
                válida, enviaremos um
                link seguro para criar
                uma nova senha.
              </p>
            </div>

            {/* CONTEÚDO */}

            <div className="px-5 py-6 sm:px-9 sm:py-8">
              <form
                onSubmit={
                  handleSubmit
                }
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

                {/* ERRO */}

                {error && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
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
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] px-6 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                      Enviando...
                    </span>
                  ) : (
                    "Enviar instruções"
                  )}
                </button>
              </form>

              {/* VOLTAR LOGIN */}

              <div className="mt-7 border-t border-[#eee2cc] pt-6 text-center">
                <Link
                  href="/entrar"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#b98218] transition hover:underline"
                >
                  <ArrowLeft
                    size={15}
                  />

                  Voltar para o
                  login
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
                    O link de
                    redefinição possui
                    validade limitada e
                    só pode ser usado
                    uma vez.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* VOLTAR LOJA */}

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