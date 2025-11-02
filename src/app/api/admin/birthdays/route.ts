import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';
import { listReservations, createReservation, parseDateStringToLima, limaDateTimeToJSDate } from '@/lib/birthdays/service';

const ListSchema = z.object({
  status: z.string().optional(),
  packId: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateFilter: z.enum(['all', 'upcoming', 'past', 'today']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const adminCookie = getSessionCookieFromRequest(req as unknown as Request);
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const adminSession = await verifySessionCookie(adminCookie);
    const userSession = await verifyUserSessionCookie(userCookie);
    const session = adminSession || userSession;
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    // Allow ADMIN/STAFF from admin session, or COLLAB/STAFF from user session
    const isAdmin = adminSession?.role && ['ADMIN', 'STAFF'].includes(adminSession.role);
    const isUser = userSession?.role && ['COLLAB', 'STAFF'].includes(userSession.role);
    if (!isAdmin && !isUser) return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
    const rl = checkRateLimit(`admin:birthdays:list:${ip}`);
    if (!rl.ok) return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });

    const { searchParams } = new URL(req.url);
    const parsed = ListSchema.safeParse({
      status: searchParams.get('status') || undefined,
      packId: searchParams.get('packId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      dateFilter: searchParams.get('dateFilter') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });
    if (!parsed.success) {
      // Extrae detalles legibles para el usuario
      const details = parsed.error.flatten();
      let userMsg = 'La consulta enviada es inválida.';
      if (details && details.fieldErrors) {
    const fieldErrors = details.fieldErrors as Record<string, string[]>;
    const fields = Object.keys(fieldErrors).filter(k => fieldErrors[k]?.length);
        if (fields.length) {
          userMsg += ' Campos con error: ' + fields.join(', ');
        }
      }
      return apiError('INVALID_QUERY', userMsg, details, 400);
    }

    const f = parsed.data;
    
    // Calcular filtros de fecha basados en dateFilter
    let effectiveDateFrom = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00.000Z') : undefined;
    let effectiveDateTo = f.dateTo ? new Date(f.dateTo + 'T23:59:59.999Z') : undefined;
    
    if (f.dateFilter && f.dateFilter !== 'all') {
      // Obtener fecha actual en zona Lima (UTC-5)
      const now = new Date();
      const limaNow = new Date(now.getTime() - 5 * 3600 * 1000);
      const today = new Date(limaNow.getUTCFullYear(), limaNow.getUTCMonth(), limaNow.getUTCDate());
      
      switch (f.dateFilter) {
        case 'upcoming':
          effectiveDateFrom = today;
          break;
        case 'past':
          effectiveDateTo = new Date(today.getTime() - 24 * 3600 * 1000); // Ayer
          break;
        case 'today':
          effectiveDateFrom = today;
          effectiveDateTo = new Date(today.getTime() + 24 * 3600 * 1000 - 1); // Fin del día
          break;
      }
    }
    
    const res = await listReservations({ 
      status: f.status, 
      packId: f.packId, 
      dateFrom: effectiveDateFrom, 
      dateTo: effectiveDateTo, 
      search: f.search 
    }, { page: f.page, pageSize: f.pageSize });
    return apiOk(res);
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Detect common production mismatch: new columns not migrated yet
    if (/column .* does not exist/i.test(msg) || /no such column/i.test(msg)) {
      return apiError('DB_SCHEMA_MISMATCH', 'Faltan migraciones en la base de datos (ejecuta prisma migrate deploy).', { raw: msg }, 500);
    }
    if (/P2021/.test(msg) || /P2022/.test(msg)) {
      return apiError('DB_SCHEMA_MISMATCH', 'Inconsistencia de esquema Prisma. Ejecuta migraciones.', { raw: msg }, 500);
    }
  return apiError('INTERNAL_ERROR', 'Error interno al listar reservas', { raw: msg }, 500);
  }
}

const CreateSchema = z.object({
  celebrantName: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  documento: z.string().min(3).max(40),
  email: z.string().email().optional().nullable(), // mantenido por compatibilidad; UI ya no lo envía
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.string().min(1).max(20),
  packId: z.string().min(1),
  guestsPlanned: z.number().int().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const adminCookie = getSessionCookieFromRequest(req as unknown as Request);
  const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
  const adminSession = await verifySessionCookie(adminCookie);
  const userSession = await verifyUserSessionCookie(userCookie);
  const session = adminSession || userSession;
  if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
  // Allow ADMIN/STAFF from admin session, or COLLAB/STAFF from user session
  const isAdmin = adminSession?.role && ['ADMIN', 'STAFF'].includes(adminSession.role);
  const isUser = userSession?.role && ['COLLAB', 'STAFF'].includes(userSession.role);
  if (!isAdmin && !isUser) return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

  const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
  const rl = checkRateLimit(`admin:birthdays:create:${ip}`);
  if (!rl.ok) return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);
  const { celebrantName, phone, documento, email, date, timeSlot, packId, guestsPlanned } = parsed.data;
    const dt = limaDateTimeToJSDate(parseDateStringToLima(date));
    if (!isFinite(dt.getTime())) return apiError('INVALID_DATE', 'invalid date', undefined, 400);

    const created = await createReservation({
      celebrantName,
      phone,
      documento,
  email: email || undefined,
      date: dt,
      timeSlot,
      packId,
      guestsPlanned,
      createdBy: session?.role,
    });

    const dto = {
      id: created.id,
      celebrantName: created.celebrantName,
      phone: created.phone,
      documento: created.documento,
      email: created.email ?? null,
      date: created.date.toISOString().slice(0, 10),
      timeSlot: created.timeSlot,
      pack: { id: created.pack.id, name: created.pack.name, qrCount: created.pack.qrCount, bottle: created.pack.bottle, featured: created.pack.featured },
      guestsPlanned: created.guestsPlanned,
      status: created.status,
      tokensGeneratedAt: created.tokensGeneratedAt ? created.tokensGeneratedAt.toISOString() : null,
      createdAt: created.createdAt.toISOString(),
    };
    return apiOk({ ok: true, reservation: dto }, 201);
  } catch (e) {
    return apiError('CREATE_RESERVATION_ERROR', 'Failed to create reservation');
  }
}
