export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth';
import { invalidateSystemConfigCache } from '@/lib/config';

console.log("Marketing toggle route module loaded successfully!");

const MARKETING_FIELDS = [
  'marketingHeroEnabled',
  'marketingShowsEnabled',
  'marketingBirthdayEnabled',
  'marketingSpotifyEnabled',
  'marketingGalleryEnabled',
  'marketingFaqEnabled',
  'marketingBlogEnabled',
  'marketingMapEnabled',
  'marketingFooterEnabled',
  'marketingBackToTopEnabled',
  'marketingUpDownDotsEnabled',
  'marketingMobilePagerEnabled'
] as const;

type MarketingField = typeof MARKETING_FIELDS[number];

export async function POST(req: Request) {
  try {
    // Authenticate: accept admin_session with ADMIN or STAFF role
    const rawCookie = getSessionCookieFromRequest(req as any);
    const session = await verifySessionCookie(rawCookie);
    try {
      console.debug('marketing/toggle: session=', session ? { role: session.role, exp: session.exp } : null);
    } catch (e) {
      /* ignore logging errors */
    }

    // Require ADMIN or STAFF
    const adminAuth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!adminAuth.ok) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const actor = { kind: session!.role === 'ADMIN' ? 'admin' : 'staff' };

    const body = await req.json().catch(() => ({}));
    const { section, enabled } = body;

    if (!MARKETING_FIELDS.includes(section as MarketingField) || typeof enabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'bad_request', message: 'Invalid section or enabled value' }, { status: 400 });
    }

    const field = section as MarketingField;
    const now = new Date();

    // Leer configuración actual
    const prev = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);
    const exists = !!prev;

    // Invalidar cache antes
    try { invalidateSystemConfigCache(); } catch {}

    // Actualizar la configuración
    const updateData = { [field]: enabled };
    if (exists) {
      await prisma.systemConfig.update({ where: { id: 1 }, data: updateData });
    } else {
      await prisma.systemConfig.create({ data: { id: 1, ...updateData } });
    }

    // Invalidar cache post-write
    try { invalidateSystemConfigCache(); } catch {}

    // Leer la configuración actualizada
    const updated = await prisma.systemConfig.findUnique({ where: { id: 1 } }).catch(() => null);

    // Auditar el cambio
    try {
      const by = actor.kind;
      await audit('marketing.toggle', by, { section, from: prev?.[field], to: updated?.[field], enabled, actor });
    } catch (e) {
      console.error('audit helper failed', e);
    }

    return NextResponse.json({
      ok: true,
      [field]: Boolean(updated?.[field]),
      lastChangeIso: updated?.updatedAt ? new Date(updated.updatedAt as any).toISOString() : now.toISOString()
    });
  } catch (e: any) {
    console.error('marketing/toggle endpoint error', e);
    return NextResponse.json({ ok: false, error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}