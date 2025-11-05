import { AdminLayout } from "@/components/AdminLayout";
import { AdminPacksPage } from "./AdminPacksClient";

export default function PacksAdminPage() {
  return (
    <AdminLayout>
      <AdminPacksPage />
    </AdminLayout>
  );
}