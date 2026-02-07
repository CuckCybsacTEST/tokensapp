import { AdminLayout } from "@/components/AdminLayout";
import { StatsClient } from "./StatsClient";

export const dynamic = "force-dynamic";

export default function StatsPage() {
  return (
    <AdminLayout>
      <StatsClient />
    </AdminLayout>
  );
}
