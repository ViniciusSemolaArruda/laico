import type { Metadata } from "next";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Box,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  Home,
  Mail,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Truck,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Trocas e devoluções | Laico",
  description:
    "Consulte as regras da Laico para arrependimento, troca, devolução, reembolso e produtos com vício ou avaria.",
};

const requestSteps = [
  {
    icon: Mail,
    number: "01",
    title: "Entre em contato",
    text: "Informe o número do pedido, o e-mail da compra e uma descrição objetiva da solicitação.",
  },
  {
    icon: Camera,
    number: "02",
    title: "Envie as evidências",
    text: "Quando houver avaria, item incorreto ou faltante, encaminhe fotos da embalagem e do produto.",
  },
  {
    icon: PackageOpen,
    number: "03",
    title: "Receba as orientações",
    text: "Nossa equipe informará o procedimento de postagem, coleta ou análise aplicável ao caso.",
  },
  {
    icon: PackageCheck,
    number: "04",
    title: "Acompanhe a solução",
    text: "Após o recebimento e a conferência, você será informado sobre troca, reparo ou reembolso.",
  },
];

const returnConditions = [
  "Envie todos os acessórios, componentes e itens recebidos com o produto.",
  "Utilize embalagem adequada para evitar danos durante o transporte.",
  "Sempre que possível, preserve a embalagem original e os documentos recebidos.",
  "Não provoque danos, modificações ou sinais de uso inadequado no produto.",
  "Não escreva, cole etiquetas ou fitas diretamente na embalagem comercial do item.",
];

const situations = [
  {
    icon: RefreshCcw,
    title: "Arrependimento",
    label: "Compra online",
    text: "Solicitação em até 7 dias corridos contados do recebimento, nos termos do artigo 49 do CDC.",
  },
  {
    icon: Box,
    title: "Produto incorreto",
    label: "Divergência no pedido",
    text: "Avise assim que identificar que recebeu um produto diferente daquele registrado na compra.",
  },
  {
    icon: AlertTriangle,
    title: "Produto avariado",
    label: "Dano no transporte",
    text: "Fotografe o pacote e o produto. Se perceber a avaria na entrega, registre a ocorrência imediatamente.",
  },
  {
    icon: ShieldCheck,
    title: "Vício ou defeito",
    label: "Garantia legal",
    text: "A análise e a solução observarão os prazos e alternativas assegurados pelo Código de Defesa do Consumidor.",
  },
];

const faqs = [
  {
    question: "Posso devolver uma compra feita pela internet?",
    answer:
      "Sim. O direito de arrependimento pode ser exercido em até 7 dias corridos contados do recebimento do produto ou da assinatura do contrato, conforme o artigo 49 do Código de Defesa do Consumidor.",
  },
  {
    question: "Preciso pagar o frete da devolução?",
    answer:
      "No exercício regular do direito de arrependimento e nos casos de vício, avaria ou erro imputável ao fornecedor, os custos necessários para a devolução não devem ser transferidos ao consumidor. Aguarde nossas instruções antes de postar.",
  },
  {
    question: "Qual é o prazo para reclamar de vício aparente?",
    answer:
      "O CDC estabelece 30 dias para produtos não duráveis e 90 dias para produtos duráveis, contados da entrega efetiva. No vício oculto, a contagem começa quando o problema fica evidenciado.",
  },
  {
    question: "Quando receberei o reembolso?",
    answer:
      "A solicitação é processada depois da validação aplicável. A visualização depende do meio de pagamento: Pix e saldo seguem o processamento do provedor; no cartão, o crédito depende da administradora e do fechamento da fatura.",
  },
  {
    question: "Posso enviar o produto sem falar com a Laico?",
    answer:
      "Não recomendamos. Entre em contato primeiro para receber o procedimento e o endereço corretos. Uma postagem sem autorização pode dificultar a identificação e atrasar a solução.",
  },
];

export default function ReturnsPage() {
  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroPattern} />
        <div className={styles.heroGlow} />

        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
            <Link href="/">
              <Home size={15} aria-hidden="true" />
              Início
            </Link>
            <span aria-hidden="true">/</span>
            <span>Trocas e devoluções</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                <RefreshCcw size={17} aria-hidden="true" />
                Pós-venda transparente
              </span>

              <h1>Trocas e devoluções sem complicação</h1>

              <p>
                Queremos que sua experiência continue tranquila depois da compra.
                Consulte os prazos, as condições e o procedimento para solicitar
                atendimento.
              </p>

              <div className={styles.heroActions}>
                <Link href="/contato" className={styles.primaryButton}>
                  Solicitar atendimento
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link href="#como-solicitar" className={styles.secondaryButton}>
                  Ver o procedimento
                </Link>
              </div>

              <span className={styles.updatedAt}>Atualizado em 11 de agosto de 2026</span>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.returnCard}>
                <div className={styles.returnCardTop}>
                  <span>DEVOLUÇÃO PROTEGIDA</span>
                  <BadgeCheck size={21} />
                </div>

                <div className={styles.returnSymbol}>
                  <PackageOpen size={65} />
                  <RefreshCcw size={28} className={styles.returnArrow} />
                </div>

                <strong>Conte com a nossa equipe</strong>
                <p>Cada solicitação é analisada conforme o caso e a legislação.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.rightStrip}>
        <div className={`${styles.container} ${styles.rightGrid}`}>
          <div>
            <CalendarDays size={23} />
            <span>
              <strong>7 dias</strong>
              Arrependimento na compra online
            </span>
          </div>

          <div>
            <Scale size={23} />
            <span>
              <strong>Direitos preservados</strong>
              Procedimentos conforme o CDC
            </span>
          </div>

          <div>
            <Truck size={23} />
            <span>
              <strong>Logística orientada</strong>
              Aguarde as instruções de envio
            </span>
          </div>

          <div>
            <ReceiptText size={23} />
            <span>
              <strong>Histórico do atendimento</strong>
              Guarde mensagens e comprovantes
            </span>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.rightSection}`}>
        <div className={styles.rightNotice}>
          <div className={styles.rightNoticeIcon}>
            <Scale size={31} aria-hidden="true" />
          </div>

          <div>
            <span>DIREITO DE ARREPENDIMENTO</span>
            <h2>Até 7 dias corridos após o recebimento</h2>
            <p>
              Compras realizadas fora do estabelecimento comercial, inclusive
              pela internet, podem ser canceladas por arrependimento dentro do
              prazo legal. No cancelamento integral, a restituição abrange os
              valores pagos, observados o procedimento e os prazos do meio de pagamento.
            </p>
            <a
              href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm"
              target="_blank"
              rel="noreferrer"
            >
              Consultar o Código de Defesa do Consumidor
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section className={styles.situationsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <span>QUANDO SOLICITAR</span>
            <h2>Situações atendidas</h2>
            <p>
              O procedimento pode variar conforme o motivo. Informe corretamente
              o ocorrido para receber a orientação adequada.
            </p>
          </div>

          <div className={styles.situationsGrid}>
            {situations.map((situation) => {
              const Icon = situation.icon;

              return (
                <article key={situation.title}>
                  <div className={styles.situationIcon}>
                    <Icon size={25} aria-hidden="true" />
                  </div>
                  <span>{situation.label}</span>
                  <h3>{situation.title}</h3>
                  <p>{situation.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="como-solicitar" className={`${styles.container} ${styles.stepsSection}`}>
        <div className={styles.sectionHeading}>
          <span>COMO SOLICITAR</span>
          <h2>Um processo simples e acompanhado</h2>
          <p>
            Não envie o produto antes de receber nossas instruções. Isso ajuda a
            identificar a devolução e evita atrasos.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {requestSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number}>
                <div className={styles.stepTop}>
                  <div className={styles.stepIcon}>
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <span>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.conditionsSection}>
        <div className={`${styles.container} ${styles.conditionsGrid}`}>
          <div className={styles.conditionsContent}>
            <span className={styles.sectionEyebrow}>PREPARE A DEVOLUÇÃO</span>
            <h2>Condições do produto e da embalagem</h2>
            <p>
              Embale o item com cuidado e siga as instruções recebidas. A
              conferência considera o motivo informado e não limita direitos
              assegurados ao consumidor.
            </p>

            <ul>
              {returnConditions.map((condition) => (
                <li key={condition}>
                  <Check size={16} aria-hidden="true" />
                  {condition}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.packageVisual} aria-hidden="true">
            <div className={styles.packageIcon}>
              <FileCheck2 size={54} />
            </div>
            <strong>Conferência responsável</strong>
            <p>Produto, acessórios, embalagem e motivo da solicitação.</p>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.refundSection}`}>
        <div className={styles.sectionHeading}>
          <span>REEMBOLSO</span>
          <h2>Como o valor retorna para você</h2>
          <p>
            Depois da aprovação aplicável, solicitamos a restituição pelo meio
            compatível com o pagamento original.
          </p>
        </div>

        <div className={styles.refundGrid}>
          <article>
            <CircleDollarSign size={26} />
            <h3>Pix ou saldo</h3>
            <p>
              O processamento segue os dados da transação e os prazos informados
              pelo Mercado Pago.
            </p>
          </article>

          <article>
            <CreditCard size={26} />
            <h3>Cartão</h3>
            <p>
              O estorno é solicitado à administradora e pode aparecer conforme o
              fechamento da fatura.
            </p>
          </article>

          <article>
            <Banknote size={26} />
            <h3>Boleto</h3>
            <p>
              Nossa equipe orientará os dados e o procedimento seguro necessários
              para a restituição.
            </p>
          </article>
        </div>
      </section>

      <section className={`${styles.container} ${styles.securityNotice}`}>
        <div className={styles.securityIcon}>
          <ShieldCheck size={29} aria-hidden="true" />
        </div>
        <div>
          <h2>Proteja seus dados</h2>
          <p>
            Para abrir a solicitação, informe apenas os dados necessários para
            localizar o pedido. Nunca envie senha, código de acesso, token, CVV
            ou os dados completos do cartão por e-mail, formulário ou WhatsApp.
          </p>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <span>DÚVIDAS FREQUENTES</span>
            <h2>Troca, devolução e reembolso</h2>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, index) => (
              <details key={faq.question} className={styles.faqItem}>
                <summary>
                  <span>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    {faq.question}
                  </span>
                  <ChevronDown size={20} aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.ctaContent}`}>
          <div>
            <span>PRECISA DE AJUDA?</span>
            <h2>Nossa equipe está pronta para orientar você</h2>
            <p>Tenha o número do pedido e o e-mail da compra em mãos.</p>
          </div>

          <Link href="/contato" className={styles.ctaButton}>
            Solicitar atendimento
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}