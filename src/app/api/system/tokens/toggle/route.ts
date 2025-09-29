export const runtime = 'nodejs';
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
  // Authenticate: accept either admin_session (ADMIN or STAFF) or user_session (STAFF)
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
    let actor: { kind: 'admin' | 'staff' | 'unknown'; userId?: string } = { kind: 'unknown' };

    // Path A: Admin session with ADMIN or STAFF role (both can toggle now)
    const adminAuth = requireRole(session, ['ADMIN','STAFF']);
    if (adminAuth.ok && (session?.role === 'ADMIN' || session?.role === 'STAFF')) {
      allowed = true;
      actor = { kind: session.role === 'ADMIN' ? 'admin' : 'staff' };
    }

    // Path B: Standalone user_session with STAFF role
    if (!allowed) {
      const userRaw = getUserCookie(req as any);
      const userSession = await verifyUserSessionCookie(userRaw);
      if (userSession?.role === 'STAFF') {
        allowed = true;
        actor = { kind: 'staff', userId: userSession.userId };
      }
    }

    if (!allowed) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'enabled must be boolean' }, { status: 400 });
    }

    const enabled = Boolean(body.enabled);
    const now = new Date();

    // Leer configuración actual
  const prev = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);
  const exists = !!prev;

  // Invalidar cache antes de leer/modificar para minimizar race con lectores concurrentes
  try { invalidateSystemConfigCache(); } catch {}

  // Actualizar la configuración
    if (exists) {
      await prisma.systemConfig.update({ where: { id: 1 }, data: { tokensEnabled: enabled } });
    } else {
      await prisma.systemConfig.create({ data: { id: 1, tokensEnabled: enabled } });
    }

  // Invalidar la caché (post-write) para que posteriores lecturas reflejen el nuevo estado
  try { invalidateSystemConfigCache(); } catch {}
    
    // Leer la configuración actualizada
  const updated = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);

    // Auditar el cambio (actor ADMIN o STAFF)
    try {
      const by = actor.kind === 'admin' ? 'admin' : (actor.kind === 'staff' ? 'staff' : 'unknown');
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
