import AdminBannerManager from "@/app/components/admin/AdminBannerManager";
import AdminShell from "@/app/components/admin/AdminShell";

export const dynamic =
  "force-dynamic";

export default function AdminBannersPage() {
  return (
    <AdminShell
      title="Banners"
      description="Controle banners, campanhas e destaques da página inicial"
    >
      <AdminBannerManager />
    </AdminShell>
  );
}