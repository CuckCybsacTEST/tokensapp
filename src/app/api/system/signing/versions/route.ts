import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError, apiOk } from '@/lib/apiError';
import { CURRENT_SIGNATURE_VERSION, SECRET_MAP } from '@/lib/signing';

// List loaded signing secret versions for diagnostic purposes (ADMIN only)
// GET /api/system/signing/versions
export async function GET(req: Request) {
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const auth = requireRole(session, ['ADMIN']);
  if (!auth.ok) return apiError(auth.error || 'UNAUTHORIZED', 'Acceso restringido', undefined, auth.error === 'FORBIDDEN' ? 403 : 401);

  const loaded = Object.keys(SECRET_MAP).map(v => Number(v)).sort((a,b)=>a-b);
  const active = CURRENT_SIGNATURE_VERSION;
  const missingActive = !loaded.includes(active);

  return apiOk({
    activeVersion: active,
    loadedVersions: loaded,
    missingActive,
    rotationReady: loaded.length > 1,
  });
}
