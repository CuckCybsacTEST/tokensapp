import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import SorteosQrClient from './SorteosQrClient';

export const dynamic = 'force-dynamic';

async function ensureStaff() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { person: true } });
  if (!user?.person) return null;
  return { session, user };
}

export default async function SorteosQrStaffPage() {
  const me = await ensureStaff();
  if (!me) redirect('/u');

  return <SorteosQrClient />;
}