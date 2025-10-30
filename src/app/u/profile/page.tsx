import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth-user';
import ProfileClient from '@/app/u/profile/ProfileClient';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 dark:text-slate-300">Acceso no autorizado</div>;
  }

  return <ProfileClient />;
}