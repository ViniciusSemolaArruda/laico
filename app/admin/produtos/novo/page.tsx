import AdminShell from "@/app/components/admin/AdminShell";

export default function NewProductPage() {
  return (
    <AdminShell
      title="Novo Produto"
      description="Cadastre um novo produto no catálogo"
    >
      <form className="max-w-[900px] bg-white border border-[#e8dcc2] rounded-2xl p-8 shadow-sm space-y-6">
        <div>
          <h2 className="text-[28px] font-extrabold text-[#20170f]">
            Informações do Produto
          </h2>
          <p className="text-neutral-500">
            Preencha os dados principais para exibição na loja.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label>
            <span className="font-bold text-sm">Nome</span>
            <input
              name="name"
              className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
              placeholder="Ex: Terço Cristal Rosa"
            />
          </label>

          <label>
            <span className="font-bold text-sm">Slug</span>
            <input
              name="slug"
              className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
              placeholder="terco-cristal-rosa"
            />
          </label>

          <label>
            <span className="font-bold text-sm">Preço</span>
            <input
              name="price"
              type="number"
              step="10.0"
              className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
              placeholder="29.90"
            />
          </label>

          <label>
            <span className="font-bold text-sm">Estoque</span>
            <input
              name="stock"
              type="number"
              className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
              placeholder="10"
            />
          </label>

          <label>
            <span className="font-bold text-sm">Categoria</span>
            <input
              name="category"
              className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
              placeholder="Artigos Religiosos"
            />
          </label>

          <label>
            <span className="font-bold text-sm">Religião</span>
            <input
              name="religion"
              className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
              placeholder="Católicos e Protestantes"
            />
          </label>
        </div>

        <label className="block">
          <span className="font-bold text-sm">URL da imagem</span>
          <input
            name="image"
            className="mt-2 w-full h-12 rounded-xl border border-[#e8dcc2] px-4 outline-none"
            placeholder="https://..."
          />
        </label>

        <label className="block">
          <span className="font-bold text-sm">Descrição</span>
          <textarea
            name="description"
            rows={5}
            className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none"
            placeholder="Descrição completa do produto"
          />
        </label>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 font-bold text-sm">
            <input type="checkbox" name="featured" />
            Produto em destaque
          </label>

          <label className="flex items-center gap-2 font-bold text-sm">
            <input type="checkbox" name="active" defaultChecked />
            Produto ativo
          </label>
        </div>

        <button
          type="submit"
          className="h-12 px-7 rounded-xl bg-[#b98218] text-white font-extrabold shadow-lg"
        >
          Salvar produto
        </button>
      </form>
    </AdminShell>
  );
}