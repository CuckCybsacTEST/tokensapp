import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/daily-evaluation?day=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR', 'STAFF', 'COLLAB'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const day = req.nextUrl.searchParams.get('day');
    if (!day) return NextResponse.json({ error: 'day param required' }, { status: 400 });

    const evaluation = await prisma.dailyEvaluation.findUnique({
      where: { businessDay: day }
    });

    // Resolve user names for closedBy and evaluatedBy
    let closedByName: string | null = null;
    let evaluatedByName: string | null = null;
    if (evaluation?.closedByUserId) {
      const u = await prisma.user.findUnique({ where: { id: evaluation.closedByUserId }, select: { person: { select: { name: true } }, username: true } });
      closedByName = u?.person?.name || u?.username || null;
    }
    if (evaluation?.evaluatedByUserId) {
      const u = await prisma.user.findUnique({ where: { id: evaluation.evaluatedByUserId }, select: { person: { select: { name: true } }, username: true } });
      evaluatedByName = u?.person?.name || u?.username || null;
    }

    return NextResponse.json({ evaluation: evaluation ? { ...evaluation, closedByName, evaluatedByName } : null });
  } catch (error) {
    console.error('Error fetching daily evaluation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/daily-evaluation  — save rating + comment
export async function POST(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessDay, rating, comment } = await req.json();
    if (!businessDay) {
      return NextResponse.json({ error: 'businessDay required' }, { status: 400 });
    }

    const validRatings = ['MALO', 'REGULAR', 'BUENO', 'MUY_BUENO'];
    if (rating && !validRatings.includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    // Check that the day is closed before allowing evaluation
    const existing = await prisma.dailyEvaluation.findUnique({ where: { businessDay } });
    if (!existing?.closedAt) {
      return NextResponse.json({ error: 'La jornada debe estar cerrada para evaluar' }, { status: 400 });
    }

    // Block if already evaluated (finalized)
    if (existing.rating) {
      return NextResponse.json({ error: 'Evaluación ya finalizada. Reabra la jornada para volver a evaluar.' }, { status: 403 });
    }

    const evaluation = await prisma.dailyEvaluation.update({
      where: { businessDay },
      data: {
        rating: rating || null,
        comment: comment?.trim() || null,
        evaluatedByUserId: session.userId,
      },
    });

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error('Error saving daily evaluation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/daily-evaluation  — close or reopen a day
export async function PATCH(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { businessDay, action } = await req.json();
    if (!businessDay || !['close', 'reopen'].includes(action)) {
      return NextResponse.json({ error: 'businessDay and action (close/reopen) required' }, { status: 400 });
    }

    if (action === 'close') {
      // Prevent closing a future day
      const now = new Date();
      const limaOffset = -5;
      const limaHour = (now.getUTCHours() + limaOffset + 24) % 24;
      const ref = limaHour < 10 ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
      const todayBusiness = ref.toISOString().split('T')[0];
      if (businessDay > todayBusiness) {
        return NextResponse.json({ error: 'No se puede cerrar una jornada futura' }, { status: 400 });
      }

      const evaluation = await prisma.dailyEvaluation.upsert({
        where: { businessDay },
        create: {
          businessDay,
          closedAt: new Date(),
          closedByUserId: session.userId,
        },
        update: {
          closedAt: new Date(),
          closedByUserId: session.userId,
        },
      });
      return NextResponse.json({ evaluation });
    } else {
      // reopen — only ADMIN can reopen
      if (session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Solo ADMIN puede reabrir una jornada' }, { status: 403 });
      }
      // Delete individual ratings for this day
      await prisma.personDailyRating.deleteMany({ where: { businessDay } });

      const evaluation = await prisma.dailyEvaluation.update({
        where: { businessDay },
        data: {
          closedAt: null,
          closedByUserId: null,
          rating: null,
          comment: null,
          evaluatedByUserId: null,
        },
      });
      return NextResponse.json({ evaluation });
    }
  } catch (error) {
    console.error('Error closing/reopening day:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
