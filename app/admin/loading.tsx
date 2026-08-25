import {
  Loader2,
} from "lucide-react";

export default function AdminLoading() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex cursor-wait items-center justify-center bg-[#20170f]/45 px-5 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
      aria-label="Carregando página"
    >
      <div className="flex min-w-[280px] flex-col items-center rounded-2xl border border-[#e8dcc2] bg-white px-8 py-7 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff8e8] text-[#b98218]">
          <Loader2
            size={30}
            strokeWidth={2.4}
            className="animate-spin"
          />
        </div>

        <strong className="mt-4 text-lg font-extrabold text-[#20170f]">
          Carregando...
        </strong>

        <p className="mt-1 text-center text-sm text-neutral-500">
          Aguarde enquanto abrimos a página.
        </p>

        <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[#eee4d1]">
          <div className="h-full w-1/2 animate-[adminLoading_1s_ease-in-out_infinite] rounded-full bg-[#b98218]" />
        </div>
      </div>

      <style>{`
        @keyframes adminLoading {
          0% {
            transform: translateX(-110%);
          }

          50% {
            transform: translateX(50%);
          }

          100% {
            transform: translateX(210%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-spin {
            animation-duration: 2s;
          }
        }
      `}</style>
    </div>
  );
}