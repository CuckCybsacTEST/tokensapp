import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const sessionCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || 'No autorizado' }, { status: 401 });
    }

    const { tokenId } = params;

    const token = await prisma.reusableToken.findUnique({
      where: { id: tokenId },
      select: { id: true, usedCount: true, maxUses: true, redeemedAt: true, deliveredAt: true }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const redemptions = await prisma.reusableTokenRedemption.findMany({
      where: { tokenId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      tokenId,
      usedCount: token.usedCount,
      maxUses: token.maxUses,
      redemptions
    });
  } catch (error) {
    console.error('Error fetching token history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
