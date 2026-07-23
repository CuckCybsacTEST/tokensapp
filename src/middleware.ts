import { NextRequest, NextResponse } from "next/server";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { isBirthdaysEnabledPublic } from "@/lib/featureFlags";

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
  '/api/admin/daily-evaluation',
  '/api/admin/producciones',
];

const COLLAB_ALLOWED_ADMIN_APIS = [
  '/api/admin/birthdays',
];

const AREA_ADMIN_ROUTES: Record<string, string[]> = {
  'DJs': ['/admin/dj', '/admin/music-orders'],
  'Animación': ['/admin/tokens', '/admin/reusable-tokens', '/admin/shows', '/admin/prizes', '/admin/static-batches', '/admin/statics'],
  'Multimedia': ['/admin/shows', '/admin/static-batches', '/admin/statics', '/admin/print'],
};

const AREA_ADMIN_APIS: Record<string, string[]> = {
  'DJs': ['/api/admin/music-system'],
  'Animación': ['/api/admin/tokens', '/api/admin/reusable-tokens', '/api/admin/reusable-prizes', '/api/admin/token-groups'],
  'Multimedia': ['/api/admin/reusable-tokens', '/api/admin/reusable-prizes', '/api/admin/token-groups', '/api/admin/producciones'],
};

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p));
}

function areaAllowsAdminRoute(area: string | undefined, pathname: string): boolean {
  if (!area) return false;
  const allowed = AREA_ADMIN_ROUTES[area];
  return !!allowed && matchesAny(pathname, allowed);
}

function areaAllowsAdminAPI(area: string | undefined, pathname: string): boolean {
  if (!area) return false;
  const allowed = AREA_ADMIN_APIS[area];
  return !!allowed && matchesAny(pathname, allowed);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/marketing", req.url));
  }

  if (pathname === "/marketing") {
    return NextResponse.redirect(new URL("/", req.url), 301);
  }

  const publicRoutes = [
    "/marketing/",
    "/reservatucumple",
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

  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const userCookie = getUserSessionCookieFromRequest(req);
  const userSession = userCookie ? await verifyUserSessionCookie(userCookie) : null;

  const role = userSession?.role;
  const area = userSession?.area;

  const redirectToLogin = () => {
    const loginUrl = new URL('/u/login', req.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (pathname.startsWith('/api/admin/custom-qrs/') && pathname.endsWith('/redeem')) {
    if (!userSession) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if (['ADMIN', 'COORDINATOR', 'STAFF', 'COLLAB'].includes(role || '')) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  if (pathname.startsWith("/u/") || pathname === "/u") {
    if (!userSession) return redirectToLogin();
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin/")) {
    if (!userSession) return redirectToLogin();

    if (role === 'ADMIN' || role === 'COORDINATOR') return NextResponse.next();
    if (role === 'STAFF' && matchesAny(pathname, STAFF_ALLOWED_ADMIN_ROUTES)) return NextResponse.next();
    if (areaAllowsAdminRoute(area, pathname)) return NextResponse.next();

    return redirectToLogin();
  }

  if (pathname.startsWith("/api/admin/")) {
    if (!userSession) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (role === 'ADMIN' || role === 'COORDINATOR') return NextResponse.next();
    if (role === 'STAFF' && matchesAny(pathname, STAFF_ALLOWED_ADMIN_APIS)) return NextResponse.next();
    if (role === 'COLLAB' && matchesAny(pathname, COLLAB_ALLOWED_ADMIN_APIS)) return NextResponse.next();
    if (role === 'COLLAB' && pathname.startsWith('/api/admin/daily-evaluation')) return NextResponse.next();
    if (areaAllowsAdminAPI(area, pathname)) return NextResponse.next();

    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  if (pathname.startsWith("/api/system/")) {
    const publicRouletteSystemApis = [
      '/api/system/tokens/sidebar',
      '/api/system/tokens/spins',
    ];

    if (publicRouletteSystemApis.includes(pathname)) {
      return NextResponse.next();
    }

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

  if (pathname.startsWith("/scanner")) {
    if (!userSession) return redirectToLogin();
    return NextResponse.next();
  }

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

  const isProtectedAPI = protectedAPIs.some((api) => pathname.startsWith(api));
  const isPublicBirthdayAPI = publicBirthdayAPIs.some((api) => pathname.startsWith(api));

  if (isPublicBirthdayAPI && isBirthdaysEnabledPublic()) return NextResponse.next();
  if (pathname.startsWith("/api/birthdays") && !userSession) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (isProtectedAPI && !userSession) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.next();
}
