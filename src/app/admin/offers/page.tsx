import { AdminLayout } from "@/components/AdminLayout";
import { OffersAdminPage } from "./AdminOffersClient";

export default function OffersAdminPageWrapper() {
  return (
    <AdminLayout>
      <OffersAdminPage />
    </AdminLayout>
  );
}
