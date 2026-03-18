import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const raw = cookies().get('user_session')?.value;
    const session = await verifyUserSessionCookie(raw);
    if (!session) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const assignments = await prisma.commitmentAssignment.findMany({
      where: { userId: session.userId },
      include: {
        questionSet: {
          select: {
            id: true,
            name: true,
            regulationContent: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const items = assignments.map((a) => {
      // Strip HTML for preview
      const raw = a.questionSet.regulationContent || '';
      const text = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        id: a.id,
        title: a.questionSet.name,
        status: a.status,
        mandatory: (a as any).mandatory ?? true,
        assignedAt: a.assignedAt.toISOString(),
        completedAt: a.completedAt?.toISOString() || null,
        preview: text.length > 120 ? text.slice(0, 120) + '…' : text,
        content: a.questionSet.regulationContent,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error('[COMMITMENT_INBOX_ERROR]', error);
    return NextResponse.json({ ok: false, code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
