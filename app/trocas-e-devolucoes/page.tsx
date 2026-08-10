import Link from "next/link";

import InstitutionalPage, {
  InformationBox,
  InstitutionalSection,
} from "@/components/institutional/InstitutionalPage";

export const metadata = {
  title: "Trocas e Devoluções",
  description:
    "Consulte as regras para arrependimento, troca, devolução e produtos com defeito.",
};

export default function ReturnsPage() {
  return (
    <InstitutionalPage
      title="Trocas e devoluções"
      description="Queremos que sua experiência seja tranquila também depois da compra. Consulte abaixo os prazos e procedimentos."
      updatedAt="10 de agosto de 2026"
    >
      <InformationBox>
        Compras realizadas pela internet podem ser canceladas por arrependimento
        em até <strong>7 dias corridos após o recebimento</strong>, conforme o
        artigo 49 do Código de Defesa do Consumidor.
      </InformationBox>

      <InstitutionalSection title="Direito de arrependimento">
        <p>
          Para solicitar a devolução, entre em contato dentro do prazo de sete
          dias corridos contado do recebimento. Informe o número do pedido e o
          motivo da solicitação.
        </p>
        <p>
          Enviaremos as orientações de postagem ou coleta. Os valores pagos,
          inclusive o frete original quando aplicável ao cancelamento integral,
          serão restituídos depois da conferência do produto, observados os
          prazos do meio de pagamento.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="Condições do produto devolvido">
        <ul className="list-disc space-y-2 pl-5 marker:text-[#b98218]">
          <li>Envie o produto com seus acessórios e componentes.</li>
          <li>Utilize embalagem adequada para evitar danos no transporte.</li>
          <li>
            Sempre que possível, preserve a embalagem original e a documentação
            recebida.
          </li>
          <li>
            O produto não deve apresentar dano causado por uso inadequado pelo
            consumidor.
          </li>
        </ul>
      </InstitutionalSection>

      <InstitutionalSection title="Produto incorreto, avariado ou com defeito">
        <p>
          Se o pedido chegar avariado, diferente do comprado ou com item
          faltando, fotografe a embalagem e o produto e entre em contato assim
          que identificar o problema.
        </p>
        <p>
          Produtos com possível defeito serão tratados conforme as garantias e
          os prazos previstos no Código de Defesa do Consumidor. A análise não
          limita direitos assegurados por lei.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="Reembolso">
        <p>
          O reembolso será solicitado após a aprovação da devolução. O prazo de
          visualização depende do meio de pagamento e, no caso de cartão, das
          regras da administradora e da data de fechamento da fatura.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="Como solicitar">
        <p>
          Acesse a página de contato e envie o número do pedido, o e-mail usado
          na compra e uma breve descrição da solicitação. Nunca envie senha ou
          dados completos de cartão.
        </p>

        <Link
          href="/contato"
          className="inline-flex h-11 items-center rounded-lg bg-[#b98218] px-5 font-bold text-white transition hover:bg-[#9f6f14]"
        >
          Solicitar atendimento
        </Link>
      </InstitutionalSection>
    </InstitutionalPage>
  );
}
