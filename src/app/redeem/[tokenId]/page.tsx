import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { tokenId: string } }) {
  // Backward compatibility: old QR codes use /redeem/:id
  redirect(`/r/${params.tokenId}`);
}
