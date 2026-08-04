import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

type AdminShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  return (
    <main className="min-h-screen bg-[#f4efe6]">
      <AdminSidebar />

      <section className="ml-[270px] min-h-screen">
        <AdminTopbar title={title} description={description} />

        <div className="p-8">{children}</div>
      </section>
    </main>
  );
}