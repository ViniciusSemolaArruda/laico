import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const products = await prisma.product.findMany({
    select: { category: true, religion: true },
  });

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const religions = Array.from(new Set(products.map((p) => p.religion)));

  return (
    <AdminShell
      title="Categorias"
      description="Organize categorias e grupos religiosos do catálogo"
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-[#e8dcc2] rounded-2xl p-6 shadow-sm">
          <h2 className="text-[24px] font-extrabold text-[#20170f] mb-4">
            Categorias
          </h2>

          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category}
                className="h-12 px-4 rounded-xl border border-[#e8dcc2] flex items-center justify-between"
              >
                <strong>{category}</strong>
                <span className="text-xs text-neutral-500">Produto</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-[#e8dcc2] rounded-2xl p-6 shadow-sm">
          <h2 className="text-[24px] font-extrabold text-[#20170f] mb-4">
            Religiões / Segmentos
          </h2>

          <div className="space-y-3">
            {religions.map((religion) => (
              <div
                key={religion}
                className="h-12 px-4 rounded-xl border border-[#e8dcc2] flex items-center justify-between"
              >
                <strong>{religion}</strong>
                <span className="text-xs text-neutral-500">Segmento</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}