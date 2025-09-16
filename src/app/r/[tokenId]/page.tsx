import { redirect } from 'next/navigation';

// Sanitize possible copy/paste artifacts from CSV (e.g. 'https://domain/r/<id>' or 'm/r/<id>' or trailing commas)
function sanitizeTokenId(raw: string): string {
  // take last path segment if a URL fragment was pasted
  let t = raw.trim();
  if (t.includes("/")) t = t.split("/").pop() || t; // last segment
  // cut off any CSV residual commas
  if (t.includes(",")) t = t.split(",")[0];
  return t.trim();
}

/**
 * Esta página redirige a la nueva versión de la ruleta 
 * que utiliza el layout de marketing
 */
export default function TokenPage({ params }: { params: { tokenId: string } }) {
  const cleanId = sanitizeTokenId(params.tokenId);
  redirect(`/marketing/ruleta?tokenId=${cleanId}`);
}
