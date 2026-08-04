import AdminShell from "@/app/components/admin/AdminShell";

export default function AdminCouponsPage() {
  return (
    <AdminShell
      title="Cupons"
      description="Crie descontos, campanhas e cupons promocionais"
    >
      <section className="bg-white border border-[#e8dcc2] rounded-2xl p-8 shadow-sm">
        <h2 className="text-[30px] font-extrabold text-[#20170f]">
          Cupons de Desconto
        </h2>

        <p className="text-neutral-600 mt-2">
          Seu schema ainda não possui tabela de cupons. Depois podemos adicionar
          um model Coupon para controlar descontos no checkout.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {["BEMVINDO10", "FRETEGRATIS", "LAICO20"].map((coupon) => (
            <div
              key={coupon}
              className="rounded-2xl border border-[#e8dcc2] p-6 bg-[#faf9f6]"
            >
              <strong className="text-[#20170f] text-xl">{coupon}</strong>
              <p className="text-sm text-neutral-500 mt-2">
                Exemplo visual de cupom
              </p>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}