import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';

// GET /api/birthdays/public/reservation?id=RID
// Returns minimal public-safe info about a reservation (no phone/email/documento exposure)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = (searchParams.get('id') || '').trim();
    if (!id) return apiError('INVALID_QUERY','id required');

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rl = checkRateLimit(`public:birthdays:reservation:${ip}`);
    if (!rl.ok) return apiError('RATE_LIMITED','Too many requests',undefined,429,{ 'Retry-After': String(rl.retryAfterSeconds) });

    const r = await prisma.birthdayReservation.findUnique({ where: { id } });
    if (!r) return apiOk({ reservation: null });

    const dto = {
      id: r.id,
      celebrantName: r.celebrantName,
      date: r.date.toISOString().slice(0,10),
      timeSlot: r.timeSlot,
      status: r.status,
      tokensGeneratedAt: r.tokensGeneratedAt ? r.tokensGeneratedAt.toISOString() : null,
    };
    return apiOk({ reservation: dto });
  } catch(e:any){
    return apiError('INTERNAL_ERROR','failed',{ raw: String(e?.message||e) },500);
  }
}
