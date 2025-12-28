import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RATE_LIMIT_SUBMITS, RATE_LIMIT_WINDOW_MS } from '@/features/survive2025/constants';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
  }

  try {
    const runs = await prisma.survive2025Run.findMany({
      where: { eventId },
      orderBy: [
        { score: 'desc' },
        { bestMs: 'desc' }
      ],
      take: limit,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, displayName, bestMs, score, sessionId, deviceHash } = body;

    if (!eventId || !displayName || typeof bestMs !== 'number' || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Rate limiting check
    if (deviceHash) {
        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
        const recentCount = await prisma.survive2025Run.count({
            where: {
                deviceHash,
                createdAt: {
                    gte: windowStart
                }
            }
        });

        if (recentCount >= RATE_LIMIT_SUBMITS) {
             return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }
    }

    const run = await prisma.survive2025Run.create({
      data: {
        eventId,
        displayName: displayName.slice(0, 20), // Enforce max length
        bestMs,
        score,
        sessionId,
        deviceHash,
      },
    });

    return NextResponse.json({ success: true, run });
  } catch (error) {
    console.error('Error submitting run:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
