import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/daily-evaluation?day=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const raw = getUserSessionCookieFromRequest(req);
    const session = await verifyUserSessionCookie(raw);
    if (!session || !['ADMIN', 'COORDINATOR', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const day = req.nextUrl.searchParams.get('day');
    if (!day) return NextResponse.json({ error: 'day param required' }, { status: 400 });

    const evaluation = await prisma.dailyEvaluation.findUnique({
      where: { businessDay: day }
    });

    return NextResponse.json({ evaluation });
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
      const evaluation = await prisma.dailyEvaluation.update({
        where: { businessDay },
        data: {
          closedAt: null,
          closedByUserId: null,
        },
      });
      return NextResponse.json({ evaluation });
    }
  } catch (error) {
    console.error('Error closing/reopening day:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
