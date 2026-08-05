"use client";

import {
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

type ForgotPasswordResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

export default function ForgotPasswordPage() {
  const [
    email,
    setEmail,
  ] =
    useState("");

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
        response.status === 429
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

      setSuccess(true);
    } catch {
      setError(
        "Não foi possível processar a solicitação agora."
      );
    } finally {
      setLoading(false);
    }
  }

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
            Verifique seu e-mail
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-neutral-600">
            Se existir uma conta válida
            para o endereço informado,
            enviaremos as instruções para
            redefinir sua senha.
          </p>

          <div className="mt-7 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-5 text-left">
            <div className="flex gap-4">
              <ShieldCheck
                size={22}
                className="mt-0.5 shrink-0 text-[#b98218]"
              />

              <p className="text-[13px] leading-6 text-neutral-500">
                Por segurança, não
                informamos se determinado
                endereço possui ou não uma
                conta cadastrada.
              </p>
            </div>
          </div>

          <Link
            href="/entrar"
            className="mt-7 flex h-12 w-full items-center justify-center rounded-xl bg-[#20170f] font-extrabold text-white"
          >
            Voltar para o login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-5 py-12">
      <section className="w-full max-w-[500px] rounded-[28px] border border-[#e8dcc2] bg-white p-8 shadow-xl sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff8e8] text-[#b98218]">
          <KeyRound
            size={27}
          />
        </div>

        <h1 className="mt-6 text-[32px] font-extrabold text-[#20170f]">
          Esqueci minha senha
        </h1>

        <p className="mt-3 text-[15px] leading-7 text-neutral-500">
          Informe seu e-mail. Se
          houver uma conta válida,
          enviaremos um link seguro
          para criar uma nova senha.
        </p>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8"
        >
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

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading
            }
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#b98218] px-6 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:opacity-60"
          >
            {loading
              ? "Enviando..."
              : "Enviar instruções"}
          </button>
        </form>

        <div className="mt-7 border-t border-[#eee2cc] pt-6 text-center">
          <Link
            href="/entrar"
            className="text-sm font-bold text-[#b98218] hover:underline"
          >
            ← Voltar para o login
          </Link>
        </div>
      </section>
    </main>
  );
}