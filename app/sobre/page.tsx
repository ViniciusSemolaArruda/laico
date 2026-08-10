import InstitutionalPage, {
  InformationBox,
  InstitutionalSection,
} from "@/components/institutional/InstitutionalPage";

export const metadata = {
  title: "Sobre a Laico",
  description:
    "Conheça a Laico, nossa missão e nosso compromisso com a diversidade religiosa e cultural.",
};

export default function AboutPage() {
  return (
    <InstitutionalPage
      eyebrow="Conheça a Laico"
      title="Fé, cultura e respeito em um só lugar"
      description="A Laico reúne produtos que representam diferentes tradições, histórias e formas de expressão da espiritualidade."
    >
      <InstitutionalSection title="Sobre nós">
        <p>
          A Laico nasceu para aproximar pessoas de símbolos, presentes e
          artigos ligados à fé, à cultura e à espiritualidade. Nossa proposta é
          oferecer uma experiência de compra acolhedora, segura e respeitosa.
        </p>

        <p>
          Trabalhamos para construir um catálogo plural, com informações claras
          e produtos selecionados com atenção à qualidade e ao significado que
          carregam.
        </p>
      </InstitutionalSection>

      <InstitutionalSection id="nossa-missao" title="Nossa missão">
        <p>
          Promover o respeito à diversidade religiosa e cultural por meio de
          produtos e experiências que valorizem diferentes crenças, tradições e
          identidades.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="Nossos compromissos">
        <ul className="list-disc space-y-2 pl-5 marker:text-[#b98218]">
          <li>Respeitar todas as crenças e manifestações culturais.</li>
          <li>Apresentar preços, características e condições com clareza.</li>
          <li>Proteger os dados pessoais dos nossos clientes.</li>
          <li>Manter atendimento acessível antes e depois da compra.</li>
          <li>Buscar fornecedores e processos responsáveis.</li>
        </ul>
      </InstitutionalSection>

      <InformationBox>
        A Laico não representa exclusivamente uma religião. Nosso trabalho é
        pautado pelo respeito, pela inclusão e pela convivência entre diferentes
        tradições.
      </InformationBox>
    </InstitutionalPage>
  );
}
