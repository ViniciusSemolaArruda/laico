"use client";

import {
  Pencil,
  Trash2,
} from "lucide-react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import {
  useState,
} from "react";

type Props = {
  productId: string;
  productName: string;
  canEdit: boolean;
  canManage: boolean;
};

type DeleteResponse = {
  success?: boolean;
  error?: string;
};

export default function ProductActions({
  productId,
  productName,
  canEdit,
  canManage,
}: Props) {
  const router =
    useRouter();

  const [
    removing,
    setRemoving,
  ] =
    useState(false);

  async function handleRemove() {
    if (removing) {
      return;
    }

    const confirmed =
      window.confirm(
        `Tem certeza de que deseja remover o produto "${productName}" da loja?`
      );

    if (!confirmed) {
      return;
    }

    setRemoving(
      true
    );

    try {
      const response =
        await fetch(
          `/api/admin/products/${encodeURIComponent(
            productId
          )}`,
          {
            method:
              "DELETE",

            credentials:
              "same-origin",

            cache:
              "no-store",
          }
        );

      const data =
        (await response
          .json()
          .catch(
            () => ({})
          )) as DeleteResponse;

      if (
        !response.ok ||
        !data.success
      ) {
        window.alert(
          data.error ||
            "Não foi possível remover o produto."
        );

        return;
      }

      router.refresh();
    } catch {
      window.alert(
        "Não foi possível remover o produto."
      );
    } finally {
      setRemoving(
        false
      );
    }
  }

  return (
    <div className="flex justify-end gap-2">
      {canEdit && (
        <Link
          href={`/admin/produtos/${productId}/editar`}
          className="flex h-9 items-center gap-2 rounded-xl border border-[#e8dcc2] px-3 text-xs font-bold text-[#7a5422] transition hover:bg-[#fff8e8]"
        >
          <Pencil
            size={14}
          />

          Editar
        </Link>
      )}

      {canManage && (
        <button
          type="button"
          onClick={
            handleRemove
          }
          disabled={
            removing
          }
          className="flex h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2
            size={14}
          />

          {removing
            ? "Removendo..."
            : "Remover"}
        </button>
      )}
    </div>
  );
}