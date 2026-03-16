import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ReusableTokensLayout({ children }: { children: React.ReactNode }) {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);

  if (!session) {
    redirect('/u/login?next=/u/reusable-tokens');
  }

  // ADMIN and COORDINATOR always have access
  if (['ADMIN', 'COORDINATOR'].includes(session.role)) {
    return <>{children}</>;
  }

  // STAFF with area Animación or Multimedia also have access
  if (session.role === 'STAFF') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        include: { person: { select: { area: true } } },
      });
      const area = user?.person?.area;
      if (area === 'Animación' || area === 'Multimedia') {
        return <>{children}</>;
      }
    } catch {}
  }

  redirect('/u');
}
