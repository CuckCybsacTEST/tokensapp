import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildTitle } from '@/lib/seo/title';

export async function generateMetadata({ params }: { params: { tokenId: string } }) {
  return { title: buildTitle(['Token', params.tokenId.slice(0,10)]) };
}

// Aseguramos ejecución siempre en runtime Node y sin caché para evitar falsos negativos en lookups
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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
export default async function TokenPage({ params }: { params: { tokenId: string } }) {
  const cleanId = sanitizeTokenId(params.tokenId);
  // Si es invitación de cumpleaños -> /b/<code>
  try {
    const invite = await prisma.inviteToken.findUnique({ where: { code: cleanId }, select: { id: true } });
    if (invite) redirect(`/b/${cleanId}`);
  } catch (e: any) {
    if ((e as any)?.digest === 'NEXT_REDIRECT') throw e;
    // Si hubo error igual seguimos al redirect genérico
  }
  // Redirigir SIEMPRE a la ruleta con el token (no validar aquí para evitar cachés inconsistentes)
  redirect(`/marketing/ruleta?tokenId=${encodeURIComponent(cleanId)}`);
}
 
