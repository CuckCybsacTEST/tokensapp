import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { listReservations, createReservation } from '@/lib/birthdays/service';

const ListSchema = z.object({
  status: z.string().optional(),
  packId: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const cookie = getSessionCookieFromRequest(req as unknown as Request);
    const session = await verifySessionCookie(cookie);
    const authz = requireRole(session, ['ADMIN', 'STAFF']);
    if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

    const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
    const rl = checkRateLimit(`admin:birthdays:list:${ip}`);
    if (!rl.ok) return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });

    const { searchParams } = new URL(req.url);
    const parsed = ListSchema.safeParse({
      status: searchParams.get('status') || undefined,
      packId: searchParams.get('packId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });
    if (!parsed.success) return apiError('INVALID_QUERY', 'Validation failed', parsed.error.flatten(), 400);

    const f = parsed.data;
    const dateFrom = f.dateFrom ? new Date(f.dateFrom + 'T00:00:00.000Z') : undefined;
    const dateTo = f.dateTo ? new Date(f.dateTo + 'T23:59:59.999Z') : undefined;
    const res = await listReservations({ status: f.status, packId: f.packId, dateFrom, dateTo, search: f.search }, { page: f.page, pageSize: f.pageSize });
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
    return apiError('INTERNAL', 'Error interno al listar reservas', { raw: msg }, 500);
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
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN', 'STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED' ? 401 : 403);

  const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
  const rl = checkRateLimit(`admin:birthdays:create:${ip}`);
  if (!rl.ok) return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400);
  const { celebrantName, phone, documento, email, date, timeSlot, packId, guestsPlanned } = parsed.data;
    const dt = new Date(date + 'T00:00:00.000Z');
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
