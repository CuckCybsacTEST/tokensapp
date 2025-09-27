import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';
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
  try {
    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        personId: true,
        person: {
          select: {
            name: true,
            scans: {
              where: { businessDay: todayBD },
              select: { type: true, scannedAt: true },
              orderBy: { scannedAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });
    const scans = me?.person?.scans || [];
    personName = me?.person?.name || undefined;
    const hasInToday = scans.some(s => s.type === 'IN');
    const hasOutToday = scans.some(s => s.type === 'OUT');
    nextAction = hasInToday && !hasOutToday ? 'OUT' : 'IN';
  } catch {}
  return (
    // Página de selección de acciones: Acción principal (IN/OUT) / Ver lista de tareas / Control Caja (si aplica)
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-6">Bienvenido{personName ? `, ${personName}` : ''}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MarkAttendanceCard nextAction={nextAction} />
          <Link href="/u/checklist" className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-slate-700 dark:bg-slate-800">
            <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Ver lista de tareas</div>
            <p className="text-sm text-gray-600 dark:text-slate-300">Revisa tus tareas del día, marca las completadas y sigue tu progreso.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">Ver tareas →</div>
          </Link>
          {isStaff && (
            <Link href="/u/tokens" className="block rounded-lg border border-emerald-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-emerald-800/60 dark:bg-slate-800 sm:col-span-2">
              <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Control de Tokens</div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Encender o pausar el sistema de tokens y revisar conteos básicos.</p>
              <div className="mt-4 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">Abrir control →</div>
            </Link>
          )}
          {session.role === 'STAFF' && (
            <Link href="/u/attendance" className="block rounded-lg border border-indigo-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-indigo-800/60 dark:bg-slate-800 sm:col-span-2">
              <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Control de Asistencia</div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Consulta la tabla de asistencia en tiempo real (solo lectura).</p>
              <div className="mt-4 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm">Abrir asistencia →</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
