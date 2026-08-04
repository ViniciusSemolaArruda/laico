// app/produtos/[slug]/page.tsx

import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import AddToCartButton from "../../../components/AddToCartButton";
import { prisma } from "@/lib/prisma";
import {
  Heart,
  Truck,
  CreditCard,
  RotateCcw,
  CheckCircle,
  Home,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPrice(value: unknown) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
  });

  if (!product) {
    notFound();
  }

  const related = await prisma.product.findMany({
    where: {
      active: true,
      category: product.category,
      NOT: {
        id: product.id,
      },
    },
    take: 4,
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <Header />

      <section className="mx-auto max-w-[1370px] px-6 py-7">
        <div className="mb-7 flex items-center gap-2 text-[13px] text-neutral-600">
          <Home size={15} />
          <Link href="/" className="hover:text-[#b98218]">
            Início
          </Link>
          <span>›</span>
          <span>{product.category}</span>
          <span>›</span>
          <span className="font-semibold text-[#20170f]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[590px_1fr_310px]">
          <section className="flex h-[455px] items-center justify-center rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[88%] max-w-[88%] object-contain"
            />
          </section>

          <section>
            <span className="inline-flex rounded-full bg-[#fff8e8] px-3 py-1 text-xs font-bold text-[#b98218]">
              {product.religion}
            </span>

            <h1 className="mt-4 text-[34px] font-extrabold leading-tight text-[#20170f]">
              {product.name}
            </h1>

            <p className="mt-2 text-[14px] text-neutral-500">
              Categoria: {product.category}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-[20px] text-[#ffc400]">★★★★★</span>
              <span className="text-[13px] text-neutral-600">
                Produto verificado
              </span>
            </div>

            <p className="mt-5 text-[34px] font-extrabold text-[#b98218]">
              {formatPrice(product.price)}
            </p>

            <p className="text-[14px] text-neutral-600">
              ou em até 6x sem juros
            </p>

            <p className="mt-6 max-w-[560px] text-[15px] leading-7 text-neutral-700">
              {product.description}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 text-[14px] text-neutral-700 sm:grid-cols-2">
              <div className="rounded-xl border border-[#e8dcc2] bg-white p-4">
                <strong className="block text-[#20170f]">Categoria</strong>
                {product.category}
              </div>

              <div className="rounded-xl border border-[#e8dcc2] bg-white p-4">
                <strong className="block text-[#20170f]">Segmento</strong>
                {product.religion}
              </div>

              <div className="rounded-xl border border-[#e8dcc2] bg-white p-4">
                <strong className="block text-[#20170f]">Estoque</strong>
                {product.stock} unidade(s)
              </div>

              <div className="rounded-xl border border-[#e8dcc2] bg-white p-4">
                <strong className="block text-[#20170f]">Garantia</strong>
                90 dias
              </div>
            </div>

            {product.stock > 0 ? (
              <p className="mt-5 flex items-center gap-2 text-[14px] font-bold text-green-600">
                <CheckCircle size={16} />
                Em estoque e disponível para compra
              </p>
            ) : (
              <p className="mt-5 text-[14px] font-bold text-red-600">
                Produto indisponível no momento
              </p>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
            <div className="border-b border-[#eee2cc] p-5">
              <AddToCartButton
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  image: product.image,
                  price: Number(product.price),
                }}
              />

              <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8dcc2] py-3 text-[14px] font-bold text-neutral-600 hover:bg-[#faf9f6]">
                <Heart size={17} />
                Favoritar
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex gap-3">
                <Truck className="text-[#b98218]" />
                <div>
                  <p className="text-[13px] font-bold">
                    Entrega para todo o Brasil
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    Envio rápido e seguro.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CreditCard className="text-[#b98218]" />
                <div>
                  <p className="text-[13px] font-bold">Pagamento seguro</p>
                  <p className="text-[12px] text-neutral-500">
                    Pix, boleto e cartão.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <RotateCcw className="text-[#b98218]" />
                <div>
                  <p className="text-[13px] font-bold">Trocas e devoluções</p>
                  <p className="text-[12px] text-neutral-500">
                    7 dias após recebimento.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ShieldCheck className="text-[#b98218]" />
                <div>
                  <p className="text-[13px] font-bold">Compra protegida</p>
                  <p className="text-[12px] text-neutral-500">
                    Ambiente seguro e pedido acompanhado.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-[26px] font-extrabold text-[#20170f]">
                Produtos relacionados
              </h2>
              <p className="text-sm text-neutral-500">
                Outros produtos da mesma categoria
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
            {related.map((item) => (
              <Link
                href={`/produtos/${item.slug}`}
                key={item.id}
                className="rounded-2xl border border-[#e8dcc2] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex h-[180px] items-center justify-center rounded-xl bg-[#faf9f6]">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="max-h-[155px] object-contain"
                  />
                </div>

                <h3 className="mt-4 line-clamp-2 text-[14px] font-bold text-[#20170f]">
                  {item.name}
                </h3>

                <p className="mt-2 text-[18px] font-extrabold text-[#b98218]">
                  {formatPrice(item.price)}
                </p>
              </Link>
            ))}

            {related.length === 0 && (
              <p className="col-span-full rounded-2xl border border-[#e8dcc2] bg-white p-6 text-neutral-500">
                Nenhum produto relacionado encontrado.
              </p>
            )}
          </div>
        </section>
      </section>

      <Footer />

      <button className="fixed bottom-8 right-8 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}