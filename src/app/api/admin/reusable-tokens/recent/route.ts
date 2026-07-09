import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

export const dynamic = 'force-dynamic';

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

    // Ordenar por última actividad visible (canje/entrega) y luego por creación.
    const [tokens, totalCount] = await Promise.all([
      prisma.$queryRaw<Array<{
        id: string;
        prizeId: string;
        groupId: string | null;
        expiresAt: Date;
        createdAt: Date;
        redeemedAt: Date | null;
        deliveredAt: Date | null;
        deliveryNote: string | null;
        maxUses: number;
        usedCount: number;
        startTime: Date | null;
        endTime: Date | null;
        disabled: boolean;
      }>>`
        SELECT rt.*
        FROM "ReusableToken" rt
        ORDER BY GREATEST(
          COALESCE(rt."redeemedAt", rt."createdAt"),
          COALESCE(rt."deliveredAt", rt."createdAt"),
          rt."createdAt"
        ) DESC,
        rt."createdAt" DESC
        OFFSET ${offset}
        LIMIT ${limit}
      `,
      prisma.reusableToken.count()
    ]);

    const prizeIds = Array.from(new Set(tokens.map(token => token.prizeId)));
    const groupIds = Array.from(new Set(tokens.map(token => token.groupId).filter((groupId): groupId is string => !!groupId)));

    const [prizes, groups] = await Promise.all([
      prisma.reusablePrize.findMany({
        where: { id: { in: prizeIds } },
        select: {
          id: true,
          label: true,
          key: true,
          color: true
        }
      }),
      prisma.tokenGroup.findMany({
        where: { id: { in: groupIds } },
        select: {
          id: true,
          name: true,
          color: true
        }
      })
    ]);

    const prizeById = new Map(prizes.map(prize => [prize.id, prize]));
    const groupById = new Map(groups.map(group => [group.id, group]));

    const formattedTokens = tokens.map(token => ({
      id: token.id,
      qrUrl: `${process.env.NEXT_PUBLIC_QR_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reusable/${token.id}`,
      prize: {
        id: prizeById.get(token.prizeId)?.id || token.prizeId,
        label: prizeById.get(token.prizeId)?.label || 'Premio desconocido',
        key: prizeById.get(token.prizeId)?.key || '',
        color: prizeById.get(token.prizeId)?.color || null
      },
      group: token.groupId ? {
        id: token.groupId,
        name: groupById.get(token.groupId)?.name || 'Grupo desconocido',
        color: groupById.get(token.groupId)?.color || null
      } : null,
      maxUses: token.maxUses,
      usedCount: token.usedCount,
      expiresAt: token.expiresAt,
      startTime: token.startTime,
      endTime: token.endTime,
      createdAt: token.createdAt,
      deliveryNote: token.deliveryNote,
      redeemedAt: token.redeemedAt,
      deliveredAt: token.deliveredAt
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