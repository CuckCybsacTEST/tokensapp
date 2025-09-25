import React from "react";
import "../globals.css";
import UserLogoutButton from "./components/LogoutButton";
import BackLink from "./components/BackLink";
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth-user";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Colaborador | QR App",
};

export default async function ULayout({ children }: { children: React.ReactNode }) {
  // Cargar datos del colaborador (si hay sesión activa)
  let me: { personName?: string | null; dni?: string | null } | null = null;
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    if (session) {
      const u = await prisma.user.findUnique({ where: { id: session.userId }, include: { person: true } });
      me = { personName: u?.person?.name ?? null, dni: u?.person?.dni ?? null };
    }
  } catch {}

  return (
    <html lang="es" className="h-full">
      <body className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
        <header className="app-container py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <a href="/u" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">Colaborador</a>
              {me && (
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="font-medium text-slate-700 dark:text-slate-200">{me.personName || 'Usuario'}</div>
                  {typeof me.dni === 'string' && me.dni.trim() !== '' && (
                    <div className="opacity-80">DNI: <span className="font-mono">{me.dni}</span></div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <BackLink />
              {me ? <UserLogoutButton /> : <div />}
            </div>
          </div>
        </header>
        <main className="app-container py-2">
          {children}
        </main>
      </body>
    </html>
  );
}
