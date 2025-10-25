import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';

/*
  GET /api/admin/birthdays/debug-token/:code
  Admin only: returns debug info about a token
*/
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const raw = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(raw);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'Solo ADMIN', undefined, auth.error === 'UNAUTHORIZED' ? 401 : 403);

  try {
    const code = params.code;
    console.log('[DEBUG] Buscando token:', code);

    // Buscar token
    const token = await prisma.inviteToken.findUnique({
      where: { code },
      include: { reservation: { include: { pack: true } } }
    });

    if (!token) {
      // Buscar tokens similares para ayudar con debugging
      const similarTokens = await prisma.inviteToken.findMany({
        where: {
          code: { startsWith: code.substring(0, 3) }
        },
        take: 5,
        include: { reservation: { select: { celebrantName: true, date: true } } }
      });

      return apiOk({
        found: false,
        searchedCode: code,
        similarTokens: similarTokens.map(t => ({
          code: t.code,
          kind: t.kind,
          status: t.status,
          celebrantName: t.reservation?.celebrantName,
          date: t.reservation?.date
        })),
        totalTokens: await prisma.inviteToken.count()
      });
    }

    return apiOk({
      found: true,
      token: {
        id: token.id,
        code: token.code,
        kind: token.kind,
        status: token.status,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        maxUses: (token as any).maxUses,
        usedCount: (token as any).usedCount
      },
      reservation: token.reservation ? {
        id: token.reservation.id,
        celebrantName: token.reservation.celebrantName,
        date: token.reservation.date,
        status: token.reservation.status,
        packName: token.reservation.pack?.name
      } : null
    });

  } catch (e: any) {
    console.error('[DEBUG] Error:', e);
    return apiError('INTERNAL_ERROR', String(e?.message || e));
  }
}