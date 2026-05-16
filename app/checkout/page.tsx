import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  User,
  MapPin,
  CreditCard,
  ShoppingBag,
  Lock,
  ShieldCheck,
  Truck,
  MessageCircle,
} from "lucide-react";

const cardFlags = {
  pix: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/pix.svg",
  visa: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/visa.svg",
  master: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/master.svg",
  elo: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/elo.svg",
  amex: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/amex.svg",
  boleto: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/boleto.svg",
};

export default function CheckoutPage() {
  return (
    <main className="bg-[#faf9f6] min-h-screen">
      <Header />

      <section className="max-w-[1370px] mx-auto px-6 py-8">
        <div className="hidden lg:flex items-center justify-center gap-8 mb-8">
          {[
            ["1", "Identificação", "Seus dados"],
            ["2", "Entrega", "Endereço"],
            ["3", "Pagamento", "Forma de pagamento"],
            ["4", "Confirmação", "Revisão do pedido"],
          ].map((step, index) => (
            <div key={step[0]} className="flex items-center gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${
                  index === 0
                    ? "bg-[#b98218] text-white"
                    : "bg-white border border-[#ddd] text-neutral-700"
                }`}
              >
                {step[0]}
              </div>

              <div>
                <p className="font-bold text-[14px]">{step[1]}</p>
                <p className="text-[12px] text-neutral-500">{step[2]}</p>
              </div>

              {index !== 3 && <div className="w-[160px] h-px bg-[#ddd]" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white border border-[#e8dcc2] rounded-[8px] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="text-[#b98218]" />

                  <div>
                    <h2 className="text-[20px] font-bold">
                      1. Identificação
                    </h2>
                    <p className="text-[13px] text-neutral-500">
                      Informe seus dados pessoais
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    ["Nome completo *", "Digite seu nome completo"],
                    ["CPF *", "000.000.000-00"],
                    ["E-mail *", "seu@email.com"],
                    ["Telefone / WhatsApp *", "(11) 99999-9999"],
                  ].map((field) => (
                    <label key={field[0]} className="block">
                      <span className="text-[13px] font-semibold">
                        {field[0]}
                      </span>

                      <input
                        placeholder={field[1]}
                        className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-6 border border-[#ead9b8] rounded-[6px] bg-[#fffdf8] p-4 flex gap-3">
                  <ShieldCheck className="text-[#b98218]" />

                  <div>
                    <p className="font-bold text-[13px]">
                      Seus dados estão seguros
                    </p>
                    <p className="text-[12px] text-neutral-500">
                      Utilizamos criptografia SSL e não compartilhamos suas
                      informações.
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-white border border-[#e8dcc2] rounded-[8px] p-6">
                <div className="flex items-center gap-3 mb-6">
                  <MapPin className="text-[#b98218]" />

                  <div>
                    <h2 className="text-[20px] font-bold">2. Entrega</h2>
                    <p className="text-[13px] text-neutral-500">
                      Informe o endereço de entrega
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold">CEP *</span>

                    <div className="flex gap-2 mt-2">
                      <input
                        placeholder="00000-000"
                        className="flex-1 h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />

                      <button className="px-4 border border-[#b98218] text-[#b98218] rounded-[5px] text-[13px] font-bold">
                        Buscar CEP
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[13px] font-semibold">Rua *</span>

                    <input
                      placeholder="Digite sua rua"
                      className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                    />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Número *
                      </span>

                      <input
                        placeholder="123"
                        className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Complemento
                      </span>

                      <input
                        placeholder="Apto, bloco, etc."
                        className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Bairro *
                      </span>

                      <input
                        placeholder="Digite seu bairro"
                        className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Cidade *
                      </span>

                      <input
                        placeholder="Digite sua cidade"
                        className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Estado *
                      </span>

                      <select className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]">
                        <option>Selecione</option>
                        <option>RJ</option>
                        <option>SP</option>
                        <option>MG</option>
                      </select>
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Referência
                      </span>

                      <input
                        placeholder="Ponto de referência"
                        className="mt-2 w-full h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px] outline-none focus:border-[#b98218]"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-5 border border-[#ead9b8] rounded-[6px] bg-[#fffdf8] p-4 flex gap-3">
                  <Truck className="text-[#b98218]" />

                  <div>
                    <p className="font-bold text-[13px]">
                      Previsão de entrega
                    </p>

                    <p className="text-[12px] text-neutral-500">
                      De 3 a 7 dias úteis para capitais
                      <br />
                      De 5 a 10 dias úteis para demais regiões
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <section className="bg-white border border-[#e8dcc2] rounded-[8px] p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-[#b98218]" />

                <div className="flex items-center gap-3">
                  <h2 className="text-[20px] font-bold">3. Pagamento</h2>
                  <span className="text-[13px] text-neutral-500">
                    Escolha a forma de pagamento
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative rounded-[6px] border border-[#b98218] bg-[#fffdf8] p-4 h-[92px] overflow-hidden">
                  <span className="absolute top-0 right-0 bg-[#7cb342] text-white text-[10px] font-bold px-3 h-[22px] flex items-center rounded-bl-md">
                    DESCONTO
                  </span>

                  <div className="flex gap-3">
                    <img
                      src={cardFlags.pix}
                      alt="Pix"
                      className="w-[34px] h-[34px] object-contain"
                    />

                    <div>
                      <p className="font-bold text-[14px] leading-none">
                        PIX
                      </p>

                      <p className="text-[11px] text-neutral-500 mt-2">
                        Aprovação imediata
                      </p>

                      <p className="text-[11px] text-[#4caf50] font-medium mt-2">
                        5% de desconto
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[6px] border border-[#e5e5e5] bg-white p-4 h-[92px]">
                  <div className="flex gap-3">
                    <CreditCard size={22} className="mt-1 text-[#222]" />

                    <div className="flex-1">
                      <p className="font-bold text-[14px] leading-none">
                        Cartão de crédito
                      </p>

                      <p className="text-[11px] text-neutral-500 mt-2">
                        Até 12x sem juros
                      </p>

                      <div className="flex gap-2 mt-3 items-center">
                        <img
                          src={cardFlags.visa}
                          alt="Visa"
                          className="h-[16px] object-contain"
                        />

                        <img
                          src={cardFlags.master}
                          alt="Master"
                          className="h-[16px] object-contain"
                        />

                        <img
                          src={cardFlags.elo}
                          alt="Elo"
                          className="h-[16px] object-contain"
                        />

                        <img
                          src={cardFlags.amex}
                          alt="Amex"
                          className="h-[16px] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[6px] border border-[#e5e5e5] bg-white p-4 h-[92px]">
                  <div className="flex gap-3">
                    <CreditCard size={22} className="mt-1 text-[#222]" />

                    <div className="flex-1">
                      <p className="font-bold text-[14px] leading-none">
                        Cartão de débito
                      </p>

                      <p className="text-[11px] text-neutral-500 mt-2">
                        À vista
                      </p>

                      <div className="flex gap-2 mt-3 items-center">
                        <img
                          src={cardFlags.visa}
                          alt="Visa"
                          className="h-[16px] object-contain"
                        />

                        <img
                          src={cardFlags.elo}
                          alt="Elo"
                          className="h-[16px] object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[6px] border border-[#e5e5e5] bg-white p-4 h-[92px]">
                  <div className="flex gap-3">
                    <img
                      src={cardFlags.boleto}
                      alt="Boleto"
                      className="w-[28px] h-[28px] object-contain mt-1"
                    />

                    <div className="flex-1">
                      <p className="font-bold text-[14px] leading-none">
                        Boleto bancário
                      </p>

                      <p className="text-[11px] text-neutral-500 mt-2">
                        À vista
                      </p>

                      <p className="text-[11px] text-neutral-500 mt-2">
                        Aprovação em até 1 dia útil
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 border border-[#ead9b8] rounded-[6px] bg-[#fffdf8] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex gap-3">
                  <Lock className="text-[#b98218]" />

                  <div>
                    <p className="font-bold text-[13px]">
                      Ambiente 100% seguro
                    </p>
                    <p className="text-[12px] text-neutral-500">
                      Seus dados e pagamento estão protegidos com criptografia
                      SSL de ponta a ponta.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-center flex-wrap">
                  <div className="h-[36px] px-4 rounded border border-[#e5e5e5] bg-white flex items-center justify-center text-[#4caf50] font-bold text-[13px]">
                    🛡️ SSL
                  </div>

                  <div className="h-[36px] px-4 rounded border border-[#e5e5e5] bg-white flex items-center justify-center text-[#0f8b8d] font-bold text-[13px]">
                    PCI DSS
                  </div>

                  <div className="h-[36px] px-4 rounded border border-[#e5e5e5] bg-white flex items-center justify-center text-[#4caf50] font-bold text-[12px]">
                    Google Safe Browsing
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="bg-white border border-[#e8dcc2] rounded-[8px] overflow-hidden">
              <div className="p-6 border-b border-[#e8dcc2] flex gap-3 items-center">
                <ShoppingBag />
                <h2 className="text-[20px] font-bold">Resumo do pedido</h2>
              </div>

              <div className="p-6">
                <div className="flex gap-4 mb-5">
                  <div className="w-[70px] h-[70px] border border-[#e8dcc2] rounded-[6px] flex items-center justify-center bg-[#fffdf8]">
                    <img
                      src="/terço.png"
                      alt="Terço Cristal Rosa"
                      className="max-w-[58px] max-h-[58px] object-contain"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="font-bold text-[14px]">
                      Terço Cristal Rosa
                    </p>
                    <p className="text-[12px] text-neutral-500">
                      Cód: 202030500
                    </p>
                    <p className="text-[12px] text-neutral-500">Qtd: 1</p>
                  </div>

                  <strong className="text-[14px]">R$29,90</strong>
                </div>

                <div className="border-t border-[#e8dcc2] pt-5 space-y-4 text-[14px]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <strong>R$29,90</strong>
                  </div>

                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span className="text-neutral-500">
                      Calcular na próxima etapa
                    </span>
                  </div>

                  <div className="flex justify-between pt-3 text-[18px]">
                    <strong>Total</strong>
                    <strong className="text-[#b98218]">R$29,90</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white border border-[#e8dcc2] rounded-[8px] p-6">
              <p className="font-bold text-[14px] mb-3">
                Possui cupom de desconto?
              </p>

              <div className="flex gap-2">
                <input
                  placeholder="Digite seu cupom"
                  className="flex-1 h-[40px] border border-[#e5e5e5] rounded-[5px] px-3 text-[13px]"
                />

                <button className="px-4 border border-[#b98218] text-[#b98218] rounded-[5px] text-[13px] font-bold">
                  Aplicar
                </button>
              </div>
            </section>

            <button className="w-full h-[52px] bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#b98218] text-white font-bold rounded-[5px] flex items-center justify-center gap-2 shadow-lg">
              <Lock size={18} />
              Continuar para o pagamento
            </button>

            <p className="flex justify-center items-center gap-2 text-[13px] text-neutral-600">
              <ShieldCheck size={17} />
              Você será redirecionado para um ambiente seguro
            </p>
          </aside>
        </div>
      </section>

      <div className="border-t border-[#eee] bg-white">
        <div className="max-w-[1370px] mx-auto px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            ["Entrega para todo Brasil", "Enviamos para todas as regiões."],
            ["Pagamento seguro", "Aceitamos Pix, cartão crédito e boleto."],
            ["Trocas e devoluções", "7 dias para trocas após recebimento."],
            ["Atendimento humanizado", "Suporte via WhatsApp e e-mail."],
          ].map((item) => (
            <div key={item[0]} className="flex gap-3 items-center">
              <ShieldCheck className="text-[#b98218]" />

              <div>
                <p className="font-bold text-[13px]">{item[0]}</p>
                <p className="text-[12px] text-neutral-500">{item[1]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />

      <button className="fixed bottom-8 right-8 w-[62px] h-[62px] rounded-full bg-[#24c45a] text-white flex items-center justify-center shadow-2xl">
        <MessageCircle size={34} />
      </button>
    </main>
  );
}