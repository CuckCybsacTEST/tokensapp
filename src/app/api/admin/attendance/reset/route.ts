export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { apiError } from '@/lib/apiError';
import { PrismaClient } from '@prisma/client';
import { getConfiguredCutoffHour, computeBusinessDayFromUtc } from '@/lib/attendanceDay';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth';

const prisma = new PrismaClient();

type Body = {
  personId?: string;
  personCode?: string;
  day?: string; // YYYY-MM-DD (businessDay). Si se omite se toma el businessDay actual.
  force?: boolean; // permitir reset incluso si la jornada está completa (IN y OUT)
};

export async function POST(req: NextRequest) {
  // Auth
  // Aceptar admin_session con role ADMIN/STAFF o user_session role STAFF
  let actingSession: { kind: 'ADMIN' | 'USER'; role: string; userId?: string } | null = null;
  const rawAdmin = getSessionCookieFromRequest(req as any as Request);
  const adminSession = await verifySessionCookie(rawAdmin);
  if (adminSession && requireRole(adminSession, ['ADMIN','STAFF']).ok) {
    actingSession = { kind: 'ADMIN', role: adminSession.role || 'ADMIN' };
  } else {
    const rawUser = getUserCookie(req as any as Request);
    const userSession = await verifyUserSessionCookie(rawUser);
    if (userSession && userSession.role === 'STAFF') {
      actingSession = { kind: 'USER', role: 'STAFF', userId: userSession.userId };
    }
  }
  if (!actingSession) return apiError('UNAUTHORIZED','UNAUTHORIZED',undefined,401);

  let body: Body;
  try { body = await req.json(); } catch { return apiError('INVALID_JSON','JSON inválido',undefined,400); }

  const { personId, personCode, day, force } = body || {};
  if (!personId && !personCode) return apiError('PERSON_REQUIRED','Indique personId o personCode',undefined,400);
  if (day && !/^\d{4}-\d{2}-\d{2}$/.test(day)) return apiError('INVALID_DAY','Formato de día inválido', { expected: 'YYYY-MM-DD' },400);

  try {
    // Resolver persona
    const person = await prisma.person.findFirst({
      where: personId ? { id: personId } : { code: personCode! },
      select: { id: true, code: true, name: true }
    });
    if (!person) return apiError('PERSON_NOT_FOUND','Persona no encontrada',undefined,404);

    // Determinar businessDay target
    let targetDay = day;
    if (!targetDay) {
      const cutoff = getConfiguredCutoffHour();
      targetDay = computeBusinessDayFromUtc(new Date(), cutoff);
    }

    // Obtener scans de esa jornada
    const scans = await prisma.scan.findMany({
      where: { personId: person.id, businessDay: targetDay },
      orderBy: { scannedAt: 'asc' },
      select: { id: true, type: true, scannedAt: true }
    });

    if (scans.length === 0) {
      return new Response(JSON.stringify({ ok: true, removed: 0, status: 'NO_SCANS', day: targetDay }), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const hasIn = scans.some(s => s.type === 'IN');
    const hasOut = scans.some(s => s.type === 'OUT');
    const completed = hasIn && hasOut;

    if (completed && !force) {
      return apiError('RESET_COMPLETED_NOT_ALLOWED','La jornada está completa (IN y OUT). Use force=true para forzar.', { day: targetDay }, 409);
    }

    // Eliminar scans en transacción y log
    await prisma.$transaction(async (tx) => {
      await tx.scan.deleteMany({ where: { personId: person.id, businessDay: targetDay } });
      await tx.eventLog.create({
        data: {
          type: 'ATTENDANCE_RESET',
            message: `Reset de jornada businessDay=${targetDay} person=${person.code}`,
            metadata: JSON.stringify({ personId: person.id, personCode: person.code, day: targetDay, removed: scans.length, completed, force, by: actingSession })
        }
      });
    });

    return new Response(JSON.stringify({ ok: true, removed: scans.length, day: targetDay, completedBefore: completed }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    return apiError('INTERNAL_ERROR','Error interno', { message: String(e?.message || e) }, 500);
  }
}
