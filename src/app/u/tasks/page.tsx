import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function loadTasks(day: string) {
  // Cargamos todas las tareas activas y su estado agregado (completada hoy o valor medido) para VISUALIZACIÓN.
  // No exponemos acciones de edición/creación/borrado aquí.
  const tasks = await prisma.task.findMany({
    orderBy: [{ sortOrder: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  // Obtener estados por persona no aplica (vista general). Mostramos metadata básica.
  return tasks.map(t => ({
    id: t.id,
    label: t.label,
    priority: t.priority,
    measureEnabled: t.measureEnabled,
    targetValue: t.targetValue,
    unitLabel: t.unitLabel,
    startDay: t.startDay,
    endDay: t.endDay,
    active: t.active,
    completed: t.completed,
    area: t.area,
  }));
}

export default async function TasksReadonlyPage({ searchParams }: { searchParams: { day?: string } }) {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') {
    // Solo STAFF puede ver este panel global de referencia
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">
        Acceso restringido.
      </div>
    );
  }
  const cutoffDay = searchParams.day || new Date().toISOString().slice(0,10);
  const tasks = await loadTasks(cutoffDay);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-semibold">Control de Tareas (solo lectura)</h1>
          <div className="text-xs text-soft">Día de referencia: {cutoffDay}</div>
        </div>
        <p className="text-sm text-soft mb-6 max-w-3xl">
          Vista global de todas las tareas configuradas. No puedes editar desde aquí. Usa el panel de administración para cambios o la checklist personal para marcar progreso.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map(t => {
            const visible = (!t.startDay || t.startDay <= cutoffDay) && (!t.endDay || t.endDay >= cutoffDay) && t.active;
            return (
              <div key={t.id} className={`rounded-lg border p-4 shadow-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${!visible ? 'opacity-40' : ''}`}> 
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-sm leading-snug">
                    {t.label}
                  </div>
                  {t.measureEnabled && (
                    <span className="ml-2 badge-info text-[10px] font-semibold">M</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] text-soft mb-2">
                  {t.area && <span className="badge-info !px-2 !py-0.5">{t.area}</span>}
                  {t.priority === 2 && <span className="prio-high !px-2 !py-0.5">P2</span>}
                  {t.priority === 1 && <span className="prio-medium !px-2 !py-0.5">P1</span>}
                  {t.priority === 0 && <span className="prio-low !px-2 !py-0.5">P0</span>}
                  {!t.active && <span className="badge-warning !px-2 !py-0.5">Inactiva</span>}
                  {t.completed && <span className="badge-success !px-2 !py-0.5">Completada</span>}
                  {t.startDay && <span className="badge-info !px-2 !py-0.5">Desde {t.startDay}</span>}
                  {t.endDay && <span className="badge-danger !px-2 !py-0.5">Hasta {t.endDay}</span>}
                </div>
                {t.measureEnabled && (
                  <div className="text-[11px] text-soft">Objetivo: {t.targetValue ?? 0} {t.unitLabel || ''}</div>
                )}
              </div>
            );
          })}
        </div>
        {tasks.length === 0 && (
          <div className="text-sm text-soft mt-8">No hay tareas configuradas.</div>
        )}
        <div className="mt-10 text-xs text-soft">
          <Link href="/u" className="text-blue-600 dark:text-blue-400 hover:underline">← Volver</Link>
        </div>
      </div>
    </div>
  );
}
