import { NextRequest, NextResponse } from "next/server";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { isBirthdaysEnabledPublic } from "@/lib/featureFlags";

// ── Rutas de admin panel que STAFF puede acceder ─────────────────
const STAFF_ALLOWED_ADMIN_ROUTES = [
  '/admin/attendance',
  '/admin/tokens',
  '/admin/day-brief',
  '/admin/users',
  '/admin/reusable-tokens',
  '/admin/dj',
  '/admin/music-orders',
  '/admin/generadorinvitaciones',
];

// ── APIs de admin que STAFF puede acceder ────────────────────────
const STAFF_ALLOWED_ADMIN_APIS = [
  '/api/admin/attendance',
  '/api/admin/tokens',
  '/api/admin/day-brief',
  '/api/admin/users',
  '/api/admin/birthdays',
  '/api/admin/reusable-tokens',
  '/api/admin/reusable-prizes',
  '/api/admin/music-system',
  '/api/admin/invitations',
];

// ── Acceso por área: un COLLAB con cierta área puede acceder a rutas admin específicas ──
const AREA_ADMIN_ROUTES: Record<string, string[]> = {
  'DJs':        ['/admin/dj', '/admin/music-orders'],
  'Animación':  ['/admin/tokens', '/admin/reusable-tokens', '/admin/shows', '/admin/prizes', '/admin/static-batches', '/admin/statics'],
  'Multimedia': ['/admin/shows', '/admin/static-batches', '/admin/statics', '/admin/print'],
};

const AREA_ADMIN_APIS: Record<string, string[]> = {
  'DJs':        ['/api/admin/music-system'],
  'Animación':  ['/api/admin/tokens', '/api/admin/reusable-tokens', '/api/admin/reusable-prizes', '/api/admin/token-groups'],
  'Multimedia': ['/api/admin/reusable-tokens', '/api/admin/reusable-prizes', '/api/admin/token-groups'],
};

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(p => pathname.startsWith(p));
}

/** Verifica si el área del usuario le permite acceder a una ruta de admin */
function areaAllowsAdminRoute(area: string | undefined, pathname: string): boolean {
  if (!area) return false;
  const allowed = AREA_ADMIN_ROUTES[area];
  return !!allowed && matchesAny(pathname, allowed);
}

/** Verifica si el área del usuario le permite acceder a una API de admin */
function areaAllowsAdminAPI(area: string | undefined, pathname: string): boolean {
  if (!area) return false;
  const allowed = AREA_ADMIN_APIS[area];
  return !!allowed && matchesAny(pathname, allowed);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect root to marketing
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/marketing", req.url));
  }

  // Public routes - no authentication required
  const publicRoutes = [
    "/marketing",
    "/u/login",
    "/u/reset-password",
    "/u/register",
    "/api/user/auth/login",
    "/api/user/auth/reset-password",
    "/api/customer/auth/login",
    "/api/customer/auth/logout",
    "/api/customer/auth/me",
    "/api/customers",
  ];

  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get user session (unified authentication system)
  const userCookie = getUserSessionCookieFromRequest(req);
  const userSession = userCookie ? await verifyUserSessionCookie(userCookie) : null;

  const role = userSession?.role;
  const area = userSession?.area;

  // Helper for login redirect
  const redirectToLogin = () => {
    const loginUrl = new URL('/u/login', req.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  };

  // ── Collaborator area (/u/*) — requires any valid user session ──
  if (pathname.startsWith("/u/") || pathname === "/u") {
    if (!userSession) return redirectToLogin();
    return NextResponse.next();
  }

  // ── Admin panel (/admin/*) ─────────────────────────────────────
  if (pathname.startsWith("/admin/")) {
    if (!userSession) return redirectToLogin();

    // ADMIN y COORDINATOR: acceso completo al panel
    if (role === 'ADMIN' || role === 'COORDINATOR') return NextResponse.next();

    // STAFF: acceso limitado a rutas configuradas
    if (role === 'STAFF' && matchesAny(pathname, STAFF_ALLOWED_ADMIN_ROUTES)) return NextResponse.next();

    // COLLAB/STAFF: acceso por área funcional a rutas específicas
    if (areaAllowsAdminRoute(area, pathname)) return NextResponse.next();

    return redirectToLogin();
  }

  // ── Admin APIs (/api/admin/*) ──────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    if (!userSession) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // ADMIN y COORDINATOR: acceso completo a todas las APIs admin
    if (role === 'ADMIN' || role === 'COORDINATOR') return NextResponse.next();

    // STAFF: acceso limitado a APIs configuradas
    if (role === 'STAFF' && matchesAny(pathname, STAFF_ALLOWED_ADMIN_APIS)) return NextResponse.next();

    // Cualquier rol: acceso por área funcional a APIs específicas
    if (areaAllowsAdminAPI(area, pathname)) return NextResponse.next();

    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // ── System APIs (/api/system/*) — requires STAFF+ ──────────────
  if (pathname.startsWith("/api/system/")) {
    // Cron bypass for scheduled operations
    if (pathname === '/api/system/tokens/enable-scheduled' || pathname === '/api/system/tokens/toggle') {
      const cronSecret = req.headers.get('x-cron-secret') || '';
      if (cronSecret && cronSecret === (process.env.CRON_SECRET || '')) {
        return NextResponse.next();
      }
    }

    if (!userSession || !['ADMIN', 'COORDINATOR', 'STAFF'].includes(userSession.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // ── Scanner routes — requires any valid user session ───────────
  if (pathname.startsWith("/scanner")) {
    if (!userSession) return redirectToLogin();
    return NextResponse.next();
  }

  // ── Protected APIs — require any valid user session ────────────
  const protectedAPIs = [
    "/api/prizes",
    "/api/batch",
    "/api/batches",
    "/api/scanner",
    "/api/tickets",
  ];

  const publicBirthdayAPIs = [
    "/api/birthdays/packs",
    "/api/birthdays/slots",
    "/api/birthdays/reservations",
    "/api/birthdays/referrers/",
    "/api/birthdays/search",
    "/api/birthdays/invite/",
    "/api/birthdays/public/",
  ];

  const isProtectedAPI = protectedAPIs.some(api => pathname.startsWith(api));
  const isPublicBirthdayAPI = publicBirthdayAPIs.some(api => pathname.startsWith(api));

  if (isPublicBirthdayAPI && isBirthdaysEnabledPublic()) return NextResponse.next();
  if (pathname.startsWith("/api/birthdays") && !userSession) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (isProtectedAPI && !userSession) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.next();
}