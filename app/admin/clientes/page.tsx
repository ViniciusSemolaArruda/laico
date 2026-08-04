import AdminShell from "@/app/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";

export default async function AdminClientesPage() {
  const users = await prisma.user.findMany({
    include: {
      orders: true,
      addresses: true,
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
      <h2 className="text-[34px] font-extrabold text-[#20170f] mb-6">
        Clientes Cadastrados
      </h2>

      <section className="bg-white border border-[#e8dcc2] rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#faf9f6]">
            <tr>
              <th className="p-4 text-left">Cliente</th>
              <th className="p-4 text-left">Telefone</th>
              <th className="p-4 text-left">CPF</th>
              <th className="p-4 text-left">Pedidos</th>
              <th className="p-4 text-left">Endereços</th>
              <th className="p-4 text-left">Perfil</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-[#eee2cc]">
                <td className="p-4">
                  <strong>{user.name}</strong>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </td>

                <td className="p-4">{user.phone || "-"}</td>
                <td className="p-4">{user.cpf || "-"}</td>
                <td className="p-4">{user.orders.length}</td>
                <td className="p-4">{user.addresses.length}</td>
                <td className="p-4">
                  <span className="px-3 py-1 rounded-full bg-[#fff8e8] text-[#b98218] text-xs font-bold">
                    {user.role}
                  </span>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-neutral-500">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}