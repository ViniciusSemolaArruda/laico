import {
  redirect,
} from "next/navigation";

import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";

type AdminShellProps = {
  title: string;
  description?: string;
  children:
    React.ReactNode;
};

export default async function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  /*
   * =======================================================
   * SESSÃO
   * =======================================================
   */

  const session =
    await getAdminSession();

  if (!session) {
    redirect(
      "/admin/login"
    );
  }

  /*
   * =======================================================
   * FUNCIONÁRIO
   * =======================================================
   *
   * Nome, cargo e permissões vêm diretamente
   * do banco.
   *
   * O navegador não escolhe essas informações.
   */

  const admin =
    await prisma.user.findFirst({
      where: {
        id:
          session.userId,

        role:
          "ADMIN",

        adminProfile: {
          is: {
            active:
              true,
          },
        },
      },

      select: {
        id:
          true,

        name:
          true,

        adminProfile: {
          select: {
            jobTitle:
              true,

            active:
              true,

            isSuperAdmin:
              true,
          },
        },

        adminPermissions: {
          select: {
            module:
              true,

            level:
              true,
          },
        },
      },
    });

  if (
    !admin ||
    !admin.adminProfile ||
    !admin.adminProfile.active
  ) {
    redirect(
      "/admin/login"
    );
  }

  /*
   * Converte:
   *
   * [
   *   { module: "PRODUCTS", level: "EDIT" }
   * ]
   *
   * para:
   *
   * {
   *   PRODUCTS: "EDIT"
   * }
   */

  const permissions =
    Object.fromEntries(
      admin.adminPermissions.map(
        (
          permission
        ) => [
          permission.module,
          permission.level,
        ]
      )
    );

  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <AdminSidebar
        adminName={
          admin.name
        }
        jobTitle={
          admin.adminProfile
            .jobTitle
        }
        isSuperAdmin={
          admin.adminProfile
            .isSuperAdmin
        }
        permissions={
          permissions
        }
      />

      <section className="min-h-screen lg:ml-[270px]">
        <AdminTopbar
          title={
            title
          }
          description={
            description
          }
        />

        <div className="p-5 lg:p-8">
          {children}
        </div>
      </section>
    </main>
  );
}