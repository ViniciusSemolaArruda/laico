import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

type InstitutionalPageProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
  updatedAt?: string;
};

export default function InstitutionalPage({
  eyebrow = "Central de informações",
  title,
  description,
  children,
  updatedAt,
}: InstitutionalPageProps) {
  return (
    <main className="min-h-screen bg-[#f7f3eb]">
      <Header />

      <section className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-6 sm:py-10">
        <nav
          aria-label="Navegação estrutural"
          className="flex flex-wrap items-center gap-2 text-xs text-neutral-500"
        >
          <Link
            href="/"
            className="flex items-center gap-1.5 transition hover:text-[#b98218]"
          >
            <Home size={14} aria-hidden="true" />
            Início
          </Link>

          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </nav>

        <header className="mx-auto max-w-[820px] pb-8 pt-9 text-center sm:pb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b98218]">
            {eyebrow}
          </p>

          <h1 className="mt-3 font-serif text-[32px] leading-tight text-[#20170f] sm:text-[42px]">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-[700px] text-sm leading-7 text-neutral-600 sm:text-base">
            {description}
          </p>

          {updatedAt && (
            <p className="mt-4 text-xs text-neutral-400">
              Última atualização: {updatedAt}
            </p>
          )}
        </header>

        <article className="mx-auto max-w-[920px] rounded-2xl border border-[#e8dcc2] bg-white p-5 shadow-[0_8px_30px_rgba(80,55,20,0.06)] sm:p-8 lg:p-10">
          <div className="space-y-9 text-sm leading-7 text-neutral-700 sm:text-[15px]">
            {children}
          </div>
        </article>
      </section>

      <Footer />
    </main>
  );
}

export function InstitutionalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-36">
      <h2 className="mb-3 text-xl font-extrabold text-[#20170f] sm:text-2xl">
        {title}
      </h2>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function InformationBox({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#ead7ab] bg-[#fffaf0] px-4 py-4 text-[#604619] sm:px-5">
      {children}
    </div>
  );
}
