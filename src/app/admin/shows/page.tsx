import { AdminLayout } from "@/components/AdminLayout";
import { AdminShowsPage } from "./AdminShowsClient";

export default function ShowsAdminPage() {
  return (
    <AdminLayout title="Gestión de Shows" breadcrumbs={[{ label: "Shows", href: "/admin/shows" }]}>
      <AdminShowsPage />
    </AdminLayout>
  );
}
