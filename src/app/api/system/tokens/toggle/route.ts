import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth-user';
import { invalidateSystemConfigCache } from '@/lib/config';
import { computeTokensEnabled } from '@/lib/tokensMode';
const TOKENS_TZ = process.env.TOKENS_TIMEZONE || 'America/Lima';

console.log("Toggle route module loaded successfully!");

export async function POST(req: Request) {
  try {
    // Authenticate: accept either admin_session (ADMIN) or user_session (STAFF Caja)
    const rawCookie = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(rawCookie);
    try {
      console.debug('tokens/toggle: rawCookieLength=', rawCookie ? rawCookie.length : 0);
      console.debug('tokens/toggle: session=', session ? { role: session.role, exp: session.exp } : null);
    } catch (e) {
      /* ignore logging errors */
    }
    // Determine permission
    let allowed = false;
    let actor: { kind: 'admin' | 'staff-caja' | 'unknown'; userId?: string } = { kind: 'unknown' };

    // Path A: Admin session with ADMIN role
    const adminAuth = requireRole(session, ['ADMIN']);
    if (adminAuth.ok && session?.role === 'ADMIN') {
      allowed = true;
      actor = { kind: 'admin' };
    }

    // Path B: BYOD user session with STAFF in Caja (no admin session required)
    if (!allowed) {
      const userRaw = getUserCookie(req as any);
      const userSession = await verifyUserSessionCookie(userRaw);
      if (userSession?.role === 'STAFF') {
        try {
          const u = await prisma.user.findUnique({ where: { id: userSession.userId }, include: { person: true } });
          if (u?.person?.area === 'Caja') {
            allowed = true;
            actor = { kind: 'staff-caja', userId: u.id };
          }
        } catch {}
      }
    }
    if (!allowed) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
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

    // Auditar el cambio (actor ADMIN o STAFF Caja)
    try {
      const by = actor.kind === 'admin' ? 'admin' : (actor.kind === 'staff-caja' ? 'staff:caja' : 'unknown');
      const from = prev || null;
      const to = updated || null;
      await audit('tokens.toggle', by, { from, to, enabled, actor });
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
