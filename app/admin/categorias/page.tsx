import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

type ProductClassification = {
  category: string;
  religion: string;
};

export default async function AdminCategoriesPage() {
  const products: ProductClassification[] =
    await prisma.product.findMany({
      select: {
        category: true,
        religion: true,
      },
    });

  const categories = Array.from(
    new Set(
      products
        .map(
          (product) =>
            product.category
        )
        .filter(
          (category) =>
            category.trim().length > 0
        )
    )
  ).sort((first, second) =>
    first.localeCompare(
      second,
      "pt-BR"
    )
  );

  const religions = Array.from(
    new Set(
      products
        .map(
          (product) =>
            product.religion
        )
        .filter(
          (religion) =>
            religion.trim().length > 0
        )
    )
  ).sort((first, second) =>
    first.localeCompare(
      second,
      "pt-BR"
    )
  );

  return (
    <AdminShell
      title="Categorias"
      description="Organize categorias e grupos religiosos do catálogo"
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[24px] font-extrabold text-[#20170f]">
              Categorias
            </h2>

            <span className="rounded-full bg-[#f7f1e4] px-3 py-1 text-xs font-bold text-[#7a5422]">
              {categories.length}{" "}
              {categories.length === 1
                ? "categoria"
                : "categorias"}
            </span>
          </div>

          {categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map(
                (category) => (
                  <div
                    key={category}
                    className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-[#e8dcc2] px-4 py-3"
                  >
                    <strong className="text-[#20170f]">
                      {category}
                    </strong>

                    <span className="shrink-0 text-xs text-neutral-500">
                      Produto
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#e8dcc2] bg-[#fffcf6] p-6 text-center text-sm text-neutral-500">
              Nenhuma categoria foi
              cadastrada.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[24px] font-extrabold text-[#20170f]">
              Religiões / Segmentos
            </h2>

            <span className="rounded-full bg-[#f7f1e4] px-3 py-1 text-xs font-bold text-[#7a5422]">
              {religions.length}{" "}
              {religions.length === 1
                ? "segmento"
                : "segmentos"}
            </span>
          </div>

          {religions.length > 0 ? (
            <div className="space-y-3">
              {religions.map(
                (religion) => (
                  <div
                    key={religion}
                    className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-[#e8dcc2] px-4 py-3"
                  >
                    <strong className="text-[#20170f]">
                      {religion}
                    </strong>

                    <span className="shrink-0 text-xs text-neutral-500">
                      Segmento
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#e8dcc2] bg-[#fffcf6] p-6 text-center text-sm text-neutral-500">
              Nenhum segmento foi
              cadastrado.
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}