"use client";

import {
  BarChart3,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import {
  type FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type LoginResponse = {
  success?: boolean;
  error?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !password
    ) {
      setErrorMessage(
        "Preencha o e-mail e a senha."
      );

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response =
        await fetch(
          "/api/admin/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials: "same-origin",

            cache: "no-store",

            body: JSON.stringify({
              email:
                normalizedEmail,

              password,
            }),
          }
        );

      const data =
        (await response
          .json()
          .catch(() => ({}))) as LoginResponse;

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            "E-mail ou senha inválidos."
        );

        return;
      }

      /*
       * O cookie administrativo é criado
       * exclusivamente pela API.
       *
       * A página não recebe nem armazena o JWT.
       */
      router.replace("/admin");
      router.refresh();
    } catch {
      setErrorMessage(
        "Não foi possível entrar. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#faf9f6] lg:grid-cols-[1.7fr_1fr]">
      <section className="relative hidden items-center justify-center overflow-hidden bg-[#20170f] px-16 text-white lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,#c9a261_1px,transparent_0)] [background-size:36px_36px] opacity-20"
        />

        <div className="relative max-w-[620px]">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#b98218] to-[#d9b66b] shadow-xl">
            <ShoppingBag
              size={38}
              aria-hidden="true"
            />
          </div>

          <h1 className="text-5xl font-extrabold leading-tight">
            E-commerce Laico
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-white/80">
            Painel administrativo para
            gerenciar produtos, categorias,
            pedidos, estoque, pagamentos e
            vendas do e-commerce.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Package
                  size={20}
                  className="text-[#d9b66b]"
                  aria-hidden="true"
                />
              </div>

              <p className="text-white/90">
                Cadastro e controle completo
                de produtos, categorias e
                estoque.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <BarChart3
                  size={20}
                  className="text-[#d9b66b]"
                  aria-hidden="true"
                />
              </div>

              <p className="text-white/90">
                Acompanhamento de pedidos,
                vendas, pagamentos e desempenho
                da loja.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck
                  size={20}
                  className="text-[#d9b66b]"
                  aria-hidden="true"
                />
              </div>

              <p className="text-white/90">
                Área segura para funcionários
                autorizados administrarem o
                sistema.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-[420px]">
          <h2 className="text-[32px] font-extrabold text-[#20170f]">
            Bem-vindo de volta!
          </h2>

          <p className="mt-2 text-[15px] text-neutral-500">
            Acesse o painel administrativo da
            loja
          </p>

          <form
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
            noValidate
          >
            <label className="block">
              <span className="text-[13px] font-bold text-[#20170f]">
                E-mail administrativo
              </span>

              <div className="mt-2 flex h-[48px] items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218] focus-within:ring-2 focus-within:ring-[#b98218]/15">
                <Mail
                  size={18}
                  className="text-[#b98218]"
                  aria-hidden="true"
                />

                <input
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={loading}
                  placeholder="admin@email.com"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none disabled:cursor-not-allowed"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-[#20170f]">
                Senha
              </span>

              <div className="mt-2 flex h-[48px] items-center gap-3 rounded-xl border border-[#e8dcc2] bg-[#faf9f6] px-4 focus-within:border-[#b98218] focus-within:ring-2 focus-within:ring-[#b98218]/15">
                <Lock
                  size={18}
                  className="text-[#b98218]"
                  aria-hidden="true"
                />

                <input
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="Digite sua senha"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none disabled:cursor-not-allowed"
                />
              </div>
            </label>

            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !email.trim() ||
                !password
              }
              className="h-[50px] w-full rounded-xl bg-[#b98218] font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Entrando..."
                : "Entrar no Painel"}
            </button>
          </form>

          <div className="mt-7 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-5">
            <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-[#20170f]">
              Acesso administrativo
            </h3>

            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              Use apenas contas autorizadas
              para gerenciar produtos, pedidos,
              estoque e informações comerciais
              da loja.
            </p>
          </div>

          <p className="mt-8 text-center text-[12px] text-neutral-400">
            E-commerce Laico · Painel
            Administrativo
          </p>
        </div>
      </section>
    </main>
  );
}