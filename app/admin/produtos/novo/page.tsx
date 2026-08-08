import AdminShell from "@/app/components/admin/AdminShell";
import NewProductForm from "@/app/components/admin/NewProductForm";

import {
  redirect,
} from "next/navigation";

import {
  requireAdminPermission,
} from "@/lib/admin-auth";

export const dynamic =
  "force-dynamic";

export default async function NewProductPage() {
  try {
    await requireAdminPermission(
      "PRODUCTS",
      "EDIT"
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_UNAUTHORIZED"
    ) {
      redirect(
        "/admin/login"
      );
    }

    if (
      error instanceof Error &&
      error.message ===
        "ADMIN_FORBIDDEN"
    ) {
      redirect(
        "/admin/acesso-negado?redirect=/admin/produtos/novo"
      );
    }

    throw error;
  }

  return (
    <AdminShell
      title="Novo Produto"
      description="Cadastre um novo produto no catálogo"
    >
      <NewProductForm />
    </AdminShell>
  );
}