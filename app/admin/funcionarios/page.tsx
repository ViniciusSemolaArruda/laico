import {
  redirect,
} from "next/navigation";

import AdminShell from "@/app/components/admin/AdminShell";
import EmployeesManager from "@/app/components/admin/EmployeesManager";

import {
  getAdminSession,
} from "@/lib/admin-auth";

export const dynamic =
  "force-dynamic";

export default async function AdminFuncionariosPage() {
  /*
   * A página também repete a autorização.
   *
   * Esconder o link no Sidebar não seria
   * suficiente para proteger esta área.
   */
  const session =
    await getAdminSession();

  if (!session) {
    redirect(
      "/admin/login"
    );
  }

  /*
   * Funcionários comuns não podem acessar
   * a administração de funcionários,
   * mesmo digitando a URL manualmente.
   */
  if (
    !session.isSuperAdmin
  ) {
    redirect(
      "/admin/acesso-negado"
    );
  }

  return (
    <AdminShell
      title="Funcionários"
      description="Gerencie funcionários e níveis de acesso ao painel administrativo"
    >
      <EmployeesManager />
    </AdminShell>
  );
}