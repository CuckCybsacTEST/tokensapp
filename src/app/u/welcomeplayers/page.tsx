import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyUserSessionCookie, roleAtLeast } from "@/lib/auth";
import WelcomePlayersCoordinatorClient from "./WelcomePlayersCoordinatorClient";

export const dynamic = "force-dynamic";

export default async function WelcomePlayersCoordinatorPage() {
  const raw = cookies().get("user_session")?.value;
  const session = await verifyUserSessionCookie(raw);

  if (!session) {
    redirect(`/u/login?next=${encodeURIComponent("/u/welcomeplayers")}`);
  }

  if (!roleAtLeast(session.role, "COORDINATOR")) {
    redirect("/u");
  }

  return <WelcomePlayersCoordinatorClient />;
}
