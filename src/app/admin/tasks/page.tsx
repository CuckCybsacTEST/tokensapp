import { AdminLayout } from "@/components/AdminLayout";
import { AdminTasksPage } from "./AdminTasksClient";

export default function TasksAdminPage() {
  return (
    <AdminLayout>
      <AdminTasksPage />
    </AdminLayout>
  );
}
