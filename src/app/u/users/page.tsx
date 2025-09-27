import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import UsersRegisterClient from '@/app/u/users/UsersRegisterClient';

export const dynamic = 'force-dynamic';

export default async function UsersRegisterCollabPage() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">Acceso restringido</div>;
  }
  return <UsersRegisterClient />;
}
