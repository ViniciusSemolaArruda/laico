import {
  ChevronRight,
  CircleHelp,
  Clock3,
  Home,
  Mail,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";

import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import CopyEmailButton from "./CopyEmailButton";
import styles from "./ContactPage.module.css";

export const metadata: Metadata = {
  title: "Fale Conosco | Laico",
  description:
    "Entre em contato com o atendimento da Laico e consulte respostas sobre pedidos, pagamentos, entregas, trocas e cancelamentos.",
};

const orderQuestions = [
  {
    question: "Como acompanho o status do meu pedido?",
    answer: (
      <>
        Acesse a página <Link href="/meus-pedidos">Meus pedidos</Link> usando
        sua conta. Se a compra foi feita como visitante, utilize o link seguro
        enviado ao e-mail informado no checkout. O status é atualizado conforme
        as confirmações de pagamento e as etapas de preparação e envio.
      </>
    ),
  },
  {
    question: "Qual é o prazo de aprovação do meu pedido?",
    answer: (
      <>
        A aprovação depende do meio de pagamento. O Pix normalmente é
        identificado em pouco tempo, enquanto boleto e cartão podem depender da
        compensação bancária ou da análise do emissor. O pedido será atualizado
        automaticamente assim que o provedor confirmar o pagamento.
      </>
    ),
  },
  {
    question:
      "Paguei por Pix ou boleto e recebi um e-mail de cancelamento. O que devo fazer?",
    answer: (
      <>
        Confira se o pagamento foi realizado antes do vencimento e guarde o
        comprovante. Depois, envie ao atendimento o número do pedido e o
        comprovante, sem compartilhar senha ou dados bancários sensíveis. Nossa
        equipe verificará a confirmação junto ao provedor de pagamentos.
      </>
    ),
  },
  {
    question:
      "Paguei com cartão e recebi um e-mail de cancelamento. O que aconteceu?",
    answer: (
      <>
        A transação pode ter sido recusada pelo emissor, pelo limite disponível
        ou por uma análise de segurança. A Laico não recebe o motivo bancário
        detalhado. Consulte o aplicativo ou a central do cartão e, se desejar,
        faça uma nova compra utilizando outro meio de pagamento.
      </>
    ),
  },
  {
    question:
      "Finalizei o pedido, mas quero trocar um dos produtos. O que devo fazer?",
    answer: (
      <>
        Um pedido concluído não pode ter seus itens editados. Entre em contato o
        quanto antes. Se ele ainda não tiver sido separado ou enviado,
        verificaremos a possibilidade de cancelamento para que uma nova compra
        seja realizada. Depois do recebimento, consulte nossa página de{" "}
        <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>.
      </>
    ),
  },
  {
    question:
      "O pedido está aguardando pagamento. Como solicito o cancelamento?",
    answer: (
      <>
        Pedidos não pagos podem ser cancelados automaticamente após o vencimento
        da cobrança. Se precisar de atendimento antes disso, envie o número do
        pedido por e-mail. Não efetue o pagamento de uma cobrança que você
        deseja cancelar.
      </>
    ),
  },
  {
    question: "Posso adicionar um produto a um pedido já finalizado?",
    answer: (
      <>
        Não. Por segurança, valores e itens de um pedido finalizado não podem ser
        alterados. O produto adicional deverá ser comprado em um novo pedido,
        com cálculo próprio de pagamento e entrega.
      </>
    ),
  },
] as const;

const deliveryQuestions = [
  {
    question: "Como acompanho a entrega da minha encomenda?",
    answer: (
      <>
        Quando a encomenda for postada e houver código de rastreio, ele ficará
        disponível no acompanhamento do pedido. Você também poderá receber a
        atualização no e-mail utilizado na compra.
      </>
    ),
  },
  {
    question: "Como o prazo e o valor do frete são calculados?",
    answer: (
      <>
        O cálculo considera o CEP de destino, a modalidade escolhida e os dados
        reais dos produtos, como peso e dimensões. Consulte mais detalhes em{" "}
        <Link href="/prazo-de-entrega">Frete e prazo de entrega</Link>.
      </>
    ),
  },
  {
    question: "Meu pedido está atrasado. O que devo fazer?",
    answer: (
      <>
        Primeiro, consulte as atualizações do rastreamento. Se a estimativa já
        tiver terminado ou o rastreio estiver sem movimentação por um período
        incomum, envie o número do pedido ao atendimento para verificarmos a
        situação com a transportadora.
      </>
    ),
  },
  {
    question: "Posso alterar o endereço depois de finalizar a compra?",
    answer: (
      <>
        Entre em contato imediatamente. Por segurança, a alteração pode não ser
        possível depois da separação ou postagem. Sempre confira CEP, rua,
        número, complemento, bairro, cidade e estado antes de pagar.
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

      <section className={styles.container}>
        <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
          <Link href="/">
            <Home size={14} aria-hidden="true" />
            Início
          </Link>

          <ChevronRight size={13} aria-hidden="true" />
          <span aria-current="page">Fale conosco</span>
        </nav>

        <header className={styles.hero}>
          <span className={styles.eyebrow}>Central de atendimento</span>

          <h1>Fale conosco</h1>

          <p>
            O e-mail é o nosso principal canal de atendimento. Todas as
            mensagens são analisadas pela equipe e respondidas com atenção,
            segurança e clareza.
          </p>
        </header>

        <section className={styles.emailCard}>
          <div className={styles.emailIcon}>
            <Mail size={30} aria-hidden="true" />
          </div>

          <div className={styles.emailContent}>
            <span>Atendimento por e-mail</span>

            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>

            <p>
              Fique tranquilo: sua solicitação será respondida de maneira clara
              e eficaz dentro do nosso horário de atendimento.
            </p>
          </div>

          <CopyEmailButton email={supportEmail} />
        </section>

        <div className={styles.infoGrid}>
          <article className={styles.infoCard}>
            <Clock3 aria-hidden="true" />
            <div>
              <strong>Horário de atendimento</strong>
              <p>
                Segunda a sexta, das 8h às 18h
                <br />
                Sábado, das 8h às 12h
              </p>
            </div>
          </article>

          <article className={styles.infoCard}>
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>Atendimento seguro</strong>
              <p>
                Nunca solicitamos sua senha, código de segurança ou número
                completo do cartão.
              </p>
            </div>
          </article>
        </div>

        <aside className={styles.emailNotice}>
          <Mail size={20} aria-hidden="true" />
          <div>
            <strong>Não encontrou nossa resposta?</strong>
            <p>
              No Gmail, confira as abas Spam e Promoções. No Outlook ou Hotmail,
              confira Lixo eletrônico e a pasta Outros. Adicione nosso endereço
              aos seus contatos para facilitar o recebimento.
            </p>
          </div>
        </aside>

        <section className={styles.faqSection}>
          <header className={styles.sectionHeader}>
            <CircleHelp size={28} aria-hidden="true" />
            <div>
              <span>Central de ajuda</span>
              <h2>Dúvidas frequentes</h2>
              <p>
                Consulte as respostas abaixo. Se não encontrar o que procura,
                envie sua dúvida para o nosso atendimento por e-mail.
              </p>
            </div>
          </header>

          <FaqGroup
            icon={<PackageCheck size={23} aria-hidden="true" />}
            title="Dúvidas sobre o seu pedido"
            items={orderQuestions}
          />

          <FaqGroup
            icon={<Truck size={23} aria-hidden="true" />}
            title="Dúvidas sobre a entrega"
            items={deliveryQuestions}
          />
        </section>

        <section className={styles.finalHelp}>
          <Mail size={27} aria-hidden="true" />
          <div>
            <h2>Ainda possui alguma dúvida?</h2>
            <p>
              Envie o número do pedido e o e-mail utilizado na compra. Nunca
              envie senha ou dados completos do cartão.
            </p>
          </div>
          <a href={`mailto:${supportEmail}`}>Enviar e-mail</a>
        </section>
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
      <h3>
        {icon}
        {title}
      </h3>

      <div className={styles.questions}>
        {items.map((item) => (
          <details key={item.question} className={styles.question}>
            <summary>
              <span>{item.question}</span>
              <span className={styles.plus} aria-hidden="true">
                +
              </span>
            </summary>

            <div className={styles.answer}>{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
