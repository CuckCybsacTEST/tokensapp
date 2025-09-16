import React from "react";
import "../globals.css";
import LogoutButton from "./components/LogoutButton";
import { verifySessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

export const metadata = {
  title: "QR Prize Admin",
  description: "Panel administración QR premios",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Obtener sesión del request para mostrar info del usuario (rol)
  let role: string | null = null;
  const cookie = cookies().get("admin_session")?.value;
  const session = await verifySessionCookie(cookie);
  role = session?.role || null;
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <header className="border-b border-slate-200 dark:border-slate-700 bg-[var(--color-bg-soft)]/60 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-bg-soft)]/40">
          <div className="app-container flex items-center justify-between py-3">
            <a href="/admin" className="font-semibold tracking-tight">
              QR Prize Admin
            </a>
            <div className="flex items-center gap-4">
              {/* Info del usuario logueado */}
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {role ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center justify-center rounded bg-slate-700/20 px-2 py-0.5">{role}</span>
                  </span>
                ) : (
                  <span className="opacity-60">Sin sesión</span>
                )}
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>
        <div className="app-container pt-8">{children}</div>
      </body>
    </html>
  );
}
