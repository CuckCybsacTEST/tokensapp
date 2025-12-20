import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { deleteFromSupabase, safeDeleteFile } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const cookie = getSessionCookieFromRequest(req as unknown as Request);
  const session = await verifySessionCookie(cookie);
  const authz = requireRole(session, ['ADMIN','STAFF']);
  if (!authz.ok) return apiError(authz.error!, undefined, undefined, authz.error === 'UNAUTHORIZED'?401:403);
  try {
    const body = await req.json().catch(()=>({}));
    const ids: string[] = Array.isArray(body?.reservationIds) ? body.reservationIds.filter((x:any)=>typeof x==='string') : [];
    if (!ids.length) return apiError('INVALID_BODY','reservationIds required');
    console.log('[PURGE] Recibidos reservationIds:', ids);
    // Obtener tokens y cards
    const tokens = await prisma.inviteToken.findMany({ where: { reservationId: { in: ids } }, select: { id:true, reservationId:true } });
    const tokenIds = tokens.map(t=>t.id);
    console.log('[PURGE] Tokens encontrados:', tokens);
    // Obtener cards con storage keys
    const cards = await prisma.$queryRawUnsafe<Array<{ storageKey?: string; filePath?: string }>>(
      `SELECT "storageKey", "filePath" FROM "InviteTokenCard" WHERE "inviteTokenId" IN (${tokenIds.map((_,i)=>'$'+(i+1)).join(',')})`,
      ...tokenIds
    ).catch(() => []);

    // Eliminar archivos de Supabase
    for (const card of cards) {
      if (card.storageKey) {
        await deleteFromSupabase(card.storageKey);
        console.log(`[PURGE] Archivo eliminado de Supabase: ${card.storageKey}`);
      }
    }

    // Eliminar archivos locales (compatibilidad)
    let filesRemoved = 0;
    for (const rid of [...new Set(tokens.map(t=>t.reservationId))]) {
      const dir = path.resolve(process.cwd(),'public','birthday-cards', rid);
      // intentamos borrar host.png y guest.png si existen
      for (const name of ['host.png','guest.png']) {
        const f = path.join(dir, name);
        try {
          await safeDeleteFile(f);
          filesRemoved++;
          console.log(`[PURGE] Archivo local eliminado: ${f}`);
        } catch {
          console.log(`[PURGE] Archivo local no encontrado: ${f}`);
        }
      }
      // si la carpeta queda vacía intentamos eliminarla (best-effort)
      try {
        const rest = await fs.promises.readdir(dir);
        if (!rest.length) {
          await fs.promises.rmdir(dir);
          console.log(`[PURGE] Carpeta eliminada: ${dir}`);
        }
      } catch {
        console.log(`[PURGE] Carpeta no eliminada o no vacía: ${dir}`);
      }
    }
    // Borrar registros InviteTokenCard
    if (tokenIds.length) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "InviteTokenCard" WHERE "inviteTokenId" IN (${tokenIds.map((_,i)=>'$'+(i+1)).join(',')})`, ...tokenIds);
        console.log('[PURGE] Registros InviteTokenCard eliminados:', tokenIds);
      } catch(e) { console.log('[PURGE] Error al eliminar InviteTokenCard:', e); }
      try {
        await prisma.tokenRedemption.deleteMany({ where: { tokenId: { in: tokenIds } } });
        console.log('[PURGE] TokenRedemptions eliminados para tokens:', tokenIds);
      } catch(e) { console.log('[PURGE] Error al eliminar TokenRedemption por tokenId:', e); }
      try {
        await prisma.inviteToken.deleteMany({ where: { id: { in: tokenIds } } });
        console.log('[PURGE] Tokens eliminados:', tokenIds);
      } catch(e) { console.log('[PURGE] Error al eliminar InviteToken:', e); }
    }
    // Borrar registros relacionados con las reservas antes de eliminar las reservas
    if (ids.length) {
      try {
        await prisma.courtesyItem.deleteMany({ where: { reservationId: { in: ids } } });
        console.log('[PURGE] CourtesyItems eliminados para reservas:', ids);
      } catch(e) { console.log('[PURGE] Error al eliminar CourtesyItem:', e); }
      try {
        await prisma.photoDeliverable.deleteMany({ where: { reservationId: { in: ids } } });
        console.log('[PURGE] PhotoDeliverables eliminados para reservas:', ids);
      } catch(e) { console.log('[PURGE] Error al eliminar PhotoDeliverable:', e); }
      try {
        await prisma.tokenRedemption.deleteMany({ where: { reservationId: { in: ids } } });
        console.log('[PURGE] TokenRedemptions eliminados para reservas:', ids);
      } catch(e) { console.log('[PURGE] Error al eliminar TokenRedemption:', e); }
    }
    // Borrar reservas
    if (ids.length) {
      try {
        await prisma.birthdayReservation.deleteMany({ where: { id: { in: ids } } });
        console.log('[PURGE] Reservas eliminadas:', ids);
      } catch(e) { console.log('[PURGE] Error al eliminar birthdayReservation:', e); }
    }
    return apiOk({ ok:true, purgedReservations: ids.length, filesRemoved });
  } catch(e:any) {
    return apiError('INTERNAL_ERROR','No se pudo purgar',{ raw: String(e?.message||e) });
  }
}
