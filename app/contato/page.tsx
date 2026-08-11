import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Headphones,
  Home,
  Mail,
  MessageCircle,
  PackageCheck,
  Send,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import CopyEmailButton from "./CopyEmailButton";
import styles from "./ContactPage.module.css";

export const metadata: Metadata = {
  title: "Fale conosco | Laico",
  description:
    "Entre em contato com a Laico e consulte respostas sobre pedidos, pagamentos, entregas, trocas e cancelamentos.",
};

const orderQuestions = [
  {
    question: "Como acompanho o status do meu pedido?",
    answer: (
      <>
        Acesse <Link href="/meus-pedidos">Meus pedidos</Link> usando sua conta.
        Se a compra foi feita como visitante, utilize o link seguro enviado ao
        e-mail informado no checkout. O status é atualizado conforme as
        confirmações de pagamento e as etapas de preparação e envio.
      </>
    ),
  },
  {
    question: "Qual é o prazo de aprovação do meu pedido?",
    answer: (
      <>
        A aprovação depende do meio de pagamento. O Pix normalmente é
        identificado rapidamente, enquanto boleto e cartão podem depender de
        compensação bancária ou análise do emissor. O pedido será atualizado
        quando o provedor confirmar o pagamento.
      </>
    ),
  },
  {
    question: "Paguei por Pix ou boleto e recebi um aviso de cancelamento. O que faço?",
    answer: (
      <>
        Verifique se o pagamento foi realizado antes do vencimento e guarde o
        comprovante. Envie ao atendimento o número do pedido e o comprovante,
        sem compartilhar senha ou dados bancários sensíveis.
      </>
    ),
  },
  {
    question: "Paguei com cartão e meu pedido foi cancelado. O que aconteceu?",
    answer: (
      <>
        A transação pode ter sido recusada pelo emissor, pelo limite disponível
        ou por análise de segurança. A Laico não recebe o motivo bancário
        detalhado. Consulte a central do cartão antes de tentar novamente.
      </>
    ),
  },
  {
    question: "Quero trocar um item de um pedido já finalizado. O que faço?",
    answer: (
      <>
        Um pedido concluído não pode ter seus itens editados. Entre em contato
        imediatamente. Depois do recebimento, consulte nossa página de{" "}
        <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>.
      </>
    ),
  },
  {
    question: "O pedido está aguardando pagamento. Como solicito o cancelamento?",
    answer: (
      <>
        Pedidos não pagos podem ser cancelados automaticamente após o vencimento.
        Se precisar de atendimento antes disso, envie o número do pedido por
        e-mail e não pague uma cobrança que deseja cancelar.
      </>
    ),
  },
  {
    question: "Posso adicionar um produto a um pedido finalizado?",
    answer: (
      <>
        Não. Por segurança, valores e itens de um pedido finalizado não podem ser
        alterados. O produto adicional deverá ser comprado em um novo pedido.
      </>
    ),
  },
] as const;

const deliveryQuestions = [
  {
    question: "Como acompanho a entrega da minha encomenda?",
    answer: (
      <>
        Quando houver postagem e código de rastreamento, ele ficará disponível
        no acompanhamento do pedido. Você também poderá receber a atualização
        no e-mail utilizado na compra.
      </>
    ),
  },
  {
    question: "Como o prazo e o valor do frete são calculados?",
    answer: (
      <>
        O cálculo considera CEP, modalidade e dados reais dos produtos, como peso
        e dimensões. Consulte <Link href="/prazo-de-entrega">Frete e prazo</Link>.
      </>
    ),
  },
  {
    question: "Meu pedido está atrasado. O que devo fazer?",
    answer: (
      <>
        Consulte primeiro o rastreamento. Se a estimativa terminou ou não há
        movimentação por um período incomum, envie o número do pedido ao nosso
        atendimento.
      </>
    ),
  },
  {
    question: "Posso alterar o endereço depois da compra?",
    answer: (
      <>
        Entre em contato imediatamente. Por segurança, a alteração pode não ser
        possível depois da separação ou da postagem. Confira todos os dados antes
        de finalizar o pagamento.
      </>
    ),
  },
] as const;

export default function ContactPage() {
  const supportEmail =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    "conta@conta.capadociaproducoes.com.br";

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.heroSection}>
        <div className={styles.heroPattern} />
        <div className={styles.heroGlow} />

        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
            <Link href="/">
              <Home size={15} aria-hidden="true" />
              Início
            </Link>
            <ChevronRight size={14} aria-hidden="true" />
            <span aria-current="page">Fale conosco</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                <Headphones size={17} aria-hidden="true" />
                Central de atendimento
              </span>

              <h1>Fale com a equipe da Laico</h1>

              <p>
                O e-mail é nosso principal canal de atendimento. Todas as
                mensagens são analisadas com atenção, segurança e clareza.
              </p>

              <a href={`mailto:${supportEmail}`} className={styles.heroButton}>
                Enviar e-mail
                <Send size={17} aria-hidden="true" />
              </a>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.supportCard}>
                <div className={styles.supportTop}>
                  <span>ATENDIMENTO LAICO</span>
                  <BadgeCheck size={21} />
                </div>

                <div className={styles.supportSymbol}>
                  <MessageCircle size={62} />
                  <Sparkles size={24} className={styles.supportSpark} />
                </div>

                <strong>Estamos aqui para ajudar</strong>
                <p>Pedidos, pagamentos, entregas, trocas e outras dúvidas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.serviceStrip}>
        <div className={`${styles.container} ${styles.serviceGrid}`}>
          <div>
            <Mail size={23} />
            <span>
              <strong>Canal oficial</strong>
              Atendimento por e-mail
            </span>
          </div>
          <div>
            <Clock3 size={23} />
            <span>
              <strong>Horário comercial</strong>
              Segunda a sábado
            </span>
          </div>
          <div>
            <ShieldCheck size={23} />
            <span>
              <strong>Contato seguro</strong>
              Nunca pedimos sua senha
            </span>
          </div>
          <div>
            <CircleHelp size={23} />
            <span>
              <strong>Central de ajuda</strong>
              Respostas para dúvidas comuns
            </span>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.contactSection}`}>
        <div className={styles.sectionHeading}>
          <span>ATENDIMENTO POR E-MAIL</span>
          <h2>Envie sua mensagem para nossa equipe</h2>
          <p>
            Informe o número do pedido quando sua dúvida estiver relacionada a
            uma compra. Isso ajuda a localizar o atendimento com mais rapidez.
          </p>
        </div>

        <section className={styles.emailCard}>
          <div className={styles.emailIcon}>
            <Mail size={30} aria-hidden="true" />
          </div>

          <div className={styles.emailContent}>
            <span>E-mail oficial de atendimento</span>
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            <p>
              Sua solicitação será respondida dentro do nosso horário de atendimento.
            </p>
          </div>

          <CopyEmailButton email={supportEmail} />
        </section>

        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <Clock3 aria-hidden="true" />
            <div>
              <strong>Horário de atendimento</strong>
              <p>Segunda a sexta, das 8h às 18h<br />Sábado, das 8h às 12h</p>
            </div>
          </article>

          <article className={styles.infoCard}>
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Atendimento protegido</strong>
              <p>Nunca envie senha, CVV, token ou número completo do cartão.</p>
            </div>
          </article>
        </div>

        <aside className={styles.emailNotice}>
          <Mail size={21} aria-hidden="true" />
          <div>
            <strong>Não encontrou nossa resposta?</strong>
            <p>
              No Gmail, confira Spam e Promoções. No Outlook ou Hotmail, consulte
              Lixo eletrônico e Outros. Adicione nosso endereço aos seus contatos.
            </p>
          </div>
        </aside>
      </section>

      <section id="duvidas-frequentes" className={styles.faqSection}>
        <div className={styles.container}>
          <header className={styles.sectionHeading}>
            <span>CENTRAL DE AJUDA</span>
            <h2>Dúvidas frequentes</h2>
            <p>
              Consulte as respostas abaixo. Se não encontrar o que procura,
              envie sua dúvida para o atendimento.
            </p>
          </header>

          <div className={styles.faqColumns}>
            <FaqGroup
              icon={<PackageCheck size={23} aria-hidden="true" />}
              title="Dúvidas sobre seu pedido"
              items={orderQuestions}
            />

            <FaqGroup
              icon={<Truck size={23} aria-hidden="true" />}
              title="Dúvidas sobre a entrega"
              items={deliveryQuestions}
            />
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.finalHelp}`}>
          <div className={styles.finalIcon}>
            <Mail size={29} aria-hidden="true" />
          </div>
          <div>
            <span>AINDA POSSUI ALGUMA DÚVIDA?</span>
            <h2>Envie uma mensagem para a Laico</h2>
            <p>
              Tenha o número do pedido e o e-mail da compra em mãos. Nunca envie
              senha ou dados completos do cartão.
            </p>
          </div>
          <a href={`mailto:${supportEmail}`}>
            Enviar e-mail
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function FaqGroup({
  icon,
  title,
  items,
}: {
  icon: ReactNode;
  title: string;
  items: readonly {
    question: string;
    answer: ReactNode;
  }[];
}) {
  return (
    <section className={styles.faqGroup}>
      <h3>{icon}{title}</h3>

      <div>
        {items.map((item) => (
          <details key={item.question} className={styles.question}>
            <summary>
              <span>{item.question}</span>
              <ChevronDown size={19} aria-hidden="true" />
            </summary>
            <div className={styles.answer}>{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}