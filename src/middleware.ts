import { NextRequest, NextResponse } from "next/server";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { isBirthdaysEnabledPublic } from "@/lib/featureFlags";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  console.log('[middleware] Request to:', pathname);

  // Redirect root to marketing
  if (pathname === "/") {
    console.log('[middleware] Redirecting root to marketing');
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
    "/api/customers"
  ];

  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    console.log('[middleware] Public route, allowing');
    return NextResponse.next();
  }

  // Get user session (unified authentication system)
  const userCookie = getUserSessionCookieFromRequest(req);
  console.log('[middleware] User cookie present:', !!userCookie);
  const userSession = userCookie ? await verifyUserSessionCookie(userCookie) : null;
  console.log('[middleware] User session valid:', !!userSession);

  // Collaborator area (/u/*) - requires any valid user session
  if (pathname.startsWith("/u/") || pathname === "/u") {
    if (!userSession) {
      console.log('[middleware] No session for /u, redirecting to login');
      const loginUrl = new URL('/u/login', req.nextUrl.origin);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    console.log('[middleware] Allowing /u access');
    return NextResponse.next();
  }

  // Admin panel (/admin/*) - requires ADMIN or STAFF (limited routes)
  if (pathname.startsWith("/admin/")) {
    if (!userSession) {
      console.log('[middleware] No session for /admin, redirecting to login');
      const loginUrl = new URL('/u/login', req.nextUrl.origin);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // STAFF can access limited admin routes
    const staffAllowedRoutes = [
      '/admin/attendance',
      '/admin/tokens',
      '/admin/day-brief',
      '/admin/users',
      '/admin/reusable-tokens',
      '/admin/dj',           // DJ Console
      '/admin/music-orders',  // Music orders admin
      '/admin/generadorinvitaciones'  // Special event invitations
    ];

    const isStaffAllowedRoute = staffAllowedRoutes.some(route => pathname.startsWith(route));

    if (userSession.role === 'ADMIN' || (userSession.role === 'STAFF' && isStaffAllowedRoute)) {
      return NextResponse.next();
    }

    // Access denied
    const loginUrl = new URL('/u/login', req.nextUrl.origin);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin APIs (/api/admin/*) - requires ADMIN or STAFF (limited APIs) or COLLAB
  if (pathname.startsWith("/api/admin/")) {
    if (!userSession) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Allow COLLAB for all admin APIs
    if (userSession.role === 'COLLAB') {
      return NextResponse.next();
    }

    // STAFF can access limited admin APIs
    const staffAllowedAPIs = [
      '/api/admin/attendance',
      '/api/admin/tokens',
      '/api/admin/day-brief',
      '/api/admin/users',
      '/api/admin/birthdays',  // Allow STAFF to access birthdays admin API
      '/api/admin/reusable-tokens',  // Allow STAFF to access reusable tokens API
      '/api/admin/reusable-prizes',  // Allow STAFF to access reusable prizes API
      '/api/admin/music-system',      // Allow STAFF to access music system API
      '/api/admin/invitations'  // Allow STAFF to access invitations API
    ];

    const isStaffAllowedAPI = staffAllowedAPIs.some(api => pathname.startsWith(api));

    if (userSession.role === 'ADMIN' || (userSession.role === 'STAFF' && isStaffAllowedAPI)) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  // System APIs (/api/system/*) - requires ADMIN or STAFF
  if (pathname.startsWith("/api/system/")) {
    // Cron bypass for scheduled operations
    if (pathname === '/api/system/tokens/enable-scheduled' || pathname === '/api/system/tokens/toggle') {
      const cronSecret = req.headers.get('x-cron-secret') || '';
      if (cronSecret && cronSecret === (process.env.CRON_SECRET || '')) {
        return NextResponse.next();
      }
    }

    if (!userSession || !['ADMIN', 'STAFF'].includes(userSession.role)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    return NextResponse.next();
  }

  // Scanner routes - requires any valid user session
  if (pathname.startsWith("/scanner")) {
    if (!userSession) {
      const loginUrl = new URL('/u/login', req.nextUrl.origin);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Protected APIs - require any valid user session
  const protectedAPIs = [
    "/api/prizes",
    "/api/batch",
    "/api/batches",
    "/api/scanner",
    "/api/tickets"
  ];

  // Public birthday APIs when feature flag is enabled
  const publicBirthdayAPIs = [
    "/api/birthdays/packs",
    "/api/birthdays/slots",
    "/api/birthdays/reservations",
    "/api/birthdays/referrers/",
    "/api/birthdays/search",
    "/api/birthdays/invite/",
    "/api/birthdays/public/"
  ];

  const isProtectedAPI = protectedAPIs.some(api => pathname.startsWith(api));
  const isPublicBirthdayAPI = publicBirthdayAPIs.some(api => pathname.startsWith(api));

  // Allow public access to birthday APIs when feature flag is enabled
  if (isPublicBirthdayAPI && isBirthdaysEnabledPublic()) {
    return NextResponse.next();
  }

  // Block other birthday APIs if not authenticated
  if (pathname.startsWith("/api/birthdays") && !userSession) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (isProtectedAPI && !userSession) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.next();
}