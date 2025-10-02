import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN','STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED'?401:403);
  try {
    const body = await req.json().catch(()=>({}));
    const ids: string[] = Array.isArray(body?.reservationIds) ? body.reservationIds.filter((x:any)=>typeof x==='string') : [];
    if (!ids.length) return apiError('INVALID_BODY','reservationIds required');
    // Obtener tokens y cards
    const tokens = await prisma.inviteToken.findMany({ where: { reservationId: { in: ids } }, select: { id:true, reservationId:true } });
    const tokenIds = tokens.map(t=>t.id);
    // Eliminar archivos host/guest por reserva
    let filesRemoved = 0;
    for (const rid of [...new Set(tokens.map(t=>t.reservationId))]) {
      const dir = path.resolve(process.cwd(),'public','birthday-cards', rid);
      // intentamos borrar host.png y guest.png si existen
      for (const name of ['host.png','guest.png']) {
        const f = path.join(dir, name);
        try { await fs.promises.unlink(f); filesRemoved++; } catch {}
      }
      // si la carpeta queda vacía intentamos eliminarla (best-effort)
      try { const rest = await fs.promises.readdir(dir); if (!rest.length) await fs.promises.rmdir(dir); } catch {}
    }
    // Borrar registros InviteTokenCard mediante raw si delegate no existe
    if (tokenIds.length) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "InviteTokenCard" WHERE "inviteTokenId" IN (${tokenIds.map((_,i)=>'$'+(i+1)).join(',')})`, ...tokenIds);
      } catch {}
    }
    return apiOk({ ok:true, purgedReservations: ids.length, filesRemoved });
  } catch(e:any) {
    return apiError('INTERNAL_ERROR','No se pudo purgar',{ raw: String(e?.message||e) });
  }
}
