"use client";

import { Lock, Mail, ShoppingBag, Package, BarChart3, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao fazer login.");
        return;
      }

      router.push("/admin");
    } catch {
      alert("Erro ao fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] bg-[#faf9f6]">
      <section className="hidden lg:flex relative overflow-hidden bg-[#20170f] text-white items-center justify-center px-16">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,#c9a261_1px,transparent_0)] [background-size:36px_36px]" />

        <div className="relative max-w-[620px]">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#b98218] to-[#d9b66b] flex items-center justify-center shadow-xl mb-8">
            <ShoppingBag size={38} />
          </div>

          <h1 className="text-5xl font-extrabold leading-tight">
            E-commerce Laico
          </h1>

          <p className="mt-5 text-lg text-white/80 leading-relaxed">
            Painel administrativo para gerenciar produtos, categorias, pedidos,
            estoque, pagamentos e vendas do e-commerce.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Package size={20} className="text-[#d9b66b]" />
              </div>
              <p className="text-white/90">
                Cadastro e controle completo de produtos religiosos, categorias e estoque.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <BarChart3 size={20} className="text-[#d9b66b]" />
              </div>
              <p className="text-white/90">
                Acompanhamento de pedidos, vendas, pagamentos e desempenho da loja.
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck size={20} className="text-[#d9b66b]" />
              </div>
              <p className="text-white/90">
                Área segura para funcionários autorizados administrarem o sistema.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[420px]">
          <h2 className="text-[32px] font-extrabold text-[#20170f]">
            Bem-vindo de volta!
          </h2>

          <p className="text-neutral-500 text-[15px] mt-2">
            Acesse o painel administrativo da loja
          </p>

          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="text-[13px] font-bold text-[#20170f]">
                E-mail administrativo
              </span>

              <div className="mt-2 h-[48px] border border-[#e8dcc2] rounded-xl px-4 flex items-center gap-3 bg-[#faf9f6]">
                <Mail size={18} className="text-[#b98218]" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@email.com"
                  className="flex-1 outline-none bg-transparent text-[14px]"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-[#20170f]">
                Senha
              </span>

              <div className="mt-2 h-[48px] border border-[#e8dcc2] rounded-xl px-4 flex items-center gap-3 bg-[#faf9f6]">
                <Lock size={18} className="text-[#b98218]" />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  type="password"
                  className="flex-1 outline-none bg-transparent text-[14px]"
                />
              </div>
            </label>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full h-[50px] rounded-xl bg-[#b98218] hover:bg-[#9f6f14] transition text-white font-extrabold shadow-lg disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar no Painel"}
            </button>
          </div>

          <div className="mt-7 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-5">
            <h3 className="text-[13px] font-extrabold text-[#20170f] uppercase tracking-wider">
              Acesso administrativo
            </h3>

            <p className="text-[13px] text-neutral-500 mt-2 leading-relaxed">
              Use apenas contas autorizadas para gerenciar produtos, pedidos,
              estoque e informações comerciais da loja.
            </p>
          </div>

          <p className="text-center text-[12px] text-neutral-400 mt-8">
            E-commerce Laico · Painel Administrativo
          </p>
        </div>
      </section>
    </main>
  );
}