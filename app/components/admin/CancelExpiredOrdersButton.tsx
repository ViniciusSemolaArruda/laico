"use client";

import { useState } from "react";
import { RefreshCcw } from "lucide-react";

export default function CancelExpiredOrdersButton() {
  const [loading, setLoading] = useState(false);

  async function handleCancelExpired() {
    try {
      setLoading(true);

      const response = await fetch("/api/orders/cancel-expired", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao cancelar pedidos expirados.");
        return;
      }

      alert(data.message);
      window.location.reload();
    } catch {
      alert("Erro ao cancelar pedidos expirados.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancelExpired}
      disabled={loading}
      className="h-11 px-5 rounded-xl bg-[#20170f] text-white font-bold flex items-center gap-2 disabled:opacity-60"
    >
      <RefreshCcw size={17} />
      {loading ? "Verificando..." : "Cancelar expirados"}
    </button>
  );
}