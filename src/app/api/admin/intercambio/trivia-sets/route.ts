export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

/** GET — list all TriviaQuestionSets with question counts */
export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const sets = await prisma.exchangeTriviaSet.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { questions: true, sessions: true } },
      },
    });

    return NextResponse.json(sets);
  } catch (error: any) {
    console.error('[trivia-sets] GET error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}

/** POST — create a new TriviaQuestionSet */
export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return apiError('UNAUTHORIZED', 'UNAUTHORIZED', undefined, 401);
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return apiError('FORBIDDEN', 'FORBIDDEN', undefined, 403);

    const body = await req.json();
    const { name, description, active } = body;

    if (!name || name.trim().length === 0) {
      return apiError('BAD_REQUEST', 'El nombre es requerido', undefined, 400);
    }

    const set = await prisma.exchangeTriviaSet.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        active: active !== undefined ? active : true,
      },
      include: { _count: { select: { questions: true, sessions: true } } },
    });

    return NextResponse.json(set, { status: 201 });
  } catch (error: any) {
    console.error('[trivia-sets] POST error:', error);
    return apiError('INTERNAL_ERROR', 'Error interno', undefined, 500);
  }
}
