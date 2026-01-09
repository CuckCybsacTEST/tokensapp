import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Obtener tokens con paginación
    const [tokens, totalCount] = await Promise.all([
      prisma.reusableToken.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          prize: {
            select: {
              id: true,
              label: true,
              key: true,
              color: true
            }
          }
        }
      }),
      prisma.reusableToken.count()
    ]);

    const formattedTokens = tokens.map(token => ({
      id: token.id,
      qrUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reusable/${token.id}`,
      prize: {
        id: token.prize.id,
        label: token.prize.label,
        key: token.prize.key,
        color: token.prize.color
      },
      maxUses: token.maxUses,
      usedCount: token.usedCount,
      expiresAt: token.expiresAt,
      startTime: token.startTime,
      endTime: token.endTime,
      createdAt: token.createdAt,
      deliveryNote: token.deliveryNote
    }));

    return NextResponse.json({
      tokens: formattedTokens,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching recent tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}