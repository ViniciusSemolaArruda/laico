/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { CreditCard, Barcode, QrCode, Copy, Lock } from "lucide-react";

type Props = {
  orderId: string;
  amount: number;
  payer: {
    name: string;
    email: string;
    cpf: string;
  };
};

type PaymentMethod = "pix" | "boleto" | "credito" | "debito";

export default function CustomPaymentBox({ orderId, amount, payer }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);

  async function generatePayment() {
    setLoading(true);
    setPaymentData(null);

    const response = await fetch("/api/payments/custom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        paymentMethod: method,
        payer,
      }),
    });

    const data = await response.json();

    setLoading(false);

    if (!response.ok) {
      alert(data.error || "Erro ao gerar pagamento.");
      return;
    }

    setPaymentData(data);
  }

  function copyPix() {
    navigator.clipboard.writeText(paymentData.pixQrCode);
    alert("Código Pix copiado!");
  }

  return (
    <div className="border border-[#ead9b8] rounded-xl bg-white overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-[22px] font-bold">Meios de pagamento</h3>
        <p className="text-[13px] text-neutral-500 mt-1">
          Escolha como deseja pagar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
        <div className="border-r bg-[#fafafa]">
          {[
            { id: "pix", label: "Pix", icon: <QrCode /> },
            { id: "credito", label: "Cartão de crédito", icon: <CreditCard /> },
            { id: "debito", label: "Cartão de débito", icon: <CreditCard /> },
            { id: "boleto", label: "Boleto bancário", icon: <Barcode /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMethod(item.id as PaymentMethod);
                setPaymentData(null);
              }}
              className={`w-full h-[92px] px-6 flex items-center gap-4 border-b text-left ${
                method === item.id
                  ? "bg-white border-l-4 border-l-blue-500"
                  : "bg-[#fafafa]"
              }`}
            >
              <div className="w-10 h-10 rounded-full border flex items-center justify-center bg-white">
                {item.icon}
              </div>

              <div>
                <p className="font-bold">{item.label}</p>
                <p className="text-[12px] text-neutral-500">
                  {item.id === "pix"
                    ? "Pagamento instantâneo"
                    : item.id === "boleto"
                    ? "À vista"
                    : "Via Mercado Pago"}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-7">
          <div className="mb-5">
            <p className="text-[14px] text-neutral-500">Total a pagar</p>
            <strong className="text-[30px]">
              {amount.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </strong>
          </div>

          {!paymentData && (
            <button
              onClick={generatePayment}
              disabled={loading}
              className="h-[48px] px-8 rounded bg-blue-600 text-white font-bold flex items-center gap-2 disabled:opacity-60"
            >
              <Lock size={17} />
              {loading ? "Gerando..." : "Gerar pagamento"}
            </button>
          )}

          {paymentData?.pixQrCode && (
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8 mt-6">
              <div>
                <p className="font-bold mb-3">Escaneie o QR Code</p>

                <img
                  src={`data:image/png;base64,${paymentData.pixQrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-[240px] h-[240px] border rounded-lg"
                />
              </div>

              <div>
                <p className="font-bold mb-3">Ou copie o código Pix</p>

                <textarea
                  readOnly
                  value={paymentData.pixQrCode}
                  className="w-full h-[150px] border rounded-lg p-4 text-[13px]"
                />

                <button
                  onClick={copyPix}
                  className="mt-4 h-[44px] px-5 rounded border border-blue-600 text-blue-600 font-bold flex items-center gap-2"
                >
                  <Copy size={17} />
                  Copiar código Pix
                </button>
              </div>
            </div>
          )}

          {paymentData?.ticketUrl && (
            <div className="mt-6">
              <p className="font-bold mb-3">Boleto gerado com sucesso</p>

              <a
                href={paymentData.ticketUrl}
                target="_blank"
                className="h-[48px] px-6 inline-flex items-center justify-center rounded bg-blue-600 text-white font-bold"
              >
                Abrir boleto
              </a>
            </div>
          )}

          {(method === "credito" || method === "debito") && !paymentData && (
            <div className="mt-6 border rounded-lg p-4 bg-yellow-50 text-[14px]">
              Para cartão 100% dentro do site, precisamos integrar o Brick de
              cartão/tokenização. Pix e boleto já ficam funcionais com QR Code e
              boleto.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}