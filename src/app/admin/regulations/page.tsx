import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth';
import { CURRENT_REGULATION } from '@/lib/regulations/constants';
import RegulationsClient from './RegulationsClient';

export const metadata = { title: 'Reglamento Interno' };
export const dynamic = 'force-dynamic';

export default async function RegulationsPage() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);

  if (!session) redirect('/u/login');
  if (session.role !== 'ADMIN') redirect('/u');

  return (
    <RegulationsClient
      regulationName={CURRENT_REGULATION.title}
      regulationParagraphs={CURRENT_REGULATION.content}
      requiredVersion={CURRENT_REGULATION.version}
    />
  );
}