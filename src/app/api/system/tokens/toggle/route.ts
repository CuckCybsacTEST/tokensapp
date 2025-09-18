import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { invalidateSystemConfigCache } from '@/lib/config';
import { computeTokensEnabled } from '@/lib/tokensMode';
const TOKENS_TZ = process.env.TOKENS_TIMEZONE || 'America/Lima';

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

  // Invalidar cache antes de leer/modificar para minimizar race con lectores concurrentes
  try { invalidateSystemConfigCache(); } catch {}

  // Actualizar la configuración
    if (exists) {
      await prisma.$executeRawUnsafe(`UPDATE SystemConfig SET tokensEnabled = ${enabled ? 1 : 0}, updatedAt = CURRENT_TIMESTAMP WHERE id = 1`);
    } else {
      await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id, tokensEnabled, updatedAt) VALUES (1, ${enabled ? 1 : 0}, CURRENT_TIMESTAMP)`);
    }

  // Invalidar la caché (post-write) para que posteriores lecturas reflejen el nuevo estado
  try { invalidateSystemConfigCache(); } catch {}
    
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

    // Calcular programación según TZ Lima
  const computed = computeTokensEnabled({ now, tz: TOKENS_TZ });
  const nextSchedule = computed.nextToggleIso || now.toISOString();
  const scheduledEnabled = computed.enabled;

    return NextResponse.json({ 
      ok: true, 
      tokensEnabled: Boolean(updated?.tokensEnabled),
      serverTimeIso: now.toISOString(),
      nextSchedule,
      scheduledEnabled,
      policy: 'boundary-enforcement-18:00-on-00:00-off',
      lastChangeIso: updated?.updatedAt ? new Date(updated.updatedAt as any).toISOString() : now.toISOString()
    });
  } catch (e: any) {
    console.error('tokens/toggle endpoint error', e);
    return NextResponse.json({ ok: false, error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}
