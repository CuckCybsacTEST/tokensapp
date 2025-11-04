import React from "react";
import { verifySessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";
// Garantizar arranque del scheduler también al renderizar el layout de admin
import "@/server/start";

export const metadata = {
  title: {
    default: 'Admin',
    template: '%s · Admin · Go Lounge!'
  },
  description: "Panel administración Go Lounge!",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Obtener sesión del request para mostrar info del usuario (rol)
  const cookie = cookies().get("admin_session")?.value;
  const session = await verifySessionCookie(cookie);
  const role = session?.role || null;
  return (
  <>
      <div className="pt-4">{children}</div>
  </>
  );
}
