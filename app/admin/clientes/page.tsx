import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;

  orders: Array<{
    id: string;
  }>;

  addresses: Array<{
    id: string;
  }>;
};

function formatCpf(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const digits =
    value.replace(/\D/g, "");

  if (digits.length !== 11) {
    return value;
  }

  return digits.replace(
    /(\d{3})(\d{3})(\d{3})(\d{2})/,
    "$1.$2.$3-$4"
  );
}

function formatPhone(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const digits =
    value.replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );
  }

  if (digits.length === 10) {
    return digits.replace(
      /(\d{2})(\d{4})(\d{4})/,
      "($1) $2-$3"
    );
  }

  return value;
}

export default async function AdminClientesPage() {
  const users: AdminCustomer[] =
    await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        cpf: true,
        role: true,
        createdAt: true,

        orders: {
          select: {
            id: true,
          },
        },

        addresses: {
          select: {
            id: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  return (
    <AdminShell
      title="Clientes"
      description="Gerencie clientes, contatos e histórico de compras"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[28px] font-extrabold text-[#20170f] sm:text-[34px]">
          Clientes cadastrados
        </h2>

        <span className="rounded-full bg-[#f7f1e4] px-4 py-2 text-sm font-bold text-[#7a5422]">
          {users.length}{" "}
          {users.length === 1
            ? "cliente"
            : "clientes"}
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e8dcc2] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-[#faf9f6]">
              <tr>
                <th className="p-4 text-left font-bold text-[#20170f]">
                  Cliente
                </th>

                <th className="p-4 text-left font-bold text-[#20170f]">
                  Telefone
                </th>

                <th className="p-4 text-left font-bold text-[#20170f]">
                  CPF
                </th>

                <th className="p-4 text-center font-bold text-[#20170f]">
                  Pedidos
                </th>

                <th className="p-4 text-center font-bold text-[#20170f]">
                  Endereços
                </th>

                <th className="p-4 text-left font-bold text-[#20170f]">
                  Perfil
                </th>
              </tr>
            </thead>

            <tbody>
              {users.map(
                (user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#eee2cc] transition-colors hover:bg-[#fffcf6]"
                  >
                    <td className="p-4">
                      <strong className="block text-[#20170f]">
                        {user.name}
                      </strong>

                      <p className="mt-1 text-xs text-neutral-500">
                        {user.email}
                      </p>
                    </td>

                    <td className="p-4 whitespace-nowrap text-neutral-700">
                      {formatPhone(
                        user.phone
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap text-neutral-700">
                      {formatCpf(
                        user.cpf
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                        {
                          user.orders
                            .length
                        }
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                        {
                          user.addresses
                            .length
                        }
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={
                          user.role ===
                          "ADMIN"
                            ? "inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700"
                            : "inline-flex rounded-full bg-[#fff8e8] px-3 py-1 text-xs font-bold text-[#b98218]"
                        }
                      >
                        {user.role ===
                        "ADMIN"
                          ? "Administrador"
                          : "Cliente"}
                      </span>
                    </td>
                  </tr>
                )
              )}

              {users.length ===
                0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-neutral-500"
                  >
                    Nenhum cliente
                    cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}