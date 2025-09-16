import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { invalidateSystemConfigCache } from '@/lib/config';

console.log("Toggle route module loaded successfully!");

export async function POST(req: Request) {
  try {
    // Authenticate and require ADMIN role
    const rawCookie = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(rawCookie);
    try {
      console.debug('tokens/toggle: rawCookieLength=', rawCookie ? rawCookie.length : 0);
      console.debug('tokens/toggle: session=', session ? { role: session.role, exp: session.exp } : null);
    } catch (e) {
      /* ignore logging errors */
    }
    const auth = requireRole(session, ['ADMIN']);
    if (!auth.ok) {
      const status = auth.error === 'UNAUTHORIZED' ? 401 : 403;
      const err = auth.error === 'UNAUTHORIZED' ? 'unauthorized' : 'forbidden';
      return NextResponse.json({ ok: false, error: err, message: 'Not authorized' }, { status });
    }

    const body = await req.json().catch(() => ({}));
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'enabled must be boolean' }, { status: 400 });
    }

    const enabled = Boolean(body.enabled);
    const now = new Date();

    // Leer configuración actual
    const rows: any[] = await prisma.$queryRawUnsafe(`SELECT id, tokensEnabled FROM SystemConfig WHERE id = 1 LIMIT 1`);
    const prev = rows && rows.length ? rows[0] : null;
    const exists = !!prev;

    // Actualizar la configuración
    if (exists) {
      await prisma.$executeRawUnsafe(`UPDATE SystemConfig SET tokensEnabled = ${enabled ? 1 : 0}, updatedAt = CURRENT_TIMESTAMP WHERE id = 1`);
    } else {
      await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id, tokensEnabled, updatedAt) VALUES (1, ${enabled ? 1 : 0}, CURRENT_TIMESTAMP)`);
    }

    // Invalidar la caché
    invalidateSystemConfigCache();
    
    // Leer la configuración actualizada
    const updatedRows: any[] = await prisma.$queryRawUnsafe(`SELECT id, tokensEnabled, updatedAt FROM SystemConfig WHERE id = 1 LIMIT 1`);
    const updated = updatedRows[0] || null;

    // Auditar el cambio
    try {
      const by = 'staff';
      const from = prev || null;
      const to = updated || null;
      await audit('tokens.toggle', by, { from, to, enabled });
    } catch (e) {
      console.error('audit helper failed', e);
    }

  // Calcular tiempos de activación/desactivación para informar al cliente
    const activationDate = new Date(now);
    const deactivationDate = new Date(now);
    
    // Configurar horas para activación (18:00) y desactivación (00:00 del siguiente día)
    activationDate.setHours(18, 0, 0, 0);
    deactivationDate.setHours(0, 0, 0, 0);
    deactivationDate.setDate(deactivationDate.getDate() + 1); // Siguiente día
    
    // Si la hora actual ya pasó las 18:00 y son menos de las 00:00, la próxima activación es mañana
    if (now.getHours() >= 18) {
      activationDate.setDate(activationDate.getDate() + 1);
    }
    
    // Próxima programación según el estado
    const nextSchedule = enabled ? deactivationDate.toISOString() : activationDate.toISOString();

    return NextResponse.json({ 
      ok: true, 
      tokensEnabled: Boolean(updated?.tokensEnabled),
      serverTimeIso: now.toISOString(),
      nextSchedule: nextSchedule
    });
  } catch (e: any) {
    console.error('tokens/toggle endpoint error', e);
    return NextResponse.json({ ok: false, error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}
