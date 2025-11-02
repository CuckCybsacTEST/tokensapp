import { AdminLayout } from "@/components/AdminLayout";
import { AdminTasksPage } from "./AdminTasksClient";

export default function TasksAdminPage() {
  return (
    <AdminLayout title="Gestión de Tareas" breadcrumbs={[{ label: "Tareas", href: "/admin/tasks" }]}>
      <AdminTasksPage />
    </AdminLayout>
  );
}
