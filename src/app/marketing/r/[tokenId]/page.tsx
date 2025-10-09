import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function MarketingTokenRedirect({ params }: { params: { tokenId: string } }) {
  const tokenId = encodeURIComponent(params.tokenId || '');
  redirect(`/marketing/ruleta?tokenId=${tokenId}`);
}
