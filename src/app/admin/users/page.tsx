import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/auth';
import { UsersClient } from './UsersClient';
import FullAdminUsers from './FullAdminUsers';

export default async function AdminUsersPage() {
  const raw = cookies().get('admin_session')?.value;
  const session = await verifySessionCookie(raw);
  const role = session?.role || 'ADMIN';
  if (role === 'STAFF') {
    return (
      <div className="mx-auto p-6 max-w-[1600px]">
        <UsersClient role={role} />
      </div>
    );
  }
  return (
    <div className="mx-auto p-6 max-w-[1600px]">
      <FullAdminUsers />
    </div>
  );
}
