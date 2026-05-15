import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";
import { Suspense } from "react";
import { StaffTareasClient } from "./StaffTareasClient";

export const dynamic = "force-dynamic";

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default async function UTareasPage() {
  const raw = cookies().get("user_session")?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session) redirect(`/u/login?next=${encodeURIComponent("/u/producciones/tareas")}`);

  return (
    <Suspense fallback={<Spinner />}>
      <StaffTareasClient userId={session.userId} userRole={session.role} />
    </Suspense>
  );
}
