import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import AdminShell from "@/app/components/admin/AdminShell";

function formatPrice(value: unknown) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminShell
      title="Produtos"
      description="Gerencie catálogo, estoque, categorias e produtos da loja"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[34px] font-extrabold text-[#20170f]">
            Catálogo de Produtos
          </h2>
          <p className="text-neutral-600">
            {products.length} produtos cadastrados
          </p>
        </div>

        <Link
          href="/admin/produtos/novo"
          className="h-12 px-5 rounded-xl bg-[#b98218] text-white font-bold flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} />
          Novo produto
        </Link>
      </div>

      <section className="bg-white border border-[#e8dcc2] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#faf9f6] text-[#20170f]">
            <tr>
              <th className="text-left p-4">Produto</th>
              <th className="text-left p-4">Categoria</th>
              <th className="text-left p-4">Religião</th>
              <th className="text-left p-4">Preço</th>
              <th className="text-left p-4">Estoque</th>
              <th className="text-left p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-[#eee2cc]">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover border"
                    />

                    <div>
                      <strong className="text-[#20170f]">{product.name}</strong>
                      <p className="text-xs text-neutral-500">{product.slug}</p>
                    </div>
                  </div>
                </td>

                <td className="p-4">{product.category}</td>
                <td className="p-4">{product.religion}</td>
                <td className="p-4 font-bold">{formatPrice(product.price)}</td>
                <td className="p-4">{product.stock}</td>
                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      product.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {product.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}

            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-neutral-500">
                  <Package className="mx-auto mb-3" />
                  Nenhum produto cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}