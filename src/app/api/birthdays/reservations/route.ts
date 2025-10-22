import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { createReservation } from '@/lib/birthdays/service';
import { signClientSecret } from '@/lib/birthdays/clientAuth';
import { isBirthdaysEnabledPublic } from '@/lib/featureFlags';
import { corsHeadersFor } from '@/lib/cors';
import { parseDateStringToLima, limaDateTimeToJSDate } from '@/lib/birthdays/service';

const CreateReservationSchema = z.object({
  celebrantName: z.string().min(1).max(120),
  phone: z.string().min(5).max(40),
  documento: z.string().min(3).max(40),
  email: z.string().email().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  timeSlot: z.string().min(1).max(20),
  packId: z.string().min(1),
  guestsPlanned: z.number().int().min(1).max(200),
  referrerId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);
  // Feature flag: gate public birthdays creation
  if (!isBirthdaysEnabledPublic()) {
    return apiError('NOT_FOUND', 'Not found', undefined, 404, cors);
  }
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  // Rate limiting por IP TEMPORALMENTE DESACTIVADO
  /*
  const rl = checkRateLimit(`birthdays:create:${ip}`);
  if (!rl.ok) {
    return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { ...cors, 'Retry-After': String(rl.retryAfterSeconds) });
  }
  */
  try {
    const body = await req.json();
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('INVALID_BODY', 'Validation failed', parsed.error.flatten(), 400, cors);
    }
    const { celebrantName, phone, documento, email, date, timeSlot, packId, guestsPlanned, referrerId } = parsed.data;
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
      referrerId,
    });

    // Build a safe DTO (omit heavy relations and internal fields not needed client-side)
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
    const clientSecret = signClientSecret(created.id, 15);
    return apiOk({ ok: true, ...dto, clientSecret }, 201, cors);
  } catch (e) {
    console.error('[API] Error creating reservation:', e);
    return apiError('CREATE_RESERVATION_ERROR', 'Failed to create reservation', e instanceof Error ? e.message : String(e), 500, cors);
  }
}

export async function OPTIONS(req: NextRequest) {
  const cors = corsHeadersFor(req as unknown as Request);
  return new Response(null, { status: 204, headers: cors });
}
