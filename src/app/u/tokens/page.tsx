import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';
import { TokensToggle } from '@/app/admin/TokensToggle';
import TokensClientWrapper from './tokensClientWrapper';

export const dynamic = 'force-dynamic';

async function ensureStaff() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { person: true } });
  if (!user?.person) return null;
  return { session, user };
}

async function loadToggle() {
  const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
  return { tokensEnabled: config?.tokensEnabled ?? false };
}

export default async function TokensStaffPage() {
  const me = await ensureStaff();
  if (!me) redirect('/u');
  const toggle = await loadToggle();
  const tz = process.env.TOKENS_TIMEZONE || 'America/Lima'; // mantenemos si se requiere en futuro, pero ocultamos en UI para evitar repetición
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Control de Tokens</h2>
        </div>
        <TokensToggle initialEnabled={toggle.tokensEnabled} loginPath="/u/login" />
      </div>
      <TokensClientWrapper />
    </div>
  );
}
