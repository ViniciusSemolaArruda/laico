import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { products } from "../../../data/products";
import {
  Heart,
  ShoppingCart,
  Zap,
  Truck,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
  Home,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const product = products.find((item) => item.slug === slug);

  if (!product) {
    notFound();
  }

  const related = products.filter((item) => item.slug !== product.slug);

  return (
    <main className="bg-[#faf9f6] min-h-screen">
      <Header />

      <section className="max-w-[1370px] mx-auto px-6 py-6">
        <div className="flex items-center gap-2 text-[13px] text-neutral-600 mb-7">
          <Home size={15} />
          <span>›</span>
          <span>Artigos Religiosos</span>
          <span>›</span>
          <span>{product.category}</span>
          <span>›</span>
          <span>{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[590px_1fr_310px] gap-7">
          <div className="flex gap-5">
            <div className="w-[78px] space-y-4 hidden sm:block">
              {product.gallery.map((img, index) => (
                <div
                  key={index}
                  className={`w-[78px] h-[78px] rounded-[7px] border flex items-center justify-center bg-white ${
                    index === 0 ? "border-[#b98218]" : "border-[#e5e5e5]"
                  }`}
                >
                  <img
                    src={img}
                    alt={product.name}
                    className="max-w-[65px] max-h-[65px] object-contain"
                  />
                </div>
              ))}
            </div>

            <div className="flex-1 h-[455px] bg-white border border-[#e5e5e5] rounded-[8px] flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="max-w-[88%] max-h-[88%] object-contain"
              />
            </div>
          </div>

          <div>
            <div className="flex gap-2 mb-4">
              {product.badge && (
                <span className="bg-green-700 text-white text-[11px] font-bold px-2 py-1 rounded">
                  {product.badge}
                </span>
              )}

              {product.badge2 && (
                <span className="bg-[#b98218] text-white text-[11px] font-bold px-2 py-1 rounded">
                  {product.badge2}
                </span>
              )}
            </div>

            <h1 className="font-serif text-[31px] leading-tight">
              {product.name}
            </h1>

            <p className="text-[13px] text-neutral-500 mt-2">
              Cód.: {product.code}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <span className="text-[#ffc400] text-[20px]">★★★★★</span>
              <span className="text-[13px] text-neutral-600">
                (128 avaliações)
              </span>
            </div>

            <p className="mt-4 text-[30px] font-bold text-[#e6007e]">
              {product.price}{" "}
              <span className="text-[15px] text-neutral-700 font-bold">
                /12un. no PIX
              </span>
            </p>

            <p className="text-[14px] text-neutral-600">
              {product.installment}
            </p>

            <p className="text-green-700 font-bold mt-4">ATACADO</p>
            <p className="text-[14px]">{product.wholesale}</p>

            <p className="mt-6 text-[14px] leading-6 text-neutral-700 max-w-[520px]">
              {product.description}
            </p>

            <div className="mt-5 space-y-2 text-[14px] text-neutral-700">
              <p>⚜️ Categoria: {product.category}</p>
              <p>♡ Religião: {product.religion}</p>
              <p>♡ Material: {product.material}</p>
              <p>♡ Cor: {product.color}</p>
              <p>⚜️ Tamanho: {product.size}</p>
              <p>⚖️ Peso: {product.weight}</p>
              <p>🛡️ Garantia: 90 dias contra defeitos de fabricação</p>
            </div>

            <p className="flex items-center gap-2 mt-5 text-green-600 text-[14px]">
              <CheckCircle size={16} /> Em estoque
            </p>
          </div>

          <aside className="bg-white border border-[#e5e5e5] rounded-[8px] h-fit">
            <div className="p-5 border-b">
              <p className="text-[14px] font-medium mb-2">Quantidade:</p>

              <div className="flex w-[95px] h-[34px] border rounded overflow-hidden">
                <button className="w-8 border-r">−</button>
                <span className="flex-1 flex items-center justify-center">
                  1
                </span>
                <button className="w-8 border-l">+</button>
              </div>

              <button className="mt-4 w-full h-[45px] bg-[#b98218] text-white rounded-[4px] font-bold flex items-center justify-center gap-2">
                <ShoppingCart size={18} />
                Adicionar ao carrinho
              </button>

              <Link
                href="/checkout"
                className="mt-3 w-full h-[43px] border border-[#b98218] text-[#b98218] rounded-[4px] font-bold flex items-center justify-center gap-2"
              >
                <Zap size={17} />
                Comprar agora
              </Link>

              <button className="mt-4 w-full flex items-center justify-center gap-2 text-[14px] text-neutral-600">
                <Heart size={17} />
                Adicionar aos favoritos
              </button>
            </div>

            <div className="p-5 border-b">
              <p className="font-medium text-[14px] mb-3">
                Calcular frete e prazo
              </p>

              <div className="flex gap-2">
                <input
                  placeholder="Digite seu CEP"
                  className="flex-1 border rounded px-3 h-[36px] text-[13px]"
                />
                <button className="border border-[#b98218] text-[#b98218] px-4 rounded text-[13px]">
                  Calcular
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex gap-3">
                <Truck className="text-[#b98218]" />
                <div>
                  <p className="font-bold text-[13px]">
                    Entrega para todo o Brasil
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    Enviamos para todas as regiões com segurança.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CreditCard className="text-[#b98218]" />
                <div>
                  <p className="font-bold text-[13px]">Pagamento seguro</p>
                  <p className="text-[12px] text-neutral-500">
                    Aceitamos Pix, cartão de crédito, débito e boleto.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <RotateCcw className="text-[#b98218]" />
                <div>
                  <p className="font-bold text-[13px]">
                    Trocas e devoluções
                  </p>
                  <p className="text-[12px] text-neutral-500">
                    7 dias para trocas ou devoluções após o recebimento.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[590px_1fr] gap-7 mt-8">
          <section className="bg-white border border-[#e5e5e5] rounded-[8px]">
            <div className="h-[48px] border-b flex items-center overflow-x-auto">
              <button className="h-full px-7 border-b-2 border-[#b98218] text-[#b98218] text-[14px] whitespace-nowrap">
                Descrição
              </button>
              <button className="h-full px-7 text-[14px] whitespace-nowrap">
                Informações adicionais
              </button>
              <button className="h-full px-7 text-[14px] whitespace-nowrap">
                Avaliações (128)
              </button>
              <button className="h-full px-7 text-[14px] whitespace-nowrap">
                Perguntas frequentes
              </button>
            </div>

            <div className="p-6 text-[14px] text-neutral-700 leading-6">
              <p>{product.description}</p>

              <p className="mt-4">
                Ideal para momentos de oração, presente especial ou para quem
                deseja um produto elegante, simbólico e de qualidade.
              </p>

              <ul className="mt-5 space-y-3">
                <li>✓ Produto selecionado com acabamento de qualidade</li>
                <li>✓ Design delicado e resistente</li>
                <li>✓ Ideal para presente ou uso pessoal</li>
                <li>✓ Envio seguro para todo o Brasil</li>
              </ul>
            </div>
          </section>

          <section className="bg-white border border-[#e5e5e5] rounded-[8px] p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-semibold">
                Produtos relacionados
              </h2>

              <button className="text-[#b98218] text-[13px]">Ver todos</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((item) => (
                <Link
                  href={`/produtos/${item.slug}`}
                  key={item.slug}
                  className="border border-[#e5e5e5] rounded-[8px] p-4 block hover:shadow-lg transition"
                >
                  <div className="h-[120px] flex items-center justify-center">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="max-h-[105px] object-contain"
                    />
                  </div>

                  <h3 className="text-[13px] mt-3">{item.name}</h3>

                  <p className="text-[#ffc400] text-[13px] mt-1">★★★★★</p>

                  <p className="text-[#e6007e] font-bold text-[15px]">
                    {item.price}
                  </p>

                  <p className="text-[11px] text-neutral-500">
                    6x sem juros
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8 border-t border-[#eee] pt-6">
          {[
            {
              icon: <Truck size={30} />,
              title: "Entrega para todo o Brasil",
              text: "Enviamos para todas as regiões com segurança.",
            },
            {
              icon: <CreditCard size={30} />,
              title: "Pagamento seguro",
              text: "Aceitamos Pix, cartão de crédito, débito e boleto.",
            },
            {
              icon: <ShieldCheck size={30} />,
              title: "Site 100% seguro",
              text: "Seus dados protegidos com criptografia SSL.",
            },
            {
              icon: <Heart size={30} />,
              title: "Respeito e diversidade",
              text: "Valorizamos todas as religiões, culturas e tradições.",
            },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-4">
              <div className="text-[#b98218]">{item.icon}</div>
              <div>
                <h3 className="font-bold text-[14px]">{item.title}</h3>
                <p className="text-[12px] text-neutral-500">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />

      <button className="fixed bottom-8 right-8 w-[62px] h-[62px] rounded-full bg-[#24c45a] text-white flex items-center justify-center shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}