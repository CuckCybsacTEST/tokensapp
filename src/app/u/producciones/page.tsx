import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StaffProduccionesClient from "./StaffProduccionesClient";

export const dynamic = "force-dynamic";

export default async function UProduccionesPage() {
  const raw = cookies().get("user_session")?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session) redirect(`/u/login?next=${encodeURIComponent("/u/producciones")}`);

  // Get user info + person to check assignment
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, personId: true, role: true, person: { select: { id: true, name: true, area: true } } },
  });

  if (!user) redirect("/u/login");

  const personId = user.personId ?? user.person?.id ?? "";

  // Get persons for assignment dropdown (STAFF+ only)
  const isStaffPlus = ["STAFF", "COORDINATOR", "ADMIN"].includes(session.role);
  let persons: { id: string; name: string; area: string | null }[] = [];
  if (isStaffPlus) {
    persons = await prisma.person.findMany({
      where: { active: true },
      select: { id: true, name: true, area: true },
      orderBy: { name: "asc" },
    });
  }

  return (
    <StaffProduccionesClient
      userId={session.userId}
      userRole={session.role}
      personId={personId}
      personName={user.person?.name || user.username}
      isStaffPlus={isStaffPlus}
      persons={persons}
    />
  );
}
