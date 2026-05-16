import { Clock, Mail, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-[#071722] text-white mt-6 overflow-hidden">
      <div className="max-w-[1370px] mx-auto px-6 py-9 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[270px_1fr_1fr_1.25fr_1.7fr] gap-10">
        <div>
          <img
            src="/logo3.png"
            alt="Laico"
            className="w-[190px] h-auto object-contain mb-4"
          />

          <p className="text-[13px] leading-[20px] text-slate-200 max-w-[245px]">
            A Laico é um espaço de fé, cultura e espiritualidade.
            Respeitamos todas as crenças e promovemos a diversidade
            religiosa e cultural.
          </p>

          <div className="flex items-center gap-5 mt-5 text-white">
            <i className="fa fa-instagram text-[20px]" />
            <i className="fa fa-facebook text-[20px]" />
            <i className="fa fa-whatsapp text-[20px]" />
            <i className="fa fa-youtube-play text-[20px]" />
          </div>
        </div>

        <div>
          <h3 className="text-[#f0cf7a] text-[14px] font-bold mb-4">
            Institucional
          </h3>

          <div className="space-y-3 text-[13px] text-slate-200">
            <p>Sobre nós</p>
            <p>Nossa missão</p>
            <p>Política de privacidade</p>
            <p>Trocas e devoluções</p>
            <p>Fale conosco</p>
          </div>
        </div>

        <div>
          <h3 className="text-[#f0cf7a] text-[14px] font-bold mb-4">
            Minha conta
          </h3>

          <div className="space-y-3 text-[13px] text-slate-200">
            <p>Minha conta</p>
            <p>Meus pedidos</p>
            <p>Meus favoritos</p>
            <p>Endereços</p>
            <p>Sair</p>
          </div>
        </div>

        <div>
          <h3 className="text-[#f0cf7a] text-[14px] font-bold mb-4">
            Atendimento
          </h3>

          <div className="space-y-4 text-[13px] text-slate-200">
            <p className="flex items-center gap-3">
              <MessageCircle size={18} />
              (11) 99999-9999
            </p>

            <p className="flex items-center gap-3">
              <Mail size={18} />
              contato@laico.com.br
            </p>

            <p className="flex items-start gap-3">
              <Clock size={18} className="mt-0.5" />

              <span>
                Seg a Sex: 8h às 18h
                <br />
                Sáb: 8h às 12h
              </span>
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-[#f0cf7a] text-[14px] font-bold mb-4">
            Formas de pagamento
          </h3>

          <div className="flex items-center gap-2 flex-wrap">
            {[
              "pix.svg",
              "visa.svg",
              "master.svg",
              "elo.svg",
              "amex.svg",
              "boleto.svg",
            ].map((card) => (
              <div
                key={card}
                className="h-[34px] w-[60px] rounded bg-white flex items-center justify-center px-2"
              >
                <img
                  src={`https://cdn.sistemawbuy.com.br/img/bandeiras/novo/${card}`}
                  alt={card}
                  className="max-h-[22px] max-w-full object-contain"
                />
              </div>
            ))}
          </div>

          <h3 className="text-[#f0cf7a] text-[14px] font-bold mt-6 mb-3">
            Segurança
          </h3>

          <div className="flex items-center gap-5 text-[13px] text-slate-200">
            <span className="flex items-center gap-2">
              🛡️ Site Blindado
            </span>

            <span className="flex items-center gap-2">
              G Google Seguro
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-[1370px] mx-auto px-6 h-[42px] flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-300">
          <span>
            © 2026 Laico. Todos os direitos reservados.
          </span>

          <div className="hidden md:flex items-center gap-10">
            <span>Política de privacidade</span>
            <span>Trocas e devoluções</span>
            <span>Formas de pagamento</span>
            <span>Prazo de entrega</span>
            <span>Perguntas frequentes</span>
          </div>
        </div>
      </div>
    </footer>
  );
}