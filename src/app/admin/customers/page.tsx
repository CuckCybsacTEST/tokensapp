import { AdminLayout } from "@/components/AdminLayout";
import { CustomerAdmin } from "./AdminCustomersClient";

export default function CustomersAdminPage() {
  return (
    <AdminLayout>
      <CustomerAdmin />
    </AdminLayout>
  );
}
