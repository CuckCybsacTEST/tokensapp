import { AdminLayout } from "@/components/AdminLayout";
import { CustomerAdmin } from "./AdminCustomersClient";

export default function CustomersAdminPage() {
  return (
    <AdminLayout title="Gestión de Clientes" breadcrumbs={[{ label: "Clientes", href: "/admin/customers" }]}>
      <CustomerAdmin />
    </AdminLayout>
  );
}
