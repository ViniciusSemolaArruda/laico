"use client";

import Link from "next/link";
import {
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type Props = {
  token: string;
};

type VerificationStatus =
  | "loading"
  | "success"
  | "error";

type VerificationResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
};

export default function VerifyEmailClient({
  token,
}: Props) {
  const startedRef =
    useRef(false);

  const [
    status,
    setStatus,
  ] =
    useState<VerificationStatus>(
      "loading"
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "Estamos validando seu endereço de e-mail."
    );

  useEffect(() => {
    /*
     * React pode executar effects novamente
     * durante o desenvolvimento.
     *
     * Como o token é de uso único, impedimos
     * uma segunda chamada.
     */
    if (
      startedRef.current
    ) {
      return;
    }

    startedRef.current =
      true;

    /*
     * Remove imediatamente o token da barra
     * de endereço e do histórico atual.
     *
     * O valor continua disponível somente
     * nesta instância do componente.
     */
    if (
      typeof window !==
      "undefined"
    ) {
      window.history.replaceState(
        null,
        "",
        "/verificar-email"
      );
    }

    async function verify() {
      if (
        !token ||
        token.length < 32
      ) {
        setStatus(
          "error"
        );

        setMessage(
          "Este link de confirmação é inválido ou expirou."
        );

        return;
      }

      try {
        const response =
          await fetch(
            "/api/auth/verify-email",
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
                }),
            }
          );

        const data =
          (await response.json()) as VerificationResponse;

        if (
          !response.ok ||
          !data.success
        ) {
          setStatus(
            "error"
          );

          setMessage(
            data.error ||
              "Este link de confirmação é inválido ou expirou."
          );

          return;
        }

        setStatus(
          "success"
        );

        setMessage(
          "Seu e-mail foi confirmado e sua conta está pronta para uso."
        );

        /*
         * A API já criou a sessão HttpOnly.
         *
         * Depois de uma pequena pausa, levamos
         * o usuário para Minha Conta.
         */
        window.setTimeout(
          () => {
            window.location.replace(
              data.redirectTo ||
                "/minha-conta"
            );
          },
          1800
        );
      } catch {
        setStatus(
          "error"
        );

        setMessage(
          "Não foi possível confirmar seu e-mail agora. Tente novamente."
        );
      }
    }

    void verify();
  }, [token]);

  return (
    <main className="min-h-screen bg-[#f4efe6] px-5 py-12 flex items-center justify-center">
      <section className="w-full max-w-[560px]">
        <div className="rounded-[28px] border border-[#e8dcc2] bg-white p-7 shadow-xl sm:p-10">
          <div className="mb-8 flex justify-center">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full ${
                status ===
                "success"
                  ? "bg-green-50 text-green-600"
                  : status ===
                      "error"
                    ? "bg-red-50 text-red-600"
                    : "bg-[#fff8e8] text-[#b98218]"
              }`}
            >
              {status ===
              "loading" ? (
                <LoaderCircle
                  size={36}
                  className="animate-spin"
                />
              ) : status ===
                "success" ? (
                <CheckCircle2
                  size={38}
                />
              ) : (
                <TriangleAlert
                  size={36}
                />
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b98218]">
              E-commerce Laico
            </p>

            <h1 className="mt-3 text-[28px] font-extrabold text-[#20170f] sm:text-[34px]">
              {status ===
              "loading"
                ? "Confirmando seu e-mail"
                : status ===
                    "success"
                  ? "E-mail confirmado!"
                  : "Não foi possível confirmar"}
            </h1>

            <p className="mx-auto mt-4 max-w-[430px] text-[15px] leading-7 text-neutral-600">
              {message}
            </p>
          </div>

          {status ===
            "loading" && (
            <div className="mt-8 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-5">
              <div className="flex items-start gap-4">
                <MailCheck
                  size={23}
                  className="mt-0.5 shrink-0 text-[#b98218]"
                />

                <div>
                  <strong className="text-sm text-[#20170f]">
                    Verificação segura
                  </strong>

                  <p className="mt-1 text-[13px] leading-6 text-neutral-500">
                    Aguarde alguns segundos enquanto
                    verificamos a validade do seu link.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status ===
            "success" && (
            <>
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5">
                <div className="flex items-start gap-4">
                  <ShieldCheck
                    size={23}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div>
                    <strong className="text-sm text-green-900">
                      Conta ativada
                    </strong>

                    <p className="mt-1 text-[13px] leading-6 text-green-800">
                      Agora você poderá acessar sua
                      conta e acompanhar seus pedidos
                      com segurança.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-neutral-400">
                Redirecionando para sua conta...
              </p>
            </>
          )}

          {status ===
            "error" && (
            <div className="mt-8">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="text-[13px] leading-6 text-red-800">
                  O link pode ter expirado, já ter sido
                  utilizado ou não ser mais válido.
                </p>
              </div>

              <Link
                href="/"
                className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#20170f] px-6 text-sm font-extrabold text-white transition hover:bg-[#38291d]"
              >
                Voltar para a loja
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Sua segurança e privacidade são
          importantes para nós.
        </p>
      </section>
    </main>
  );
}