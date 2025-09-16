/**
 * Utility to redirect from the old roulette endpoint to the new marketing layout
 * For seamless user experience with existing QR codes and links
 */
import { redirect } from 'next/navigation';

export function redirectToMarketingRoulette(tokenId: string): void {
  redirect(`/marketing/ruleta?tokenId=${tokenId}`);
}
