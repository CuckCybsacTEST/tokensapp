import { NextRequest, NextResponse } from 'next/server';
import { apiOk, apiError } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, roleAtLeast, verifyUserSessionCookie } from '@/lib/auth';
import { mapAreaToStaffRole } from '@/lib/staff-roles';

export async function GET(req: Request) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req);
    const userSession = await verifyUserSessionCookie(userCookie);

    if (!userSession) {
      return NextResponse.json({
        ok: false,
        isStaff: false,
        isAdmin: false,
      });
    }

    if (roleAtLeast(userSession.role, 'STAFF')) {
      return NextResponse.json({
        ok: true,
        isStaff: true,
        isAdmin: userSession.role === 'ADMIN',
        role: userSession.role,
        area: userSession.area ?? null,
      });
    }

    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const user = await prisma.user.findUnique({
        where: { id: userSession.userId },
        include: { person: true }
      });

      await prisma.$disconnect();

      const area = user?.person?.area ?? null;
      const mappedRole = mapAreaToStaffRole(area);
      if (mappedRole) {
        return NextResponse.json({
          ok: true,
          isStaff: true,
          isAdmin: false,
          role: mappedRole,
          area,
        });
      }
    } catch (err) {
      console.error('Error verificando área de usuario:', err);
    }

    return NextResponse.json({
      ok: true,
      isStaff: false,
      isAdmin: false,
      isCollaborator: true,
      role: userSession.role,
      area: userSession.area ?? null,
    });
  } catch (err) {
    return apiError('SESSION_ERROR', 'No se pudo obtener la sesión');
  }
}
