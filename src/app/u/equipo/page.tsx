import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import EquipoAdminClient from './EquipoAdminClient';

export const dynamic = 'force-dynamic';

export default async function EquipoPage() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);

  if (!session || !['ADMIN', 'COORDINATOR'].includes(session.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">Acceso restringido</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Solo coordinadores y administradores pueden acceder a esta sección.</p>
          <a href="/u" className="mt-4 inline-block text-sky-500 hover:underline text-sm">← Volver al panel</a>
        </div>
      </div>
    );
  }

  return <EquipoAdminClient />;
}
