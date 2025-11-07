export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { invalidateSystemConfigCache } from '@/lib/config';
import { computeTokensEnabled } from '@/lib/tokensMode';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest as getUserCookie, verifyUserSessionCookie } from '@/lib/auth';
import { apiError } from '@/lib/apiError';
// Prefer Lima timezone by default; allow override via env
const TOKENS_TZ = process.env.TOKENS_TIMEZONE || 'America/Lima';

// Evitar cualquier cacheo de esta ruta (Next.js App Router)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // AuthZ: ADMIN or STAFF only (defense-in-depth; middleware already enforces this)
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN', 'STAFF']);
    if (!ok.ok) {
      // Permitir STAFF con solo user_session (cualquier área ahora) a leer el status
      const uRaw = getUserCookie(req as any);
      const uSession = await verifyUserSessionCookie(uRaw);
      if (!(uSession && uSession.role === 'STAFF')) {
        const status = ok.error === 'UNAUTHORIZED' ? 401 : 403;
        return apiError(ok.error || 'FORBIDDEN', ok.error || 'FORBIDDEN', undefined, status);
      }
    }

    // Invalidar la caché para obtener los datos más recientes
    invalidateSystemConfigCache();
    
  // Columns tokensAdminDisabled / tokensTestMode were removed; use Prisma Client for portability
  const cfg = await prisma.systemConfig.findUnique({ where: { id: 1 } })
    .catch(() => null as any) || { tokensEnabled: false } as any;

    const now = new Date();
    const computed = computeTokensEnabled({ now, tz: TOKENS_TZ });
    const scheduledEnabled = computed.enabled;

    // Calcular tiempos con el valor ya calculado por computeTokensEnabled (heurístico)
    const activationTime = computed.nextToggleIso || now.toISOString();
    const deactivationTime = computed.nextToggleIso || now.toISOString();

    const res = NextResponse.json({
      ok: true,
      tokensEnabled: Boolean(cfg.tokensEnabled),
      scheduledEnabled,
      serverTimeIso: now.toISOString(),
      timezone: TOKENS_TZ,
      nextSchedule: computed.nextToggleIso || now.toISOString(),
      activationTime: String(activationTime),
      deactivationTime: String(deactivationTime),
      systemTime: now.toISOString(),
      lastChangeIso: cfg?.updatedAt ? new Date(cfg.updatedAt as any).toISOString() : null
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (e: any) {
    console.error('status endpoint error', e);
  return apiError('INTERNAL_ERROR', 'Error interno', { message: String(e?.message || e) }, 500);
  }
}
