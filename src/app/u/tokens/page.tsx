import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import { prisma } from '@/lib/prisma';
import { TokensToggle } from '@/app/admin/TokensToggle';

export const dynamic = 'force-dynamic';

async function ensureCajaStaff() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId }, include: { person: true } });
  if (!user?.person || user.person.area !== 'Caja') return null;
  return { session, user };
}

async function loadMetrics() {
  const now = new Date();
  const [totalTokens, totalRedeemed, totalExpired, config] = await Promise.all([
    prisma.token.count(),
    prisma.token.count({ where: { redeemedAt: { not: null } } }),
    prisma.token.count({ where: { expiresAt: { lt: now } } }),
    prisma.systemConfig.findUnique({ where: { id: 1 } }),
  ]);
  const activeTokens = totalTokens - totalRedeemed - totalExpired;
  return {
    total: totalTokens,
    redeemed: totalRedeemed,
    expired: totalExpired,
    active: activeTokens < 0 ? 0 : activeTokens,
    tokensEnabled: config?.tokensEnabled ?? false,
  };
}

export default async function TokensCajaPage() {
  const me = await ensureCajaStaff();
  if (!me) redirect('/u');
  const metrics = await loadMetrics();
  const tz = process.env.TOKENS_TIMEZONE || 'America/Lima';
  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
        <div className="flex items-center mb-5 justify-between">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-2.924-1.756 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">Control de Tokens</h2>
          </div>
          <div className="text-xs opacity-70">Zona horaria: {tz}</div>
        </div>
        <TokensToggle initialEnabled={metrics.tokensEnabled} loginPath="/u/login" />
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Métricas rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600">
            <div className="text-xs text-slate-500">Total Tokens</div>
            <div className="text-2xl font-bold">{metrics.total.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600">
            <div className="text-xs text-slate-500">Canjeados</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.redeemed.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600">
            <div className="text-xs text-slate-500">Expirados</div>
            <div className="text-2xl font-bold text-amber-600">{metrics.expired.toLocaleString()}</div>
          </div>
          <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600">
            <div className="text-xs text-slate-500">Activos</div>
            <div className="text-2xl font-bold">{metrics.active.toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
