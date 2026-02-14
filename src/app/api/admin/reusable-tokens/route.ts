import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    // Get batches with isReusable = true
    const batches = await prisma.batch.findMany({
      where: { isReusable: true },
      include: {
        tokens: {
          select: {
            id: true,
            expiresAt: true,
            maxUses: true,
            usedCount: true,
            disabled: true,
            deliveredAt: true,
            prize: { select: { key: true, label: true, color: true } }
          }
        },
        _count: { select: { tokens: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get individual tokens (not in any batch)
    const allTokens = await prisma.token.findMany({
      select: {
        id: true,
        batchId: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        disabled: true,
        deliveredAt: true,
        prize: { select: { key: true, label: true, color: true } }
      }
    });
    const individualTokens = allTokens.filter(t => t.batchId === null);

    return NextResponse.json({ batches, individualTokens });
  } catch (error) {
    console.error('Error fetching reusable batches:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}