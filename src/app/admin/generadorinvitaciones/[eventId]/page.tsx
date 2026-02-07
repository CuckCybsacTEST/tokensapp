import { AdminLayout } from "@/components/AdminLayout";
import { EventDetailClient } from "./EventDetailClient";

export default function EventDetailPage({ params }: { params: { eventId: string } }) {
  return (
    <AdminLayout>
      <EventDetailClient eventId={params.eventId} />
    </AdminLayout>
  );
}
