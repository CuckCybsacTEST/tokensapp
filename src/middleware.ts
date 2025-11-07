import { NextRequest, NextResponse } from "next/server";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { isBirthdaysEnabledPublic } from "@/lib/featureFlags";

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
    "/api/user/auth/reset-password"
  ];

  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get user session (unified authentication system)
  const userCookie = getUserSessionCookieFromRequest(req);
  const userSession = userCookie ? await verifyUserSessionCookie(userCookie) : null;

  // Collaborator area (/u/*) - requires any valid user session
  if (pathname.startsWith("/u/") || pathname === "/u") {
    if (!userSession) {
      const loginUrl = new URL('/u/login', req.nextUrl.origin);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Admin panel (/admin/*) - requires ADMIN or STAFF (limited routes)
  if (pathname.startsWith("/admin/")) {
    if (!userSession) {
      const loginUrl = new URL('/u/login', req.nextUrl.origin);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // STAFF can access limited admin routes
    const staffAllowedRoutes = [
      '/admin/attendance',
      '/admin/tokens',
      '/admin/day-brief',
      '/admin/users'
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

  // Admin APIs (/api/admin/*) - requires ADMIN or STAFF (limited APIs)
  if (pathname.startsWith("/api/admin/")) {
    if (!userSession) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // STAFF can access limited admin APIs
    const staffAllowedAPIs = [
      '/api/admin/attendance',
      '/api/admin/tokens',
      '/api/admin/day-brief',
      '/api/admin/users'
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
    if (pathname === '/api/system/tokens/enable-scheduled') {
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