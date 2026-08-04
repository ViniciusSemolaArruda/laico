"use client";

import { useState } from "react";
import { OrderStatus } from "@prisma/client";

type Props = {
  orderId: string;
  currentStatus: OrderStatus;
  trackingCode?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
};

const statuses = [
  { value: "PENDING", label: "Aguardando pagamento" },
  { value: "PAID", label: "Pagamento aprovado" },
  { value: "PROCESSING", label: "Preparando pedido" },
  { value: "SHIPPED", label: "Pedido enviado" },
  { value: "OUT_FOR_DELIVERY", label: "Saiu para entrega" },
  { value: "DELIVERED", label: "Entregue" },
  { value: "CANCELED", label: "Cancelado" },
  { value: "REFUNDED", label: "Reembolsado" },
  { value: "RETURNED", label: "Devolvido" },
];

export default function UpdateOrderStatusForm({
  orderId,
  currentStatus,
  trackingCode,
  trackingUrl,
  carrier,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [code, setCode] = useState(trackingCode || "");
  const [url, setUrl] = useState(trackingUrl || "");
  const [carrierName, setCarrierName] = useState(carrier || "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    try {
      setLoading(true);

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          trackingCode: code,
          trackingUrl: url,
          carrier: carrierName,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao atualizar pedido.");
        return;
      }

      alert("Pedido atualizado com sucesso.");
      window.location.reload();
    } catch {
      alert("Erro ao atualizar pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-[#e8dcc2] bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-[22px] font-extrabold text-[#20170f]">
        Atualizar status do pedido
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-bold">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-sm font-bold">Transportadora</span>
          <input
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            placeholder="Ex: Correios, Jadlog, Melhor Envio"
            className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none"
          />
        </label>

        <label>
          <span className="text-sm font-bold">Código de rastreio</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex: BR123456789BR"
            className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none"
          />
        </label>

        <label>
          <span className="text-sm font-bold">Link de rastreio</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 h-12 w-full rounded-xl border border-[#e8dcc2] px-4 outline-none"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-bold">Mensagem para o histórico</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Ex: Pedido enviado e já disponível para rastreamento."
          className="mt-2 w-full rounded-xl border border-[#e8dcc2] px-4 py-3 outline-none"
        />
      </label>

      <button
        type="button"
        onClick={handleUpdate}
        disabled={loading}
        className="mt-5 h-12 rounded-xl bg-[#b98218] px-6 font-extrabold text-white disabled:opacity-60"
      >
        {loading ? "Atualizando..." : "Salvar atualização"}
      </button>
    </section>
  );
}