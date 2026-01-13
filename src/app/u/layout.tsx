import React from "react";
import UserLogoutButton from "./components/LogoutButton";
import SmartBackLink from "./components/SmartBackLink";
import ForcePasswordChangeGuard from "./components/ForcePasswordChangeGuard";
import CommitmentModal from "./CommitmentModal";
import ThemeToggle from '@/components/theme/ThemeToggle';
import { cookies } from "next/headers";
import { verifyUserSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CURRENT_REGULATION } from "@/lib/regulations/constants";

export const metadata = {
  title: "Colaborador | QR App",
};

export default async function ULayout({ children }: { children: React.ReactNode }) {
  // Cargar datos del colaborador (si hay sesión activa)
  let me: { personName?: string | null; dni?: string | null; jobTitle?: string | null; role?: string | null } | null = null;
  let mustChangePassword = false;
  let userId: string | null = null;
  let commitmentAcceptedVersion = 0;
  const REQUIRED_VERSION = CURRENT_REGULATION.version;

  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    if (session) {
      userId = session.userId;
      const u = await prisma.user.findUnique({ where: { id: session.userId }, include: { person: true } });

      mustChangePassword = !!u?.forcePasswordChange;
      commitmentAcceptedVersion = u?.commitmentVersionAccepted || 0;

      // Try to read staff record (if the collaborator is registered as staff)
      let staffRecord = null;
      try {
        staffRecord = await prisma.staff.findUnique({ where: { userId: u?.id } });
      } catch (e) {
        // ignore
      }

      // Map staff role to a human friendly label when available
      const mapRoleLabel = (r: string | null | undefined) => {
        if (!r) return null;
        switch (r) {
          case 'WAITER': return 'Mozos';
          case 'BARTENDER': return 'Barra';
          case 'CASHIER': return 'Caja';
          case 'ADMIN': return 'Administrador';
          default: return r;
        }
      };

      const roleLabel = staffRecord?.role ? mapRoleLabel(staffRecord.role) : mapRoleLabel(u?.role ?? null);

      me = {
        personName: u?.person?.name ?? null,
        dni: u?.person?.dni ?? null,
        jobTitle: u?.person?.jobTitle ?? null,
        role: roleLabel ?? null
      };
    }
  } catch {}

  // Siempre usar layout normal sin sidebar para /u
  return (
    <div className="min-h-full antialiased bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 app-container py-2 sm:py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <a href="/u" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">Colaborador</a>
            {me && (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="font-medium text-slate-700 dark:text-slate-200">{me.personName || 'Usuario'}</div>
                {typeof me.dni === 'string' && me.dni.trim() !== '' && (
                  <div className="opacity-80">DNI: <span className="font-mono">{me.dni}</span></div>
                )}
                {(me.jobTitle || me.role) && (
                  <div className="opacity-80">
                    {me.role ? me.role : (me.jobTitle || 'Sin puesto')}
                  </div>
                )}
              </div>
            )}
          </div>
            <div className="flex items-center gap-2">
              <SmartBackLink />
              {me ? (
                <>
                  <UserLogoutButton />
                  <ThemeToggle compact />
                </>
              ) : (
                <ThemeToggle compact />
              )}
            </div>
        </div>
      </header>
      <main className="app-container pt-0 pb-2">
        <ForcePasswordChangeGuard required={mustChangePassword} />
        {children}
        {userId && (
          <CommitmentModal 
            userId={userId} 
            initialAcceptedVersion={commitmentAcceptedVersion} 
            requiredVersion={REQUIRED_VERSION} 
          />
        )}
      </main>
    </div>
  );
}
