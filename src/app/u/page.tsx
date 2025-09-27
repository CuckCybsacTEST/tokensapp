import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';
import CommitmentModal from './CommitmentModal';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '@/lib/attendanceDay';
import MarkAttendanceCard from './MarkAttendanceCard';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function UHome() {
  // Validar sesión de colaborador; si no está logueado, ir a /u/login
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session) {
    redirect(`/u/login?next=${encodeURIComponent('/u')}`);
  }

  // Mostrar control de tokens a cualquier STAFF (antes solo Caja)
  const isStaff = session.role === 'STAFF';

  // Calcular próxima acción para hoy según última marca real (día laboral)
  const cutoff = getConfiguredCutoffHour();
  const todayBD = computeBusinessDayFromUtc(new Date(), cutoff);
  let nextAction: 'IN' | 'OUT' = 'IN';
  let personName: string | undefined;
  let commitmentAcceptedVersion = 0;
  const REQUIRED_COMMITMENT_VERSION = 1;
  try {
    const me: any = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { person: { select: { name: true, scans: { where: { businessDay: todayBD }, select: { type: true, scannedAt: true }, orderBy: { scannedAt: 'desc' }, take: 5 } } } }
    });
    const scans = me?.person?.scans || [];
    personName = me?.person?.name || undefined;
    commitmentAcceptedVersion = me?.commitmentVersionAccepted || 0;
  const hasInToday = scans.some((s: any) => s.type === 'IN');
  const hasOutToday = scans.some((s: any) => s.type === 'OUT');
    nextAction = hasInToday && !hasOutToday ? 'OUT' : 'IN';
  } catch {}
  return (
    // Página de selección de acciones: Acción principal (IN/OUT) / Ver lista de tareas / Control Caja (si aplica)
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-6 text-center">Bienvenido{personName ? `, ${personName}` : ''}</h1>
        <div className="space-y-8">
          {/* Bloque inicial: acciones personales en una sola columna para mejor lectura */}
          <div className="grid grid-cols-1 gap-4">
            <MarkAttendanceCard nextAction={nextAction} />
            <Link href="/u/checklist" className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-slate-700 dark:bg-slate-800">
              <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Ver mi lista de tareas</div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Revisa tus tareas del día, marca las completadas y sigue tu progreso.</p>
              <div className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">Ver mis tareas →</div>
            </Link>
          </div>
          {/* Separador / título de controles */}
          {(isStaff || session.role === 'STAFF') && (
            <div className="flex items-center gap-4 select-none" aria-hidden>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/60 dark:via-slate-600/60 to-transparent" />
              <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Controles</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300/60 dark:via-slate-600/60 to-transparent" />
            </div>
          )}

          {/* Bloque staff: dos columnas incluso en móviles (grid-cols-2 sin breakpoint) */}
          {(isStaff || session.role === 'STAFF') && (
            <div className="grid grid-cols-2 gap-4">
              {isStaff && (
                <Link href="/u/tokens" className="block rounded-lg border border-emerald-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-emerald-800/60 dark:bg-slate-800 text-center">
                  <div className="text-base font-medium leading-snug break-words whitespace-normal text-gray-900 dark:text-slate-100">Control de Tokens</div>
                </Link>
              )}
              {isStaff && (
                <Link href="/u/tasks" className="block rounded-lg border border-purple-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-purple-800/60 dark:bg-slate-800 text-center">
                  <div className="text-base font-medium leading-snug break-words whitespace-normal text-gray-900 dark:text-slate-100">Control de Tareas</div>
                </Link>
              )}
              {session.role === 'STAFF' && (
                <Link href="/u/attendance" className="block rounded-lg border border-indigo-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-indigo-800/60 dark:bg-slate-800 text-center">
                  <div className="text-base font-medium leading-snug break-words whitespace-normal text-gray-900 dark:text-slate-100">Control de Asistencia</div>
                </Link>
              )}
              {session.role === 'STAFF' && (
                <Link href="/u/users" className="block rounded-lg border border-amber-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-amber-800/60 dark:bg-slate-800 text-center">
                  <div className="text-base font-medium leading-snug break-words whitespace-normal text-gray-900 dark:text-slate-100">Control de Colaboradores</div>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
      <CommitmentModal userId={session.userId} initialAcceptedVersion={commitmentAcceptedVersion} requiredVersion={REQUIRED_COMMITMENT_VERSION} />
    </div>
  );
}
