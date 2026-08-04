import AdminShell from "@/app/components/admin/AdminShell";

export default function AdminBannersPage() {
  return (
    <AdminShell
      title="Banners"
      description="Controle banners, campanhas e destaques da página inicial"
    >
      <section className="bg-white border border-[#e8dcc2] rounded-2xl p-8 shadow-sm">
        <h2 className="text-[30px] font-extrabold text-[#20170f]">
          Banners Promocionais
        </h2>

        <p className="text-neutral-600 mt-2">
          Seu schema ainda não possui tabela de banners. Essa tela está pronta
          visualmente para quando você adicionar o model Banner no Prisma.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {["Banner principal", "Oferta especial", "Coleção destaque"].map(
            (item) => (
              <div
                key={item}
                className="h-[190px] rounded-2xl border border-dashed border-[#b98218] bg-[#faf9f6] flex items-center justify-center text-[#b98218] font-bold"
              >
                {item}
              </div>
            )
          )}
        </div>
      </section>
    </AdminShell>
  );
}