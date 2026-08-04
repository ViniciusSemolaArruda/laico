import {
  redirect,
} from "next/navigation";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type AdminShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default async function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  /*
   * O proxy valida a assinatura do JWT.
   *
   * Aqui confirmamos novamente a sessão
   * e verificamos no banco se o usuário
   * ainda possui o cargo ADMIN.
   */
  const session =
    await getAdminSession();

  if (!session) {
    redirect(
      "/admin/acesso-negado"
    );
  }

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <AdminSidebar />

      <section className="ml-[270px] min-h-screen">
        <AdminTopbar
          title={title}
          description={
            description
          }
        />

        <div className="p-8">
          {children}
        </div>
      </section>
    </main>
  );
}