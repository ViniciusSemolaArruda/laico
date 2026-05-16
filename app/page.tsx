/* eslint-disable react/jsx-key */
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  SlidersHorizontal,
  Truck,
  WalletCards,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";

import Header from "./components/Header";
import Footer from "./components/Footer";

const religions = [
  "Católicos e Protestantes",
  "Islamismo",
  "Judaísmo",
  "Hinduísmo",
  "Budismo",
  "Espiritismo",
  "Matriz Africana",
  "Povos Originários",
  "Quilombolas",
  "Ciganos",
  "Ortodoxos",
  "Anglicanismo",
];

const products = [
  {
    slug: "kit-12-enfeite-metal-nossa-senhora-aparecida",
    name: "Kit 12 Enfeite Metal Nossa Senhora Aparecida",
    code: "20208900",
    price: "R$57,13",
    old: "",
    image: "/aparecida.png",
    badge: "MAIS VENDIDO",
  },
  {
    slug: "teca-porta-hostia-terco-eucaristia-metal-sao",
    name: "Teca Porta Hóstia Terço Eucaristia Metal São",
    code: "20360100",
    price: "R$9,00",
    image: "/eucaristia.png",
  },
  {
    slug: "kit-12-ostensorio-jhs-grande-dourado-mesa",
    name: "Kit 12 Ostensório JHS Grande Dourado Mesa",
    code: "20204300",
    price: "R$64,28",
    image: "/dourado.png",
  },
  {
    slug: "kit-12-enfeite-painel-plastico-nossa-sra",
    name: "Kit 12 Enfeite Painel de Plástico Nossa Sra.",
    code: "20202000",
    price: "R$28,57",
    old: "de R$37,68 por",
    image: "/imagemnossa.png",
    badge: "REPOSIÇÃO",
    discount: "-20%",
  },
  {
    slug: "kit-12-enfeite-sao-miguel-colorido-auto-colante-dourado",
    name: "Kit 12 Enfeite São Miguel Colorido Auto Colante Dourado",
    code: "201010200",
    price: "R$89,90",
    image: "/saomiguel.png",
  },
  {
    slug: "terco-cristal-rosa",
    name: "Terço Cristal Rosa",
    code: "202030500",
    price: "R$29,90",
    image: "/terço.png",
  },
  {
    slug: "imagem-7-orixas-colorida-30cm",
    name: "Imagem 7 Orixás Colorida 30cm",
    code: "204050100",
    price: "R$119,90",
    image: "/orixas.png",
  },
  {
    slug: "anel-cruz-aco-inox-316l",
    name: "Anel Cruz em Aço Inox 316L",
    code: "301010300",
    price: "R$39,90",
    image: "/anel.png",
  },
];

function ProductCard({ product }: { product: any }) {
  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="block bg-white border border-[#f0e3c2] rounded-[8px] min-h-[410px] p-4 relative shadow-[0_2px_10px_rgba(207,167,74,0.08)] hover:shadow-[0_8px_22px_rgba(207,167,74,0.18)] transition"
    >
      {product.badge && (
        <span
          className={`absolute top-5 left-5 text-white text-[11px] font-bold px-2 py-1 rounded-sm ${
            product.badge === "REPOSIÇÃO" ? "bg-[#0071bc]" : "bg-[#168a2f]"
          }`}
        >
          {product.badge}
        </span>
      )}

      {product.discount && (
        <span className="absolute top-5 right-5 bg-[#e6007e] text-white text-[12px] font-bold px-3 py-1 rounded-full">
          {product.discount}
        </span>
      )}

      <div className="h-[210px] flex items-center justify-center mt-2">
        <img
          src={product.image}
          alt={product.name}
          className="max-h-[190px] max-w-[190px] object-contain mix-blend-multiply"
        />
      </div>

      <div className="text-[#f3c95f] text-[20px] leading-none mt-3">
        ★★★★★
      </div>

      <h3 className="mt-3 text-[17px] leading-[21px] font-medium min-h-[44px] text-[#20170f]">
        {product.name}
      </h3>

      <p className="mt-3 text-[13px] text-[#6f5a28]">Cód: {product.code}</p>

      {product.old && (
        <p className="mt-2 text-[13px] text-neutral-500 line-through">
          {product.old}
        </p>
      )}

      <p className="mt-1 text-[22px] font-bold text-[#cfa74a]">
        {product.price}
        <span className="text-[13px] text-[#cfa74a]"> /12un.</span>
        <span className="text-[13px] text-neutral-700"> no PIX</span>
      </p>

      <p className="text-[13px] text-neutral-500">
        6x de R$10,58 sem juros
      </p>

      <p className="mt-3 text-[14px] font-bold text-[#9f7a2f]">ATACADO</p>

      <p className="text-[14px] text-[#20170f]">R$55,20</p>
    </Link>
  );
}

function FilterBox() {
  return (
    <aside className="w-[315px] bg-white border border-[#f0e3c2] rounded-[8px] overflow-hidden sticky top-6 shadow-[0_2px_10px_rgba(207,167,74,0.08)]">
      <div className="h-[58px] flex items-center gap-3 px-6 border-b border-[#f0e3c2] text-[#9f7a2f]">
        <SlidersHorizontal size={20} />
        <strong className="uppercase text-[16px]">Filtrar Produtos</strong>
      </div>

      <div className="p-6 border-b border-[#f0e3c2]">
        <div className="flex justify-between mb-4 text-[#20170f]">
          <strong className="text-[14px]">Religião</strong>
          <ChevronDown size={18} className="text-[#cfa74a]" />
        </div>

        <div className="space-y-3">
          {religions.map((religion, index) => (
            <label
              key={religion}
              className="flex items-center gap-3 text-[14px] text-neutral-800"
            >
              <input
                type="checkbox"
                className="w-3.5 h-3.5 accent-[#cfa74a]"
              />

              <span className="w-5 text-center">
                {
                  [
                    "✝️",
                    "☪️",
                    "✡️",
                    "🕉️",
                    "☸️",
                    "🕯️",
                    "⚱️",
                    "🪶",
                    "🧑🏾",
                    "🎪",
                    "⛪",
                    "✟",
                  ][index]
                }
              </span>

              {religion}
            </label>
          ))}
        </div>
      </div>

      {["Categoria", "Cor"].map((item) => (
        <div
          key={item}
          className="h-[54px] px-6 border-b border-[#f0e3c2] flex items-center justify-between text-[#20170f]"
        >
          <strong className="text-[14px]">{item}</strong>
          <ChevronDown size={18} className="text-[#cfa74a]" />
        </div>
      ))}

      <div className="p-6">
        <strong className="text-[14px] text-[#20170f]">Faixa de preço</strong>

        <div className="mt-6 h-[4px] rounded bg-[#e3c97a] relative">
          <span className="absolute -top-1 left-0 w-3 h-3 rounded-full bg-[#cfa74a]" />
          <span className="absolute -top-1 right-0 w-3 h-3 rounded-full bg-[#cfa74a]" />
        </div>

        <div className="flex justify-between mt-5 text-[14px] text-[#6f5a28]">
          <span>R$ 0,00</span>
          <span>R$ 500,00+</span>
        </div>

        <button className="mt-6 w-full h-[43px] rounded-[4px] bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#cfa74a] text-white font-bold text-[14px] shadow-[0_4px_12px_rgba(207,167,74,0.25)]">
          FILTRAR
        </button>
      </div>
    </aside>
  );
}

function InfoCard({ icon, title, text, link }: any) {
  return (
    <div className="min-h-[118px] rounded-[8px] border border-[#f0e3c2] bg-[#fffdf7] px-6 py-5 flex items-center gap-5 overflow-hidden shadow-[0_2px_10px_rgba(207,167,74,0.08)]">
      <div className="min-w-[68px] h-[68px] rounded-full bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] text-white flex items-center justify-center">
        {icon}
      </div>

      <div className="flex-1">
        <h4 className="font-serif text-[18px] leading-[22px] font-bold text-[#20170f]">
          {title}
        </h4>

        <p className="mt-2 text-[13px] leading-[18px] text-neutral-600">
          {text}
        </p>

        <p className="mt-3 text-[13px] font-medium text-[#cfa74a]">
          {link} →
        </p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="bg-white">
      <Header />

      <section className="max-w-[1370px] mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 text-[14px] text-neutral-600 mb-8">
          <Home size={16} />
          <span>›</span>
          <span>Artigos Religiosos</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_315px] gap-8">
          <div>
            <div className="text-center mb-10">
              <h1 className="font-serif text-[33px] text-[#20170f]">
                Artigos Religiosos
              </h1>

              <div className="w-[130px] h-[2px] bg-gradient-to-r from-[#f3de9b] to-[#cfa74a] mx-auto mt-2" />

              <p className="mt-5 text-neutral-500">1789 itens encontrados</p>
            </div>

            <div className="w-[250px] h-[38px] bg-white border border-[#f0e3c2] rounded-[6px] flex items-center justify-between px-4 mb-4 text-[#6f5a28]">
              <span className="text-sm">Ordenar por:</span>
              <span className="text-sm">Mais populares</span>
              <ChevronDown size={16} className="text-[#cfa74a]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>

            <div className="flex justify-center gap-3 mt-8">
              {[
                <ChevronLeft size={16} />,
                "1",
                "2",
                "3",
                "...",
                "45",
                <ChevronRight size={16} />,
              ].map((p, i) => (
                <button
                  key={i}
                  className={`w-9 h-9 rounded border border-[#f0e3c2] flex items-center justify-center text-sm ${
                    p === "1"
                      ? "bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] text-white"
                      : "bg-white text-[#6f5a28]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-8">
              <InfoCard
                icon={<Truck size={34} />}
                title="Entrega para todo o Brasil"
                text="Enviamos para todas as regiões com segurança e agilidade."
                link="Saiba mais"
              />

              <InfoCard
                icon={<WalletCards size={34} />}
                title="Pagamento seguro"
                text="Aceitamos Pix, cartão de crédito, débito e boleto."
                link="Formas de pagamento"
              />

              <InfoCard
                icon={<ShieldCheck size={34} />}
                title="Respeito e diversidade"
                text="Valorizamos todas as religiões, culturas e tradições."
                link="Nossa missão"
              />
            </div>
          </div>

          <div className="hidden lg:block">
            <FilterBox />
          </div>
        </div>
      </section>

      <Footer />

      <button className="fixed bottom-8 right-8 w-[62px] h-[62px] rounded-full bg-[#24c45a] text-white flex items-center justify-center shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}