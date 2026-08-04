import AdminShell from "@/app/components/admin/AdminShell";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="Configurações"
      description="Dados gerais da loja, pagamentos, frete e aparência"
    >
      <section className="max-w-[900px] bg-white border border-[#e8dcc2] rounded-2xl p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-[30px] font-extrabold text-[#20170f]">
            Configurações da Loja
          </h2>
          <p className="text-neutral-500">
            Área visual preparada para configurações futuras.
          </p>
        </div>

        <label className="block">
          <span className="font-bold text-sm">Nome da loja</span>
          <input
            defaultValue="E-commerce Laico"
            className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
          />
        </label>

        <label className="block">
          <span className="font-bold text-sm">E-mail de atendimento</span>
          <input
            defaultValue="contato@ecommercelainco.com.br"
            className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
          />
        </label>

        <label className="block">
          <span className="font-bold text-sm">Descrição institucional</span>
          <textarea
            rows={5}
            defaultValue="Loja oficial de produtos religiosos, culturais e artigos simbólicos do Observatório Internacional do Turismo Religioso Laico."
            className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none"
          />
        </label>

        <button className="h-12 px-7 rounded-xl bg-[#b98218] text-white font-extrabold shadow-lg">
          Salvar configurações
        </button>
      </section>
    </AdminShell>
  );
}