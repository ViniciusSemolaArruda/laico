import Link from "next/link";
import { Lock, ShieldAlert } from "lucide-react";

export default function AdminAccessDeniedPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-6">
      <section className="w-full max-w-[520px] bg-white border border-[#e8dcc2] rounded-3xl p-8 shadow-xl text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-5">
          <ShieldAlert size={34} />
        </div>

        <h1 className="text-[30px] font-extrabold text-[#20170f]">
          Acesso negado
        </h1>

        <p className="text-neutral-600 mt-3 leading-relaxed">
          Você não tem permissão para acessar esta página. Para continuar,
          faça login com uma conta administrativa autorizada.
        </p>

        <Link
          href="/admin/login"
          className="mt-7 h-12 px-6 rounded-xl bg-[#b98218] text-white font-extrabold inline-flex items-center justify-center gap-2 hover:bg-[#9f6f14] transition"
        >
          <Lock size={18} />
          Fazer login
        </Link>

        <p className="text-xs text-neutral-400 mt-6">
          Área restrita do painel administrativo.
        </p>
      </section>
    </main>
  );
}