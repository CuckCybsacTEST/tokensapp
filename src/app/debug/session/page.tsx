import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";

async function getSessionData() {
  const raw = cookies().get("user_session")?.value;

  if (raw) {
    const session = await verifyUserSessionCookie(raw);
    if (session) {
      return {
        hasCookie: true,
        sessionValid: true,
        userId: session.userId,
        role: session.role,
        issuedAt: new Date(session.iat).toISOString(),
        expiresAt: new Date(session.exp).toISOString(),
        isExpired: Date.now() > session.exp,
        timeUntilExpiry: Math.max(0, session.exp - Date.now()) / 1000 / 60, // minutes
        canAccessAdmin: session.role === 'ADMIN'
      };
    } else {
      return {
        hasCookie: true,
        sessionValid: false,
        canAccessAdmin: false
      };
    }
  } else {
    return {
      hasCookie: false,
      sessionValid: false,
      canAccessAdmin: false
    };
  }
}

export default async function DebugPage() {
  const data = await getSessionData();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Session Info (Server-side)</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}