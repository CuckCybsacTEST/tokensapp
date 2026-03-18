import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie, requireRole } from '@/lib/auth';
import { CURRENT_REGULATION } from '@/lib/regulations/constants';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const raw = getUserSessionCookieFromRequest(req);
  const session = await verifyUserSessionCookie(raw);
  const check = requireRole(session, ['ADMIN']);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: 403 });
  }

  const requiredVersion = CURRENT_REGULATION.version;

  const users = await prisma.user.findMany({
    where: {
      role: { not: 'ADMIN' },
      person: { active: true },
    },
    select: {
      id: true,
      username: true,
      commitmentVersionAccepted: true,
      commitmentAcceptedAt: true,
      person: {
        select: {
          name: true,
          dni: true,
          area: true,
          jobTitle: true,
        },
      },
    },
    orderBy: { person: { name: 'asc' } },
  });

  const items = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.person?.name ?? u.username,
    dni: u.person?.dni ?? null,
    area: u.person?.area ?? null,
    jobTitle: u.person?.jobTitle ?? null,
    versionAccepted: u.commitmentVersionAccepted,
    acceptedAt: u.commitmentAcceptedAt?.toISOString() ?? null,
    accepted: u.commitmentVersionAccepted >= requiredVersion,
  }));

  const accepted = items.filter((i) => i.accepted).length;
  const pending = items.filter((i) => !i.accepted).length;

  return NextResponse.json({
    ok: true,
    requiredVersion,
    stats: { total: items.length, accepted, pending },
    items,
  });
}
