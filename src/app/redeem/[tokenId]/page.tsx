import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function Page({ params }: { params: { tokenId: string } }) {
  const code = params.tokenId;
  try {
    const invite = await prisma.inviteToken.findUnique({ where: { code }, select: { id: true } });
    if (invite) {
      redirect(`/b/${code}`);
      return null as any;
    }
  } catch {}
  redirect(`/r/${code}`);
}
