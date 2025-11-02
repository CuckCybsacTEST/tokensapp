import { AdminLayout } from "@/components/AdminLayout";
import { OffersAdminPage } from "./AdminOffersClient";

export default function OffersAdminPageWrapper() {
  return (
    <AdminLayout title="Gestión de Ofertas" breadcrumbs={[{ label: "Ofertas", href: "/admin/offers" }]}>
      <OffersAdminPage />
    </AdminLayout>
  );
}
