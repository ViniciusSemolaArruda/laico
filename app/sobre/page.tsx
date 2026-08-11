import type { Metadata } from "next";
import Link from "next/link";

import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  Compass,
  HandHeart,
  HeartHandshake,
  Home,
  Landmark,
  Leaf,
  LockKeyhole,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Sobre a Laico | Fé, cultura e respeito",
  description:
    "Conheça a Laico, nossa missão e nosso compromisso com a diversidade religiosa e cultural.",
};

const commitments = [
  {
    icon: HeartHandshake,
    title: "Respeito à diversidade",
    text: "Valorizamos diferentes crenças, tradições, culturas e formas de viver a espiritualidade.",
  },
  {
    icon: BadgeCheck,
    title: "Informação transparente",
    text: "Apresentamos características, preços, condições de pagamento e entrega com clareza.",
  },
  {
    icon: LockKeyhole,
    title: "Privacidade e segurança",
    text: "Tratamos dados pessoais e pagamentos com responsabilidade e proteção técnica.",
  },
  {
    icon: MessageCircle,
    title: "Atendimento próximo",
    text: "Mantemos canais acessíveis para orientar o cliente antes e depois da compra.",
  },
  {
    icon: Leaf,
    title: "Evolução responsável",
    text: "Buscamos melhorar continuamente nosso catálogo, fornecedores e processos.",
  },
  {
    icon: Scale,
    title: "Relações equilibradas",
    text: "Respeitamos o consumidor e trabalhamos para resolver cada situação com justiça.",
  },
];

const principles = [
  "Respeito acima de qualquer diferença",
  "Clareza em toda a jornada de compra",
  "Segurança na proteção dos clientes",
  "Cuidado na seleção dos produtos",
  "Escuta ativa e melhoria contínua",
];

export default function AboutPage() {
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
            <span>Sobre a Laico</span>
          </nav>

          <div className={styles.heroGrid}>
            <div className={styles.heroContent}>
              <span className={styles.eyebrow}>
                <Sparkles size={17} aria-hidden="true" />
                Conheça a Laico
              </span>

              <h1>Fé, cultura e respeito em um só lugar</h1>

              <p>
                A Laico reúne produtos que representam diferentes tradições,
                histórias e formas de expressão da espiritualidade, sempre com
                acolhimento, segurança e respeito.
              </p>

              <div className={styles.heroActions}>
                <Link href="/catalogo" className={styles.primaryButton}>
                  Conhecer o catálogo
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>

                <Link href="#nossa-missao" className={styles.secondaryButton}>
                  Nossa missão
                </Link>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.symbolCard}>
                <div className={styles.symbolTop}>
                  <span>LAICO</span>
                  <Compass size={22} />
                </div>

                <div className={styles.symbolCenter}>
                  <div className={styles.orbitOne} />
                  <div className={styles.orbitTwo} />
                  <HandHeart size={60} />
                </div>

                <strong>Diversidade que aproxima</strong>
                <p>Um espaço construído para todas as tradições.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valueStrip}>
        <div className={`${styles.container} ${styles.valueGrid}`}>
          <div>
            <UsersRound size={23} />
            <span>
              <strong>Pluralidade</strong>
              Diferentes culturas e tradições
            </span>
          </div>

          <div>
            <ShieldCheck size={23} />
            <span>
              <strong>Confiança</strong>
              Compra clara e protegida
            </span>
          </div>

          <div>
            <HandHeart size={23} />
            <span>
              <strong>Acolhimento</strong>
              Respeito em cada atendimento
            </span>
          </div>

          <div>
            <BookOpen size={23} />
            <span>
              <strong>Significado</strong>
              Produtos com história e propósito
            </span>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.aboutSection}`}>
        <div className={styles.aboutGrid}>
          <div className={styles.sectionHeading}>
            <span>SOBRE NÓS</span>
            <h2>Uma loja criada para aproximar pessoas e significados</h2>
          </div>

          <div className={styles.aboutText}>
            <p>
              A Laico nasceu para aproximar pessoas de símbolos, presentes e
              artigos ligados à fé, à cultura e à espiritualidade. Nossa proposta
              é oferecer uma experiência de compra acolhedora, segura e respeitosa.
            </p>

            <p>
              Trabalhamos para construir um catálogo plural, com informações
              claras e produtos selecionados com atenção à qualidade e ao
              significado que carregam.
            </p>

            <p>
              Mais do que comercializar produtos, queremos contribuir para uma
              convivência em que diferentes identidades possam ser reconhecidas
              com dignidade.
            </p>
          </div>
        </div>
      </section>

      <section id="nossa-missao" className={styles.missionSection}>
        <div className={`${styles.container} ${styles.missionGrid}`}>
          <div className={styles.missionVisual} aria-hidden="true">
            <div className={styles.missionIcon}>
              <Landmark size={48} />
            </div>
            <span>PROPÓSITO</span>
          </div>

          <div className={styles.missionContent}>
            <span className={styles.sectionEyebrow}>NOSSA MISSÃO</span>
            <h2>Promover respeito por meio de produtos e experiências</h2>
            <p>
              Nossa missão é valorizar a diversidade religiosa e cultural,
              oferecendo produtos que representem diferentes crenças, tradições
              e identidades com cuidado, informação e responsabilidade.
            </p>

            <ul>
              {principles.map((principle) => (
                <li key={principle}>
                  <Check size={16} aria-hidden="true" />
                  {principle}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.commitmentsSection}`}>
        <div className={styles.sectionHeading}>
          <span>NOSSOS COMPROMISSOS</span>
          <h2>Princípios presentes em cada escolha</h2>
          <p>
            Da seleção do catálogo ao pós-venda, nossas decisões seguem valores
            que protegem o cliente e fortalecem uma convivência respeitosa.
          </p>
        </div>

        <div className={styles.commitmentsGrid}>
          {commitments.map((commitment) => {
            const Icon = commitment.icon;

            return (
              <article key={commitment.title}>
                <div className={styles.commitmentIcon}>
                  <Icon size={25} aria-hidden="true" />
                </div>
                <h3>{commitment.title}</h3>
                <p>{commitment.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${styles.container} ${styles.informationBox}`}>
        <div className={styles.informationIcon}>
          <HeartHandshake size={30} aria-hidden="true" />
        </div>

        <div>
          <span>UM ESPAÇO PARA TODOS</span>
          <h2>A Laico não representa exclusivamente uma religião</h2>
          <p>
            Nosso trabalho é pautado pelo respeito, pela inclusão e pela
            convivência entre diferentes tradições. Não toleramos discriminação,
            intolerância religiosa ou desrespeito às manifestações culturais.
          </p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={`${styles.container} ${styles.ctaContent}`}>
          <div>
            <span>QUER CONHECER MAIS?</span>
            <h2>Estamos aqui para conversar com você</h2>
            <p>
              Fale com nossa equipe para tirar dúvidas sobre a Laico ou sobre
              sua experiência de compra.
            </p>
          </div>

          <Link href="/contato" className={styles.ctaButton}>
            Fale conosco
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}