import { apiOk, apiError } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const rawCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(rawCookie);
    if (!session || !session.role) {
      return apiOk({ isStaff: false, isAdmin: false });
    }
    return apiOk({
      isStaff: session.role === 'STAFF' || session.role === 'ADMIN',
      isAdmin: session.role === 'ADMIN',
      role: session.role
    });
  } catch (err) {
    return apiError('SESSION_ERROR', 'No se pudo obtener la sesión');
  }
}
