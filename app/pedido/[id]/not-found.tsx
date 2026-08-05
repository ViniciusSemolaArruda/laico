import Link from "next/link";

import {
  ArrowLeft,
  ShieldX,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

export default function OrderAccessDeniedPage() {
  return (
    <>
      <Header />

      <main className="flex min-h-[70vh] items-center justify-center bg-[#faf9f6] px-5 py-16">
        <section className="w-full max-w-[620px] rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm md:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldX
              size={40}
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </div>

          <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.16em] text-red-600">
            Acesso negado
          </p>

          <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-[#20170f] md:text-[38px]">
            Você não tem permissão para fazer isso!
          </h1>

          <p className="mx-auto mt-4 max-w-[480px] text-[15px] leading-relaxed text-neutral-600">
            Não foi possível autorizar o acesso
            a este pedido. Confira se você está
            utilizando o mesmo navegador em que
            realizou a compra.
          </p>

          <div className="mt-8 rounded-2xl border border-[#e8dcc2] bg-[#faf9f6] p-4 text-sm text-neutral-600">
            Por segurança, nenhuma informação
            sobre o pedido foi exibida.
          </div>

          <Link
            href="/"
            className="mx-auto mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-6 font-extrabold text-white shadow-lg transition hover:bg-[#9f6f14]"
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
            />

            Voltar para a loja
          </Link>
        </section>
      </main>

      <Footer />
    </>
  );
}