import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENT_REGULATION } from '@/lib/regulations/constants';
import RegulationsClient from './RegulationsClient';

export const metadata = { title: 'Reglamento Interno' };
export const dynamic = 'force-dynamic';

export default async function RegulationsPage() {
  const raw = cookies().get('user_session')?.value;
  const session = await verifyUserSessionCookie(raw);

  if (!session) redirect('/u/login');
  if (session.role !== 'ADMIN') redirect('/u');

  const regulationSet = await prisma.triviaQuestionSet.findUnique({
    where: { id: 'cmkcqtdtl0001hfh8nvysntxz' },
    select: {
      id: true,
      name: true,
      regulationContent: true,
      createdAt: true,
    },
  });

  const regulationHtml = regulationSet?.regulationContent ?? '';
  const regulationName = regulationSet?.name ?? 'Reglamento Interno';
  const regulationDate = regulationSet?.createdAt
    ? regulationSet.createdAt.toLocaleDateString('es-ES')
    : '';

  return (
    <RegulationsClient
      regulationName={regulationName}
      regulationDate={regulationDate}
      regulationHtml={regulationHtml}
      requiredVersion={CURRENT_REGULATION.version}
    />
  );
}