export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

// Genera instancias para las próximas N semanas según la regla de recurrencia
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const r = requireRole(session, ['ADMIN', 'COORDINATOR']);
  if (!r.ok) return apiError('FORBIDDEN', 'Sin permiso', undefined, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* opcional */ }

  const task = await prisma.recurringTask.findUnique({ where: { id: params.id } });
  if (!task) return apiError('NOT_FOUND', 'Tarea no encontrada', undefined, 404);

  // Rango: desde hoy hasta N semanas adelante (default 4)
  const weeksAhead = typeof body.weeksAhead === 'number' ? Math.min(body.weeksAhead, 26) : 4;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + weeksAhead * 7);

  const dates: Date[] = [];

  if (task.recurrence === 'DAILY') {
    const cur = new Date(from);
    while (cur <= to) { dates.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  } else if (task.recurrence === 'WEEKLY' || task.recurrence === 'BIWEEKLY') {
    const targetDays = (task.daysOfWeek || '1').split(',').map(Number).filter(d => d >= 0 && d <= 6);
    const step = task.recurrence === 'BIWEEKLY' ? 14 : 7;
    // Buscar primera ocurrencia desde hoy
    for (const dayOfWeek of targetDays) {
      const cur = new Date(from);
      // Avanzar al próximo dayOfWeek
      while (cur.getDay() !== dayOfWeek) cur.setDate(cur.getDate() + 1);
      while (cur <= to) { dates.push(new Date(cur)); cur.setDate(cur.getDate() + step); }
    }
  } else if (task.recurrence === 'MONTHLY') {
    const dom = task.dayOfMonth || 1;
    const cur = new Date(from.getFullYear(), from.getMonth(), dom);
    if (cur < from) cur.setMonth(cur.getMonth() + 1);
    while (cur <= to) {
      dates.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  // Crear sólo las que no existen aún (upsert seguro)
  let created = 0;
  for (const scheduledFor of dates) {
    const existing = await prisma.recurringTaskInstance.findUnique({
      where: { taskId_scheduledFor: { taskId: task.id, scheduledFor } },
    });
    if (!existing) {
      await prisma.recurringTaskInstance.create({ data: { taskId: task.id, scheduledFor } });
      created++;
    }
  }

  return apiOk({ created, total: dates.length });
}
