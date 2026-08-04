import AdminShell from "@/app/components/admin/AdminShell";
import {
  Package,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  image: string;
  category: string;
  religion: string;
  price: unknown;
  stock: number;
  active: boolean;
};

function formatPrice(
  value: unknown
) {
  return Number(
    value
  ).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

export default async function AdminProductsPage() {
  const products: AdminProduct[] =
    await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        image: true,
        category: true,
        religion: true,
        price: true,
        stock: true,
        active: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return (
    <AdminShell
      title="Produtos"
      description="Gerencie catálogo, estoque, categorias e produtos da loja"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[30px] font-extrabold text-[#20170f] sm:text-[34px]">
            Catálogo de
            produtos
          </h2>

          <p className="text-neutral-600">
            {products.length}{" "}
            {products.length === 1
              ? "produto cadastrado"
              : "produtos cadastrados"}
          </p>
        </div>

        <Link
          href="/admin/produtos/novo"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#b98218] px-5 font-bold text-white shadow-lg transition hover:bg-[#9f6f14]"
        >
          <Plus size={18} />
          Novo produto
        </Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-sm">
            <thead className="bg-[#faf9f6] text-[#20170f]">
              <tr>
                <th className="p-4 text-left">
                  Produto
                </th>
                <th className="p-4 text-left">
                  Categoria
                </th>
                <th className="p-4 text-left">
                  Religião
                </th>
                <th className="p-4 text-left">
                  Preço
                </th>
                <th className="p-4 text-left">
                  Estoque
                </th>
                <th className="p-4 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map(
                (product) => (
                  <tr
                    key={product.id}
                    className="border-t border-[#eee2cc] transition hover:bg-[#faf9f6]"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                          className="h-12 w-12 rounded-xl border object-cover"
                        />

                        <div>
                          <strong className="block text-[#20170f]">
                            {
                              product.name
                            }
                          </strong>

                          <p className="text-xs text-neutral-500">
                            {
                              product.slug
                            }
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      {
                        product.category
                      }
                    </td>

                    <td className="p-4">
                      {
                        product.religion
                      }
                    </td>

                    <td className="p-4 font-bold">
                      {formatPrice(
                        product.price
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          product.stock >
                          0
                            ? "font-bold text-green-700"
                            : "font-bold text-red-700"
                        }
                      >
                        {
                          product.stock
                        }
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          product.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {product.active
                          ? "Ativo"
                          : "Inativo"}
                      </span>
                    </td>
                  </tr>
                )
              )}

              {products.length ===
                0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-neutral-500"
                  >
                    <Package className="mx-auto mb-3" />

                    Nenhum produto
                    cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}