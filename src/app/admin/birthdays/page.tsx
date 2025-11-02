import { AdminLayout } from "@/components/AdminLayout";
import { AdminBirthdaysPage } from "./AdminBirthdaysClient";

export default function BirthdaysAdminPage() {
  return (
    <AdminLayout title="Gestión de Cumpleaños" breadcrumbs={[{ label: "Cumpleaños", href: "/admin/birthdays" }]}>
      <AdminBirthdaysPage />
    </AdminLayout>
  );
}
