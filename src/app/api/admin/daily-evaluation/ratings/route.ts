import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/daily-evaluation/ratings?day=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const day = req.nextUrl.searchParams.get('day');
    if (!day) return NextResponse.json({ error: 'day param required' }, { status: 400 });

    const ratings = await prisma.personDailyRating.findMany({
      where: { businessDay: day },
      include: { person: { select: { id: true, name: true, code: true, area: true } } },
    });

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Error fetching person ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/daily-evaluation/ratings
// body: { businessDay, ratings: [{ personId, rating, note? }] }
export async function POST(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessDay, ratings } = await req.json();
    if (!businessDay || !Array.isArray(ratings)) {
      return NextResponse.json({ error: 'businessDay and ratings[] required' }, { status: 400 });
    }

    const validRatings = ['MALO', 'REGULAR', 'BUENO', 'MUY_BUENO'];

    const results = await prisma.$transaction(
      ratings.map((r: { personId: string; rating: string; note?: string }) =>
        prisma.personDailyRating.upsert({
          where: { businessDay_personId: { businessDay, personId: r.personId } },
          create: {
            businessDay,
            personId: r.personId,
            rating: validRatings.includes(r.rating) ? r.rating : 'REGULAR',
            note: r.note?.trim() || null,
            ratedByUserId: session.userId,
          },
          update: {
            rating: validRatings.includes(r.rating) ? r.rating : 'REGULAR',
            note: r.note?.trim() || null,
            ratedByUserId: session.userId,
          },
        })
      )
    );

    return NextResponse.json({ ok: true, count: results.length });
  } catch (error) {
    console.error('Error saving person ratings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
