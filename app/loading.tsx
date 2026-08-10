import Image from "next/image";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Carregando página"
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#fffdf7] px-6"
    >
      {/* Luzes suaves de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9b66b]/10 blur-[90px] sm:h-[560px] sm:w-[560px]" />

        <div className="absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#b98218]/5 blur-[80px]" />

        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#f3de9b]/20 blur-[90px]" />
      </div>

      <div className="relative flex w-full max-w-[380px] flex-col items-center text-center">
        {/* Logo com brilho discreto */}
        <div className="relative flex min-h-[128px] w-full items-center justify-center sm:min-h-[150px]">
          <div
            aria-hidden="true"
            className="absolute h-24 w-56 rounded-full bg-[#d9b66b]/20 blur-3xl motion-safe:animate-pulse sm:w-64"
          />

          <Image
            src="/logo3.png"
            alt="Laico"
            width={300}
            height={140}
            priority
            sizes="(max-width: 640px) 210px, 260px"
            className="relative h-auto w-[210px] object-contain mix-blend-multiply motion-safe:animate-pulse sm:w-[260px]"
          />
        </div>

        {/* Indicador circular */}
        <div className="relative mt-3 flex h-12 w-12 items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-[#ead9b8]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#b98218] border-r-[#d9b66b] motion-safe:animate-spin motion-reduce:border-[#b98218]"
          />

          <div
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-[#b98218] shadow-[0_0_14px_rgba(185,130,24,0.5)] motion-safe:animate-pulse"
          />
        </div>

        <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.18em] text-[#9f7a2f]">
          Preparando sua experiência
        </p>

        <div
          aria-hidden="true"
          className="mt-3 flex h-4 items-center justify-center gap-1.5"
        >
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                animationDelay: `${
                  index * 160
                }ms`,
              }}
              className="h-1.5 w-1.5 rounded-full bg-[#cfa74a] motion-safe:animate-bounce motion-reduce:animate-none"
            />
          ))}
        </div>

        <span className="sr-only">
          Aguarde, a página está sendo carregada.
        </span>
      </div>
    </div>
  );
}