import Link from "next/link";

export default function Header2() {
  return (
    <header className="relative z-40 w-full border-b border-[#f3e7c7] bg-[#fffdf7] shadow-sm">
      <div className="mx-auto flex h-[130px] max-w-[1370px] items-center justify-center px-4 pt-4 sm:h-[145px] sm:pt-5">
        <Link
          href="/"
          aria-label="Voltar para a página inicial"
          className="inline-flex items-center justify-center transition-opacity duration-200 hover:opacity-85"
        >
          <img
            src="/logo3.png"
            alt="Laico"
            className="h-auto w-[190px] object-contain mix-blend-multiply sm:w-[230px] lg:w-[270px]"
          />
        </Link>
      </div>
    </header>
  );
}