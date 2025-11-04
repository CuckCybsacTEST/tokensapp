import { cookies } from 'next/headers';
import { verifySessionCookie } from '@/lib/auth';
import { UsersClient } from './UsersClient';
import ReactAdminUsers from './ReactAdminUsers';
import { AdminLayout } from "@/components/AdminLayout";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const raw = cookies().get('admin_session')?.value;
  const session = await verifySessionCookie(raw);
  const role = session?.role || 'ADMIN';

  // STAFF users get limited interface
  if (role === 'STAFF') {
    return (
      <AdminLayout>
        <div className="mx-auto p-6 max-w-[1600px]">
          <UsersClient role={role} />
        </div>
      </AdminLayout>
    );
  }

  // ADMIN users get full React Admin interface
  return <AdminLayout><ReactAdminUsers /></AdminLayout>;
}
