import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, apiOk } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';

// Public search to help users locate their birthday reservation (limited data)
// GET /api/birthdays/search?q=nombre
// Returns up to 5 recent approved reservations (tokens generated) matching celebrantName contains query (case-insensitive)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get('q') || '').trim();
  if (qRaw.length < 3) return apiError('INVALID_QUERY', 'query too short', { minLength: 3 }, 400);
  // Normalizamos espacios múltiples
  const q = qRaw.replace(/\s+/g, ' ');
  const isMostlyDigits = /[0-9]/.test(q) && q.replace(/[^0-9]/g, '').length >= Math.min(3, q.length);

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rl = checkRateLimit(`public:birthdays:search:${ip}`);
    if (!rl.ok) return apiError('RATE_LIMITED', 'Too many searches', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });

    // Limit window (e.g., last 90 days) to avoid exposing historical data
    const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000);

    // Construimos cláusula OR para nombre o documento. Para documento, si el query es mayormente dígitos intentamos match exact primero.
    const where: any = {
      // Incluir pending_review, approved, completed; excluir canceled para evitar ruido (se puede ajustar)
      status: { in: ['pending_review','approved','completed'] },
      date: { gte: cutoff },
      OR: [] as any[],
    };
    if (isMostlyDigits) {
      // Búsqueda priorizando documento exacto o que contenga
      const numeric = q.replace(/\s+/g,'');
      where.OR.push({ documento: { equals: numeric } });
      where.OR.push({ documento: { contains: numeric } });
      // También permitir nombre por si el usuario mezcló
      where.OR.push({ celebrantName: { contains: q, mode: 'insensitive' } });
    } else {
      where.OR.push({ celebrantName: { contains: q, mode: 'insensitive' } });
      // Permitir documento contiene si input alfanumérico (ej. letras accidentalmente)
      where.OR.push({ documento: { contains: q } });
    }

    const matches = await prisma.birthdayReservation.findMany({
      where,
      orderBy: [
        // Orden principal reciente
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 8,
      select: { id: true, celebrantName: true, documento: true, date: true, tokensGeneratedAt: true, status: true }
    });

    const items = matches.map(r => ({
      id: r.id,
      celebrantName: r.celebrantName,
      documento: r.documento,
      date: r.date.toISOString().slice(0,10),
      status: r.status,
      hasCards: !!r.tokensGeneratedAt,
    }));

    return apiOk({ items });
  } catch (e: any) {
    return apiError('INTERNAL_ERROR', 'search failed', { raw: String(e?.message||e) }, 500);
  }
}
