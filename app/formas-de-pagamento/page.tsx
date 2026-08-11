import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Barcode,
  Check,
  CreditCard,
  Home,
  Landmark,
  LockKeyhole,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Formas de pagamento | Laico",
  description:
    "Conheça as formas de pagamento disponíveis na Laico: Pix, cartões, boleto e Mercado Pago.",
};

const paymentBrandAssets = [
  {
    name: "Pix",
    src: "/pix.svg",
  },
  {
    name: "Visa",
    src: "/visa.svg",
  },
  {
    name: "Mastercard",
    src: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/master.svg",
  },
  {
    name: "Elo",
    src: "/elo.svg",
  },
  {
    name: "American Express",
    src: "/american-express.svg",
  },
  {
    name: "Hipercard",
    src: "/hipercard.svg",
  },
  {
    name: "Boleto bancário",
    src: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/boleto.svg",
  },
] as const;

const paymentMethods = [
  {
    icon: QrCode,
    title: "Pix",
    badge: "Confirmação rápida",
    description:
      "Pague pelo aplicativo do seu banco usando o QR Code ou o código Pix exibido após a compra.",
    details: [
      "Disponível 24 horas por dia",
      "Confirmação normalmente em poucos segundos",
      "O pedido é atualizado após a confirmação do Mercado Pago",
    ],
    className: styles.pixCard,
  },
  {
    icon: CreditCard,
    title: "Cartão de crédito",
    badge: "Parcelamento no checkout",
    description:
      "Compre com as principais bandeiras. As parcelas, os juros e o valor mínimo são exibidos antes da confirmação.",
    details: [
      "Visa, Mastercard, Elo, American Express e Hipercard",
      "Aprovação sujeita à análise da operadora",
      "A Laico não recebe nem armazena os dados completos do cartão",
    ],
    className: styles.creditCard,
  },
  {
    icon: Landmark,
    title: "Cartão de débito",
    badge: "Quando disponível",
    description:
      "O Mercado Pago pode disponibilizar débito virtual Caixa e Elo, conforme a conta, o dispositivo e a integração.",
    details: [
      "Pagamento autorizado pelo banco emissor",
      "Disponibilidade confirmada no checkout",
      "O pedido só avança depois da aprovação",
    ],
    className: styles.debitCard,
  },
  {
    icon: Barcode,
    title: "Boleto bancário",
    badge: "Pagamento offline",
    description:
      "Gere o boleto no checkout e pague pelo aplicativo do seu banco, internet banking ou canal autorizado.",
    details: [
      "Respeite a data de vencimento informada",
      "A compensação não é instantânea",
      "O envio começa somente após a aprovação do pagamento",
    ],
    className: styles.boletoCard,
  },
  {
    icon: WalletCards,
    title: "Saldo Mercado Pago",
    badge: "Conforme o checkout",
    description:
      "Clientes com conta Mercado Pago poderão usar o saldo disponível quando essa opção for oferecida na finalização.",
    details: [
      "Acesso protegido pela conta Mercado Pago",
      "Disponibilidade definida pelo provedor",
      "Confirmação comunicada automaticamente à loja",
    ],
    className: styles.walletCard,
  },
  {
    icon: Banknote,
    title: "Linha de Crédito",
    badge: "Para clientes elegíveis",
    description:
      "O Mercado Pago poderá oferecer parcelamento sem cartão para clientes elegíveis, conforme análise própria.",
    details: [
      "Sujeita à elegibilidade do comprador",
      "Condições apresentadas pelo Mercado Pago",
      "Disponível apenas quando exibida no checkout",
    ],
    className: styles.creditLineCard,
  },
];

export default function PaymentMethodsPage() {
  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroGlowOne} />
        <div className={styles.heroGlowTwo} />

        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
            <Link href="/">
              <Home size={15} aria-hidden="true" />
              Início
            </Link>
            <span aria-hidden="true">/</span>
            <span>Formas de pagamento</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                <ShieldCheck size={17} aria-hidden="true" />
                Pagamento protegido
              </span>

              <h1>Escolha como pagar sua compra</h1>

              <p>
                Aceitamos os principais meios processados pelo Mercado Pago,
                com confirmação segura e atualização automática do seu pedido.
              </p>

              <div className={styles.heroActions}>
                <Link href="/" className={styles.primaryButton}>
                  Ir para a loja
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link href="/contato#duvidas-frequentes" className={styles.secondaryButton}>
                  Tirar dúvidas
                </Link>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.paymentTerminal}>
                <div className={styles.terminalTop}>
                  <span>LAICO</span>
                  <LockKeyhole size={18} />
                </div>

                <div className={styles.terminalScreen}>
                  <BadgeCheck size={42} />
                  <strong>Pagamento seguro</strong>
                  <span>Processado pelo Mercado Pago</span>
                </div>

                <div className={styles.terminalMethods}>
                  <QrCode size={24} />
                  <CreditCard size={24} />
                  <Barcode size={24} />
                  <Smartphone size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.trustStrip}>
        <div className={`${styles.container} ${styles.trustGrid}`}>
          <div>
            <LockKeyhole size={22} />
            <span>
              <strong>Ambiente protegido</strong>
              Conexão segura durante a compra
            </span>
          </div>

          <div>
            <ShieldCheck size={22} />
            <span>
              <strong>Dados preservados</strong>
              Cartão processado pelo Mercado Pago
            </span>
          </div>

          <div>
            <ReceiptText size={22} />
            <span>
              <strong>Status verdadeiro</strong>
              Pedido atualizado após a confirmação
            </span>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.methodsSection}`}>
        <div className={styles.sectionHeading}>
          <span>OPÇÕES DISPONÍVEIS</span>
          <h2>Formas de pagamento</h2>
          <p>
            A disponibilidade exata é apresentada no checkout e pode variar de
            acordo com sua conta, instituição financeira e configuração do Mercado Pago.
          </p>
        </div>

        <div className={styles.methodsGrid}>
          {paymentMethods.map((method) => {
            const Icon = method.icon;

            return (
              <article
                key={method.title}
                className={`${styles.methodCard} ${method.className}`}
              >
                <div className={styles.methodHeader}>
                  <div className={styles.methodIcon}>
                    <Icon size={26} aria-hidden="true" />
                  </div>
                  <span className={styles.methodBadge}>{method.badge}</span>
                </div>

                <h3>{method.title}</h3>
                <p>{method.description}</p>

                <ul>
                  {method.details.map((detail) => (
                    <li key={detail}>
                      <Check size={15} aria-hidden="true" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.brandsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <span>MEIOS E BANDEIRAS</span>
            <h2>Opções exibidas no checkout</h2>
            <p>
              Pix, boleto e as principais bandeiras processadas pelo Mercado Pago.
              A disponibilidade final é sempre confirmada durante a compra.
            </p>
          </div>

          <div className={styles.brandGrid}>
            {paymentBrandAssets.map((brand) => (
              <figure key={brand.name} className={styles.brandTile}>
                <div className={styles.brandImageBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={brand.src}
                    alt={brand.name}
                    loading="lazy"
                    className={styles.brandImage}
                  />
                </div>
                <figcaption>{brand.name}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.processSection}`}>
        <div className={styles.sectionHeading}>
          <span>COMPRA TRANQUILA</span>
          <h2>Como a confirmação funciona</h2>
        </div>

        <div className={styles.processGrid}>
          <article>
            <span>01</span>
            <h3>Escolha o meio</h3>
            <p>Selecione uma das opções realmente exibidas na finalização.</p>
          </article>

          <article>
            <span>02</span>
            <h3>Confirme com segurança</h3>
            <p>Os dados sensíveis são processados pela infraestrutura do Mercado Pago.</p>
          </article>

          <article>
            <span>03</span>
            <h3>Aguarde a aprovação</h3>
            <p>Pix costuma ser rápido; boleto e cartão podem exigir prazo de análise.</p>
          </article>

          <article>
            <span>04</span>
            <h3>Acompanhe o pedido</h3>
            <p>Após a confirmação, o status verdadeiro aparece em sua área do cliente.</p>
          </article>
        </div>
      </section>

      <section className={`${styles.container} ${styles.noticeSection}`}>
        <div className={styles.noticeIcon}>
          <ShieldCheck size={30} aria-hidden="true" />
        </div>

        <div>
          <h2>Informações importantes</h2>
          <p>
            A Laico nunca solicita senha bancária por e-mail ou WhatsApp. A aprovação,
            as parcelas, os juros, os limites e a elegibilidade são definidos pelo
            Mercado Pago e pela instituição financeira do cliente. Seu pedido somente
            será preparado após a confirmação oficial do pagamento.
          </p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.ctaContent}`}>
          <div>
            <span>PRONTO PARA ESCOLHER?</span>
            <h2>Encontre seu próximo produto na Laico</h2>
            <p>Veja o catálogo e confira as condições disponíveis no checkout.</p>
          </div>

          <Link href="/" className={styles.ctaButton}>
            Ver produtos
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}