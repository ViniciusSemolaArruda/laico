import InstitutionalPage, {
  InformationBox,
  InstitutionalSection,
} from "@/components/institutional/InstitutionalPage";

export const metadata = {
  title: "Política de Privacidade",
  description:
    "Entenda como a Laico coleta, utiliza, compartilha e protege dados pessoais.",
};

export default function PrivacyPolicyPage() {
  const legalName =
    process.env.NEXT_PUBLIC_STORE_LEGAL_NAME?.trim() || "Laico";

  const document =
    process.env.NEXT_PUBLIC_STORE_DOCUMENT?.trim() ||
    "identificação empresarial em atualização";

  const privacyEmail =
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    "canal disponível na página de contato";

  return (
    <InstitutionalPage
      title="Política de Privacidade"
      description="Esta política explica, de forma transparente, como tratamos dados pessoais durante a navegação, o cadastro e a compra."
      updatedAt="10 de agosto de 2026"
    >
      <InformationBox>
        Controlador: <strong>{legalName}</strong> — {document}. Canal de
        privacidade: <strong>{privacyEmail}</strong>.
      </InformationBox>

      <InstitutionalSection title="1. Dados que podemos tratar">
        <ul className="list-disc space-y-2 pl-5 marker:text-[#b98218]">
          <li>Nome, e-mail, telefone, CPF e dados de cadastro.</li>
          <li>Endereço de entrega e informações necessárias ao frete.</li>
          <li>Produtos, pedidos, pagamentos e histórico de atendimento.</li>
          <li>
            Dados técnicos, como endereço IP, navegador, dispositivo, data e
            horário de acesso.
          </li>
        </ul>
        <p>
          Dados completos de cartão não são armazenados pela Laico. O pagamento
          é processado pelo provedor de pagamentos apresentado no checkout.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="2. Por que utilizamos esses dados">
        <ul className="list-disc space-y-2 pl-5 marker:text-[#b98218]">
          <li>Criar e proteger a conta do cliente.</li>
          <li>Processar pagamentos, pedidos, entregas, trocas e reembolsos.</li>
          <li>Prevenir fraude, abuso e acessos não autorizados.</li>
          <li>Cumprir obrigações legais, fiscais e regulatórias.</li>
          <li>Responder solicitações e melhorar a experiência da loja.</li>
          <li>
            Enviar comunicações promocionais somente quando houver base legal
            adequada e opção de cancelamento.
          </li>
        </ul>
      </InstitutionalSection>

      <InstitutionalSection title="3. Compartilhamento">
        <p>
          Compartilhamos apenas os dados necessários com prestadores que ajudam
          a operar a loja, como serviços de pagamento, hospedagem, banco de
          dados, e-mail, prevenção a fraudes, transportadoras e plataformas de
          frete.
        </p>
        <p>
          Também poderemos compartilhar informações quando necessário para
          cumprir obrigação legal, ordem de autoridade competente ou proteger
          direitos da Laico, dos clientes e de terceiros.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="4. Cookies e registros de acesso">
        <p>
          Utilizamos cookies estritamente necessários para autenticação,
          segurança, carrinho e funcionamento do checkout. Cookies opcionais de
          análise ou publicidade, quando adotados, deverão respeitar as escolhas
          apresentadas ao visitante.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="5. Conservação e segurança">
        <p>
          Os dados são mantidos somente pelo período necessário às finalidades
          informadas, ao cumprimento de obrigações legais e ao exercício regular
          de direitos. Aplicamos controles técnicos e administrativos para
          reduzir riscos de acesso, alteração, perda ou divulgação indevida.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="6. Seus direitos">
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento,
          acesso, correção, anonimização, bloqueio, eliminação quando aplicável,
          portabilidade, informação sobre compartilhamento, revisão de decisões
          automatizadas e revogação do consentimento.
        </p>
        <p>
          Para fazer uma solicitação, utilize o canal indicado nesta política.
          Poderemos pedir informações adicionais para confirmar sua identidade
          e proteger seus dados.
        </p>
      </InstitutionalSection>

      <InstitutionalSection title="7. Alterações desta política">
        <p>
          Esta política poderá ser atualizada para refletir mudanças legais ou
          operacionais. A versão vigente e a data de atualização permanecerão
          disponíveis nesta página.
        </p>
      </InstitutionalSection>
    </InstitutionalPage>
  );
}
