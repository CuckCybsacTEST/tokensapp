import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieFromRequest, verifySessionCookieEdge as verifySessionCookie, requireRoleEdge } from "@/lib/auth-edge";
import { getUserSessionCookieFromRequest as getUserCookieEdge, verifyUserSessionCookieEdge as verifyUserCookieEdge } from "@/lib/auth-user-edge";

// Protect admin API + admin panel routes except auth login/logout.
const PROTECTED_API_PREFIXES = [
  "/api/prizes",
  "/api/batch",
  "/api/system",
  "/api/batches",
  "/api/scanner/metrics",
  "/api/scanner/recent",
  "/api/scanner/events",
];
const ADMIN_PANEL_PREFIX = "/admin";
const ADMIN_API_PREFIX = "/api/admin";
const SCANNER_PAGE_PREFIX = "/scanner";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Redirección de la raíz a marketing
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/marketing", req.url));
  }
  
  // Redirección específica para evitar problemas de layout
  if (pathname === "/admin") {
    const hasValidSession = await (async () => {
      const raw = getSessionCookieFromRequest(req as unknown as Request);
      return await verifySessionCookie(raw);
    })();
    
    if (!hasValidSession) {
      const loginUrl = new URL("/admin/login", req.nextUrl.origin);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Public auth endpoints & login page itself must bypass protection
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();
  if (pathname.startsWith("/api/user/auth/")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();
  if (pathname === "/u/login") return NextResponse.next();
  if (pathname === "/u/register") return NextResponse.next();
  if (pathname === "/u/reset-password") return NextResponse.next();

  // BYOD area (/u/**): require collaborator session (COLLAB/STAFF) or admin ADMIN
  if (pathname === "/u" || pathname.startsWith("/u/")) {
    // Allow unauthenticated access for the public reset page
    if (pathname === '/u/reset-password') {
      return NextResponse.next();
    }
    const adminRaw = getSessionCookieFromRequest(req as unknown as Request);
    const adminSession = await verifySessionCookie(adminRaw);
    const uRaw = getUserCookieEdge(req as unknown as Request);
    const uSession = await verifyUserCookieEdge(uRaw);
    const allowedByAdmin = !!adminSession && requireRoleEdge(adminSession, ['ADMIN']).ok;
    const allowedByUser = !!uSession; // any valid collaborator
    if (!allowedByAdmin && !allowedByUser) {
      const isApi = pathname.startsWith('/api');
      if (!isApi) {
        const loginUrl = new URL('/u/login', req.nextUrl.origin);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
      return new NextResponse(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  const needsAuth =
    PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
    (pathname.startsWith(ADMIN_PANEL_PREFIX) && pathname !== "/admin/login") ||
    pathname.startsWith(SCANNER_PAGE_PREFIX);
  if (needsAuth) {
    const raw = getSessionCookieFromRequest(req as unknown as Request);
    const session = await verifySessionCookie(raw);
    // User session (collaborator) for scanner access
    const uRaw = getUserCookieEdge(req as unknown as Request);
    const uSession = await verifyUserCookieEdge(uRaw);
    const hasAnySession = !!session || !!uSession;
    if (!hasAnySession) {
      const isApi = pathname.startsWith('/api');
      const isProtectedPage = pathname.startsWith('/admin') || pathname.startsWith(SCANNER_PAGE_PREFIX);
      if (isProtectedPage && !isApi) {
        // For scanner page, redirect to collaborator login by default
        const loginUrl = new URL(pathname.startsWith(SCANNER_PAGE_PREFIX) ? '/u/login' : '/admin/login', req.nextUrl.origin);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
      return new NextResponse(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Role-based authorization
    // 1) Admin panel: default only ADMIN; allow STAFF for specific pages
    if (pathname.startsWith(ADMIN_PANEL_PREFIX) && pathname !== "/admin/login") {
      const isStaffAllowedPath = pathname === '/admin/attendance' || pathname === '/admin/tokens';
      const roles = isStaffAllowedPath ? ['ADMIN', 'STAFF'] as const : ['ADMIN'] as const;
      const r = requireRoleEdge(session, roles as any);
      if (!r.ok) {
        const loginUrl = new URL('/admin/login', req.nextUrl.origin);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    // 1a) System admin APIs: allow ADMIN/STAFF via admin_session OR STAFF via user_session (e.g., Caja)
    if (pathname.startsWith('/api/system')) {
      const adminOk = requireRoleEdge(session, ['ADMIN', 'STAFF'] as any).ok;
      const userOk = !!uSession && (uSession.role === 'STAFF');
      if (!adminOk && !userOk) {
        return new NextResponse(JSON.stringify({ error: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    // 1b) Admin API: require ADMIN or STAFF depending on endpoint; default ADMIN-only for safety, but allow STAFF for subtrees we know safe.
    if (pathname.startsWith(ADMIN_API_PREFIX)) {
      // By default require ADMIN; allow STAFF for specific endpoints.
      const staffAllowed = (
        pathname.startsWith('/api/admin/users/') && pathname.endsWith('/password-otp')
      );
      const roles = staffAllowed ? ['ADMIN', 'STAFF'] as const : ['ADMIN'] as const;
      const r = requireRoleEdge(session, roles as any);
      if (!r.ok) {
        return new NextResponse(JSON.stringify({ error: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    // 2) Scanner page: allow ADMIN/STAFF via admin_session OR any user_session (COLLAB/STAFF)
    if (pathname.startsWith(SCANNER_PAGE_PREFIX) && !pathname.startsWith('/api')) {
      // Admin/staff via admin_session already validated above if present. If only user_session present, allow.
      const hasAdmin = !!session && requireRoleEdge(session, ['ADMIN', 'STAFF']).ok;
      if (!hasAdmin && !uSession) {
        const loginUrl = new URL('/u/login', req.nextUrl.origin);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    // 3) Admin scanner APIs: only ADMIN
    if (pathname.startsWith('/api/scanner/metrics') || pathname.startsWith('/api/scanner/recent') || pathname.startsWith('/api/scanner/events')) {
      const r = requireRoleEdge(session, ['ADMIN']);
      if (!r.ok) {
        return new NextResponse(JSON.stringify({ error: 'FORBIDDEN' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/:path*", "/admin/:path*", "/scanner", "/scanner/:path*", "/u/:path*"],
};
