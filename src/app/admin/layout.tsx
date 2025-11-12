import React from "react";
import { verifyUserSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";
// Garantizar arranque del scheduler también al renderizar el layout de admin
import "@/server/start";
import { AdminLayout } from "@/components/AdminLayout";

export const metadata = {
  title: {
    default: 'Admin',
    template: '%s · Admin · Go Lounge!'
  },
  description: "Panel administración Go Lounge!",
};

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Obtener sesión del request para mostrar info del usuario (rol)
  const raw = cookies().get("user_session")?.value;
  const session = await verifyUserSessionCookie(raw);
  const role = session?.role || null;
  return (
    <AdminLayout basePath="admin" hasSession={!!session}>
      {children}
    </AdminLayout>
  );
}
