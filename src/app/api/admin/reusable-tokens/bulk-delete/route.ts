import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

// POST /api/admin/reusable-tokens/bulk-delete
// body: { tokenIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const { tokenIds } = await req.json();
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return apiError('BAD_REQUEST', 'tokenIds[] requerido');
    }

    // Only delete tokens that haven't been used
    const tokens = await prisma.reusableToken.findMany({
      where: { id: { in: tokenIds } },
      select: { id: true, usedCount: true },
    });

    const deletable = tokens.filter(t => t.usedCount === 0).map(t => t.id);
    const skipped = tokens.filter(t => t.usedCount > 0).length;

    if (deletable.length > 0) {
      // Delete redemptions first (FK constraint)
      await prisma.reusableTokenRedemption.deleteMany({
        where: { tokenId: { in: deletable } },
      });
      await prisma.reusableToken.deleteMany({
        where: { id: { in: deletable } },
      });
    }

    return NextResponse.json({
      success: true,
      deleted: deletable.length,
      skipped,
      message: `${deletable.length} token(es) eliminado(s)${skipped > 0 ? `, ${skipped} omitido(s) por tener canjes` : ''}`,
    });
  } catch (error) {
    console.error('Error bulk deleting reusable tokens:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}
