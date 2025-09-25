import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '@/lib/attendanceDay';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function UHome() {
  // Validar sesión de colaborador; si no está logueado, ir a /u/login
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session) {
    redirect(`/u/login?next=${encodeURIComponent('/u')}`);
  }

  // Cargar perfil para decidir visibilidad de "Control de Tokens (Caja)"
  let isCaja = false;
  if (session?.role === 'STAFF') {
    try {
      const u = await prisma.user.findUnique({ where: { id: session.userId }, include: { person: true } });
      isCaja = u?.person?.area === 'Caja';
    } catch {}
  }

  // Calcular próxima acción para hoy según última marca real (día laboral)
  const cutoff = getConfiguredCutoffHour();
  const todayBD = computeBusinessDayFromUtc(new Date(), cutoff);
  let nextAction: 'IN' | 'OUT' = 'IN';
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
    const hasInToday = scans.some(s => s.type === 'IN');
    const hasOutToday = scans.some(s => s.type === 'OUT');
    nextAction = hasInToday && !hasOutToday ? 'OUT' : 'IN';
  } catch {}

  // Página de selección de acciones: Acción principal (IN/OUT) / Ver lista de tareas / Control Caja (si aplica)
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="mx-auto max-w-3xl px-4 py-8">
  <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-6">¿Qué quieres hacer?</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Marcar asistencia</div>
            <p className="text-sm text-gray-600 dark:text-slate-300">
              {nextAction === 'IN' ? 'Comienza tu turno registrando tu Entrada.' : 'Finaliza tu turno registrando tu Salida.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a href="/u/manual" className="btn">
                {nextAction === 'IN' ? 'Registrar entrada' : 'Registrar salida'}
              </a>
              <a href="/u/scanner" className="btn-outline text-sm">Abrir escáner</a>
            </div>
            {nextAction === 'OUT' && (
              <div className="mt-2 text-xs text-slate-500">Consejo: en la pantalla siguiente, mantén presionado el botón 2s para confirmar la salida.</div>
            )}
          </div>
          <Link href="/u/checklist" className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-slate-700 dark:bg-slate-800">
            <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Ver lista de tareas</div>
            <p className="text-sm text-gray-600 dark:text-slate-300">Revisa tus tareas del día, marca las completadas y sigue tu progreso.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">Ver tareas →</div>
          </Link>
          {isCaja && (
            <Link href="/u/caja" className="block rounded-lg border border-emerald-200 bg-white p-5 shadow-sm hover:shadow-md transition dark:border-emerald-800/60 dark:bg-slate-800 sm:col-span-2">
              <div className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">Control de Tokens (Caja)</div>
              <p className="text-sm text-gray-600 dark:text-slate-300">Activá o desactivá los tokens del sistema y revisá métricas básicas.</p>
              <div className="mt-4 inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">Abrir control →</div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
