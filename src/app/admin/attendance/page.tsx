import { AdminLayout } from "@/components/AdminLayout";
import { AdminAttendancePage } from "./AdminAttendanceClient";

export default function AttendanceAdminPage() {
  return (
    <AdminLayout title="Control de Asistencia" breadcrumbs={[{ label: "Asistencia", href: "/admin/attendance" }]}>
      <AdminAttendancePage />
    </AdminLayout>
  );
}
