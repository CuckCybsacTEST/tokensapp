import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie, requireRole } from "@/lib/auth";
import { Suspense } from "react";
import { TareasClient } from "./TareasClient";

export const dynamic = "force-dynamic";

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default async function TareasPage() {
  const cookieStore = cookies();
  const raw = cookieStore.get("user_session")?.value ?? null;
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ["ADMIN", "COORDINATOR", "STAFF"]);
  if (!r.ok) redirect("/admin/login");

  return (
    <Suspense fallback={<Spinner />}>
      <TareasClient
        userId={session!.userId}
        userRole={session!.role}
      />
    </Suspense>
  );
}
