import { AdminLayout } from "@/components/AdminLayout";
import { SystemConfigPage } from "./SystemConfigClient";

export default function SystemConfigAdminPage() {
  return (
    <AdminLayout>
      <SystemConfigPage />
    </AdminLayout>
  );
}