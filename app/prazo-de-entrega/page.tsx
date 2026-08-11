import type { Metadata } from "next";
import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Box,
  CalendarClock,
  ChevronDown,
  Clock3,
  Home,
  LocateFixed,
  MapPin,
  PackageCheck,
  PackageSearch,
  Route,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Prazo de entrega | Laico",
  description:
    "Entenda como calculamos o frete, o prazo de entrega e o rastreamento dos pedidos da Laico para todo o Brasil.",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getFreeShippingMinimum() {
  const configuredValue = Number(
    process.env.FREE_SHIPPING_MINIMUM ?? "1000"
  );

  return Number.isFinite(configuredValue) && configuredValue >= 0
    ? configuredValue
    : 1000;
}

const deliverySteps = [
  {
    icon: MapPin,
    number: "01",
    title: "Informe o CEP",
    text: "Digite o CEP de destino no carrinho ou no checkout para consultar as modalidades disponíveis.",
  },
  {
    icon: Route,
    number: "02",
    title: "Escolha a entrega",
    text: "Compare preço e prazo estimado e selecione a opção mais adequada para o seu pedido.",
  },
  {
    icon: PackageCheck,
    number: "03",
    title: "Aguarde a aprovação",
    text: "A preparação começa depois que o pagamento é confirmado oficialmente pelo Mercado Pago.",
  },
  {
    icon: Truck,
    number: "04",
    title: "Acompanhe o envio",
    text: "Quando a postagem for realizada, o código de rastreamento ficará disponível no seu pedido.",
  },
];

const factors = [
  {
    icon: LocateFixed,
    title: "CEP de destino",
    text: "A distância e a região atendida influenciam as modalidades, o preço e o prazo.",
  },
  {
    icon: Box,
    title: "Peso e dimensões",
    text: "O cálculo considera os dados reais cadastrados para os produtos do seu carrinho.",
  },
  {
    icon: ShoppingBag,
    title: "Quantidade de itens",
    text: "O pacote é calculado novamente quando produtos ou quantidades são alterados.",
  },
  {
    icon: CalendarClock,
    title: "Modalidade escolhida",
    text: "Cada serviço possui condições e previsão de entrega próprias para cada CEP.",
  },
];

const faqs = [
  {
    question: "Quando começa a contar o prazo de entrega?",
    answer:
      "O prazo apresentado no checkout é uma estimativa logística. A preparação do pedido começa após a confirmação oficial do pagamento. Fins de semana e feriados podem não ser considerados dias úteis.",
  },
  {
    question: "O prazo mostrado no checkout é garantido?",
    answer:
      "Ele é uma previsão fornecida no momento da cotação. Situações externas, como eventos climáticos, restrições locais, greves, áreas de risco ou aumento excepcional de demanda podem alterar a entrega.",
  },
  {
    question: "Como acompanho meu pedido?",
    answer:
      "Depois da postagem, consulte Minha conta > Meus pedidos. O código e o link de rastreamento aparecerão quando forem disponibilizados pela transportadora.",
  },
  {
    question: "Posso alterar o endereço depois da compra?",
    answer:
      "Por segurança, normalmente não é possível alterar o endereço após a confirmação do pedido. Entre em contato imediatamente com o atendimento; a possibilidade dependerá da etapa de processamento.",
  },
  {
    question: "O que acontece se ninguém receber a encomenda?",
    answer:
      "A transportadora poderá realizar novas tentativas ou encaminhar o pacote para retirada, conforme as regras do serviço. Se a encomenda retornar, nossa equipe entrará em contato para orientar os próximos passos.",
  },
];

export default function DeliveryTimePage() {
  const freeShippingMinimum = getFreeShippingMinimum();

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero}>
        <div className={styles.heroPattern} />

        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
            <Link href="/">
              <Home size={15} aria-hidden="true" />
              Início
            </Link>
            <span aria-hidden="true">/</span>
            <span>Prazo de entrega</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                <Truck size={17} aria-hidden="true" />
                Entrega para todo o Brasil
              </span>

              <h1>Seu pedido acompanhado do início ao destino</h1>

              <p>
                O frete é calculado com o CEP, o peso e as dimensões reais dos
                produtos. Você compara as modalidades e conhece o valor e a
                estimativa antes de finalizar a compra.
              </p>

              <div className={styles.heroActions}>
                <Link href="/" className={styles.primaryButton}>
                  Comprar agora
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link href="/contato" className={styles.secondaryButton}>
                  Falar com atendimento
                </Link>
              </div>
            </div>

            <div className={styles.routeVisual} aria-hidden="true">
              <div className={styles.mapCard}>
                <div className={styles.mapTop}>
                  <span>ACOMPANHAMENTO</span>
                  <BadgeCheck size={20} />
                </div>

                <div className={styles.routeLine}>
                  <span className={styles.routeStart} />
                  <span className={styles.routeProgress} />
                  <Truck size={27} className={styles.routeTruck} />
                  <span className={styles.routeEnd} />
                </div>

                <div className={styles.routeLabels}>
                  <span>
                    <strong>Pedido enviado</strong>
                    Origem
                  </span>
                  <span>
                    <strong>Em transporte</strong>
                    Rastreável
                  </span>
                  <span>
                    <strong>Seu endereço</strong>
                    Destino
                  </span>
                </div>

                <div className={styles.mapStatus}>
                  <PackageSearch size={22} />
                  <span>
                    <strong>Status atualizado</strong>
                    Consulte em Meus pedidos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.summaryStrip}>
        <div className={`${styles.container} ${styles.summaryGrid}`}>
          <div>
            <Truck size={23} />
            <span>
              <strong>Cobertura nacional</strong>
              Modalidades conforme o CEP
            </span>
          </div>

          <div>
            <Clock3 size={23} />
            <span>
              <strong>Prazo antes da compra</strong>
              Estimativa exibida no checkout
            </span>
          </div>

          <div>
            <ShieldCheck size={23} />
            <span>
              <strong>Cálculo protegido</strong>
              Valor validado no servidor
            </span>
          </div>

          <div>
            <PackageCheck size={23} />
            <span>
              <strong>Pedido rastreável</strong>
              Acompanhamento após a postagem
            </span>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.stepsSection}`}>
        <div className={styles.sectionHeading}>
          <span>COMO FUNCIONA</span>
          <h2>Da cotação até a entrega</h2>
          <p>
            Você conhece as condições antes de pagar e acompanha o pedido depois
            que ele deixa nossa operação.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          {deliverySteps.map((step) => {
            const Icon = step.icon;

            return (
              <article key={step.number} className={styles.stepCard}>
                <div className={styles.stepTop}>
                  <div className={styles.stepIcon}>
                    <Icon size={25} aria-hidden="true" />
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

      <section className={styles.calculationSection}>
        <div className={`${styles.container} ${styles.calculationGrid}`}>
          <div className={styles.calculationContent}>
            <span className={styles.sectionEyebrow}>CÁLCULO PERSONALIZADO</span>
            <h2>Por que o frete muda para cada pedido?</h2>
            <p>
              Não utilizamos um valor fixo inventado pelo navegador. A cotação é
              refeita com os dados do carrinho e do destino, e o checkout valida
              novamente a opção escolhida antes de criar o pedido.
            </p>

            <div className={styles.freeShippingBox}>
              <div>
                <Truck size={25} aria-hidden="true" />
              </div>
              <span>
                <strong>Frete grátis</strong>
                Compras elegíveis a partir de {formatCurrency(freeShippingMinimum)},
                conforme as regras apresentadas no checkout.
              </span>
            </div>
          </div>

          <div className={styles.factorsGrid}>
            {factors.map((factor) => {
              const Icon = factor.icon;

              return (
                <article key={factor.title}>
                  <Icon size={23} aria-hidden="true" />
                  <h3>{factor.title}</h3>
                  <p>{factor.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.timelineSection}`}>
        <div className={styles.sectionHeading}>
          <span>ENTENDA O PRAZO</span>
          <h2>Processamento e transporte são etapas diferentes</h2>
        </div>

        <div className={styles.timeline}>
          <article>
            <span className={styles.timelineNumber}>1</span>
            <div>
              <h3>Confirmação do pagamento</h3>
              <p>
                O pedido aguarda a confirmação oficial. Pix costuma ser rápido;
                cartão pode passar por análise e boleto depende de compensação.
              </p>
            </div>
          </article>

          <article>
            <span className={styles.timelineNumber}>2</span>
            <div>
              <h3>Separação e preparação</h3>
              <p>
                Após a aprovação, os produtos são conferidos, protegidos e
                preparados para postagem.
              </p>
            </div>
          </article>

          <article>
            <span className={styles.timelineNumber}>3</span>
            <div>
              <h3>Prazo da transportadora</h3>
              <p>
                Depois da postagem começa a etapa logística, seguindo a previsão
                da modalidade selecionada e as condições da região.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className={`${styles.container} ${styles.notice}`}>
        <div className={styles.noticeIcon}>
          <AlertTriangle size={27} aria-hidden="true" />
        </div>
        <div>
          <h2>O prazo é uma estimativa</h2>
          <p>
            Feriados, condições climáticas, restrições de acesso, áreas remotas,
            greves, fiscalizações e períodos de alta demanda podem afetar a entrega.
            Confira seus dados com atenção: endereço incompleto ou incorreto também
            pode provocar atraso ou devolução da encomenda.
          </p>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <span>DÚVIDAS FREQUENTES</span>
            <h2>Informações sobre sua entrega</h2>
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
            <span>ACOMPANHE COM TRANQUILIDADE</span>
            <h2>Consulte seus pedidos em um só lugar</h2>
            <p>
              Veja o status verdadeiro, o histórico e o rastreamento disponível.
            </p>
          </div>

          <Link href="/meus-pedidos" className={styles.ctaButton}>
            Meus pedidos
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}