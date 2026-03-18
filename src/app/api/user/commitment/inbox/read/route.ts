import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Mark a non-mandatory comunicado as read from the Novedades inbox.
 * Only works for non-mandatory PENDING assignments owned by the user.
 */
export async function POST(req: Request) {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { assignmentId } = body;

    if (!assignmentId || typeof assignmentId !== 'string') {
      return NextResponse.json({ ok: false, code: 'MISSING_ID' }, { status: 400 });
    }

    // Only allow marking non-mandatory, pending assignments owned by this user
    const assignment = await prisma.commitmentAssignment.findFirst({
      where: {
        id: assignmentId,
        userId: session.userId,
        status: 'PENDING',
        mandatory: false,
      },
    });

    if (!assignment) {
      return NextResponse.json({ ok: false, code: 'NOT_FOUND_OR_MANDATORY' }, { status: 404 });
    }

    await prisma.commitmentAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[COMMITMENT_INBOX_READ_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
