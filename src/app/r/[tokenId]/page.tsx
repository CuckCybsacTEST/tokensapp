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

  // 1. Flow especial de invitaciones de cumpleaños -> /b/<code>
  try {
    const invite = await prisma.inviteToken.findUnique({ where: { code: cleanId }, select: { id: true } });
    if (invite) {
      redirect(`/b/${cleanId}`);
    }
  } catch {}

  // 2. Intentar localizar un token regular de batches
  try {
    const token = await prisma.token.findUnique({ where: { id: cleanId }, select: { id: true } });
    if (token) {
      // Redirigimos directamente a la nueva UI de ruleta (marketing) manteniendo compatibilidad
      redirect(`/marketing/ruleta?tokenId=${encodeURIComponent(cleanId)}`);
    }
  } catch {}

  // 3. Si no es invite ni token válido, mostrar mensaje (manteniendo feedback del escaneo)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center text-white bg-black">
      <h1 className="text-2xl font-bold mb-2">Código inválido / desconocido</h1>
      <p className="opacity-80 max-w-md text-sm mb-4">
        No se encontró un token válido asociado a este código. Verifica que el QR pertenezca a la ruleta o a invitaciones de cumpleaños.
      </p>
      <p className="text-xs opacity-60 mb-6 font-mono break-all">ID: {cleanId}</p>
      <div className="flex gap-3 flex-wrap justify-center">
        <a href="/marketing/ruleta" className="rounded px-4 py-2 bg-violet-600 font-semibold text-sm">Abrir ruleta</a>
        <a href="/" className="rounded px-4 py-2 border border-white/20 font-semibold text-sm">Inicio</a>
      </div>
      <div className="mt-10 text-[10px] uppercase tracking-wider opacity-40">Escaneo sin coincidencias</div>
    </div>
  );
}
