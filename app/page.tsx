// app/page.tsx

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

import Header from "../components/Header/Header";
import Footer from "../components/Footer";
import BannerCarousel from "@/components/BannerCarousel/BannerCarousel";

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


/* =========================================================
   CARD DO PRODUTO
========================================================= */

function ProductCard({
  product,
}: {
  product: any;
}) {
  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="
        relative
        block
        min-w-0
        overflow-hidden
        rounded-[8px]
        border
        border-[#f0e3c2]
        bg-white
        p-2.5
        shadow-[0_2px_10px_rgba(207,167,74,0.08)]
        transition

        hover:shadow-[0_8px_22px_rgba(207,167,74,0.18)]

        sm:min-h-[410px]
        sm:p-4
      "
    >
      {/* BADGE */}

      {product.badge && (
        <span
          className={`
            absolute
            left-2
            top-2
            z-10
            rounded-sm
            px-1.5
            py-1
            text-[8px]
            font-bold
            text-white

            sm:left-5
            sm:top-5
            sm:px-2
            sm:text-[11px]

            ${
              product.badge ===
              "REPOSIÇÃO"
                ? "bg-[#0071bc]"
                : "bg-[#168a2f]"
            }
          `}
        >
          {product.badge}
        </span>
      )}

      {/* DESCONTO */}

      {product.discount && (
        <span
          className="
            absolute
            right-2
            top-2
            z-10
            rounded-full
            bg-[#e6007e]
            px-1.5
            py-1
            text-[8px]
            font-bold
            text-white

            sm:right-5
            sm:top-5
            sm:px-3
            sm:text-[12px]
          "
        >
          {product.discount}
        </span>
      )}

      {/* IMAGEM */}

      <div
        className="
          mt-2
          flex
          h-[135px]
          w-full
          items-center
          justify-center

          sm:h-[210px]
        "
      >
        <img
          src={product.image}
          alt={product.name}
          className="
            max-h-[120px]
            max-w-full
            object-contain
            mix-blend-multiply

            sm:max-h-[190px]
            sm:max-w-[190px]
          "
        />
      </div>

      {/* ESTRELAS */}

      <div
        className="
          mt-2
          whitespace-nowrap
          text-[13px]
          leading-none
          tracking-[-1px]
          text-[#f3c95f]

          sm:mt-3
          sm:text-[20px]
          sm:tracking-normal
        "
      >
        ★★★★★
      </div>

      {/* NOME */}

      <h3
        className="
          mt-2
          min-h-[52px]
          text-[13px]
          font-medium
          leading-[17px]
          text-[#20170f]

          sm:mt-3
          sm:min-h-[44px]
          sm:text-[17px]
          sm:leading-[21px]
        "
      >
        {product.name}
      </h3>

      {/* CÓDIGO */}

      <p
        className="
          mt-2
          text-[10px]
          text-[#6f5a28]

          sm:mt-3
          sm:text-[13px]
        "
      >
        Cód: {product.code}
      </p>

      {/* PREÇO ANTIGO */}

      {product.old && (
        <p
          className="
            mt-1
            text-[10px]
            text-neutral-500
            line-through

            sm:mt-2
            sm:text-[13px]
          "
        >
          {product.old}
        </p>
      )}

      {/* PREÇO */}

      <p
        className="
          mt-1
          leading-tight
          text-[#cfa74a]
        "
      >
        <strong
          className="
            text-[17px]

            sm:text-[22px]
          "
        >
          {product.price}
        </strong>

        <span
          className="
            ml-1
            text-[10px]
            text-[#cfa74a]

            sm:text-[13px]
          "
        >
          /12un.
        </span>

        <span
          className="
            ml-1
            text-[10px]
            text-neutral-700

            sm:text-[13px]
          "
        >
          no PIX
        </span>
      </p>

      {/* PARCELAMENTO */}

      <p
        className="
          mt-1
          text-[10px]
          leading-[14px]
          text-neutral-500

          sm:text-[13px]
        "
      >
        6x de R$10,58 sem juros
      </p>

      {/* ATACADO */}

      <p
        className="
          mt-2
          text-[11px]
          font-bold
          text-[#9f7a2f]

          sm:mt-3
          sm:text-[14px]
        "
      >
        ATACADO
      </p>

      <p
        className="
          text-[12px]
          text-[#20170f]

          sm:text-[14px]
        "
      >
        R$55,20
      </p>
    </Link>
  );
}


/* =========================================================
   FILTRO
========================================================= */

function FilterBox() {
  return (
    <aside className="sticky top-6 w-[315px] overflow-hidden rounded-[8px] border border-[#f0e3c2] bg-white shadow-[0_2px_10px_rgba(207,167,74,0.08)]">
      <div className="flex h-[58px] items-center gap-3 border-b border-[#f0e3c2] px-6 text-[#9f7a2f]">
        <SlidersHorizontal size={20} />

        <strong className="text-[16px] uppercase">
          Filtrar Produtos
        </strong>
      </div>

      <div className="border-b border-[#f0e3c2] p-6">
        <div className="mb-4 flex justify-between text-[#20170f]">
          <strong className="text-[14px]">
            Religião
          </strong>

          <ChevronDown
            size={18}
            className="text-[#cfa74a]"
          />
        </div>

        <div className="space-y-3">
          {religions.map(
            (religion, index) => (
              <label
                key={religion}
                className="flex items-center gap-3 text-[14px] text-neutral-800"
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[#cfa74a]"
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
            )
          )}
        </div>
      </div>

      {[
        "Categoria",
        "Cor",
      ].map((item) => (
        <div
          key={item}
          className="flex h-[54px] items-center justify-between border-b border-[#f0e3c2] px-6 text-[#20170f]"
        >
          <strong className="text-[14px]">
            {item}
          </strong>

          <ChevronDown
            size={18}
            className="text-[#cfa74a]"
          />
        </div>
      ))}

      <div className="p-6">
        <strong className="text-[14px] text-[#20170f]">
          Faixa de preço
        </strong>

        <div className="relative mt-6 h-[4px] rounded bg-[#e3c97a]">
          <span className="absolute -top-1 left-0 h-3 w-3 rounded-full bg-[#cfa74a]" />

          <span className="absolute -top-1 right-0 h-3 w-3 rounded-full bg-[#cfa74a]" />
        </div>

        <div className="mt-5 flex justify-between text-[14px] text-[#6f5a28]">
          <span>R$ 0,00</span>

          <span>R$ 500,00+</span>
        </div>

        <button className="mt-6 h-[43px] w-full rounded-[4px] bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#cfa74a] text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(207,167,74,0.25)]">
          FILTRAR
        </button>
      </div>
    </aside>
  );
}


/* =========================================================
   CARD INFORMAÇÃO
========================================================= */

function InfoCard({
  icon,
  title,
  text,
  link,
}: any) {
  return (
    <div className="flex min-h-[118px] items-center gap-5 overflow-hidden rounded-[8px] border border-[#f0e3c2] bg-[#fffdf7] px-6 py-5 shadow-[0_2px_10px_rgba(207,167,74,0.08)]">
      <div className="flex h-[68px] min-w-[68px] items-center justify-center rounded-full bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] text-white">
        {icon}
      </div>

      <div className="flex-1">
        <h4 className="font-serif text-[18px] font-bold leading-[22px] text-[#20170f]">
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


/* =========================================================
   HOME
========================================================= */

export default function HomePage() {
  return (
    <main className="bg-white">
      <Header />

      <BannerCarousel />

      <section
        className="
          mx-auto
          max-w-[1370px]
          px-3
          pt-5

          sm:px-6
          sm:pt-6
        "
      >
        {/* BREADCRUMB */}

        <div className="mb-6 flex items-center gap-2 text-[12px] text-neutral-600 sm:mb-8 sm:text-[14px]">
          <Home size={16} />

          <span>›</span>

          <span>
            Artigos Religiosos
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_315px]">
          <div className="min-w-0">

            {/* TÍTULO */}

            <div className="mb-7 text-center sm:mb-10">
              <h1 className="font-serif text-[27px] text-[#20170f] sm:text-[33px]">
                Artigos Religiosos
              </h1>

              <div className="mx-auto mt-2 h-[2px] w-[110px] bg-gradient-to-r from-[#f3de9b] to-[#cfa74a] sm:w-[130px]" />

              <p className="mt-4 text-[13px] text-neutral-500 sm:mt-5 sm:text-base">
                1789 itens encontrados
              </p>
            </div>

            {/* ORDENAÇÃO */}

            <div className="mb-4 flex h-[38px] w-full max-w-[250px] items-center justify-between rounded-[6px] border border-[#f0e3c2] bg-white px-3 text-[#6f5a28] sm:px-4">
              <span className="text-[12px] sm:text-sm">
                Ordenar por:
              </span>

              <span className="text-[12px] sm:text-sm">
                Mais populares
              </span>

              <ChevronDown
                size={16}
                className="text-[#cfa74a]"
              />
            </div>

            {/* =============================================
                PRODUTOS

                CELULAR = 2 COLUNAS
            ============================================= */}

            <div
              className="
                grid
                grid-cols-2
                gap-2

                sm:gap-4

                xl:grid-cols-4
              "
            >
              {products.map(
                (product) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                  />
                )
              )}
            </div>

            {/* PAGINAÇÃO */}

            <div className="mt-7 flex justify-center gap-1.5 sm:mt-8 sm:gap-3">
              {[
                <ChevronLeft size={16} />,
                "1",
                "2",
                "3",
                "...",
                "45",
                <ChevronRight size={16} />,
              ].map(
                (p, i) => (
                  <button
                    key={i}
                    className={`flex h-8 w-8 items-center justify-center rounded border border-[#f0e3c2] text-[12px] sm:h-9 sm:w-9 sm:text-sm ${
                      p === "1"
                        ? "bg-gradient-to-b from-[#f3de9b] to-[#cfa74a] text-white"
                        : "bg-white text-[#6f5a28]"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* INFORMAÇÕES */}

            <div className="mb-8 mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <InfoCard
                icon={
                  <Truck size={34} />
                }
                title="Entrega para todo o Brasil"
                text="Enviamos para todas as regiões com segurança e agilidade."
                link="Saiba mais"
              />

              <InfoCard
                icon={
                  <WalletCards
                    size={34}
                  />
                }
                title="Pagamento seguro"
                text="Aceitamos Pix, cartão de crédito, débito e boleto."
                link="Formas de pagamento"
              />

              <InfoCard
                icon={
                  <ShieldCheck
                    size={34}
                  />
                }
                title="Respeito e diversidade"
                text="Valorizamos todas as religiões, culturas e tradições."
                link="Nossa missão"
              />
            </div>
          </div>

          {/* FILTRO DESKTOP */}

          <div className="hidden lg:block">
            <FilterBox />
          </div>
        </div>
      </section>

      <Footer />

      {/* WHATSAPP */}

      <button className="fixed bottom-6 right-5 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl sm:bottom-8 sm:right-8 sm:h-[62px] sm:w-[62px]">
        <MessageCircle
          size={30}
          className="sm:h-[34px] sm:w-[34px]"
        />
      </button>
    </main>
  );
}