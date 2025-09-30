import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildTitle } from '@/lib/seo/title';

export async function generateMetadata({ params }: { params: { tokenId: string } }) {
  return { title: buildTitle(['Canjear', params.tokenId.slice(0,10)]) };
}

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
