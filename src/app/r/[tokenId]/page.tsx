import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

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
  // Si es un token de cumpleaños sigue redirigiendo a /b (flujo correcto)
  try {
    const invite = await prisma.inviteToken.findUnique({ where: { code: cleanId }, select: { id: true } });
    if (invite) {
      redirect(`/b/${cleanId}`);
    }
  } catch {}
  // NO redirige jamás a la ruleta. Mostramos una página informativa.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center text-white bg-black">
      <h1 className="text-2xl font-bold mb-2">Código escaneado</h1>
      <p className="opacity-80 max-w-md text-sm mb-4">
        Este código no pertenece al módulo de Invitaciones de Cumpleaños. Ya no hacemos redirección automática a la ruleta.
        Si necesitas usar la ruleta abre directamente la página oficial de la ruleta desde el menú principal.
      </p>
      <p className="text-xs opacity-60 mb-6 font-mono break-all">ID: {cleanId}</p>
      <div className="flex gap-3 flex-wrap justify-center">
        <a href="/marketing" className="rounded px-4 py-2 bg-violet-600 font-semibold text-sm">Ir a Marketing</a>
        <a href="/" className="rounded px-4 py-2 border border-white/20 font-semibold text-sm">Inicio</a>
      </div>
      <div className="mt-10 text-[10px] uppercase tracking-wider opacity-40">Escaneo estático · Sin redirección a ruleta</div>
    </div>
  );
}
