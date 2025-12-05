'use client';

import { useRouter } from 'next/navigation';

export function RedeemButton({ tokenId }: { tokenId: string }) {
  const router = useRouter();

  const handleRedeem = () => {
    router.push(`?redeem=true`);
  };

  return (
    <button
      onClick={handleRedeem}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
    >
      Canjear Premio
    </button>
  );
}