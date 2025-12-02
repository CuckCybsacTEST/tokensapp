import { cookies } from 'next/headers';
import { verifyUserSessionCookie } from '@/lib/auth';
import { UsersClient } from './UsersClient';
import UsersWithTabs from './UsersWithTabs';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);
  const role = session?.role || 'GUEST';

  // STAFF users get limited interface
  if (role === 'STAFF') {
    return (
      <div className="mx-auto p-6 max-w-[1600px]">
        <UsersClient role={role} />
      </div>
    );
  }

  // ADMIN users get tabbed interface
  return <UsersWithTabs />;
}
