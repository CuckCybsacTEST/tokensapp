import { apiOk, apiError } from '@/lib/apiError';
import { getSessionCookieFromRequest, verifySessionCookie } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth-user';

export async function GET(req: Request) {
  try {
    // Verificar sesión de admin primero
    const adminCookie = getSessionCookieFromRequest(req);
    const adminSession = await verifySessionCookie(adminCookie);

    // Verificar sesión de usuario staff
    const userCookie = getUserSessionCookieFromRequest(req);
    const userSession = await verifyUserSessionCookie(userCookie);

    // Si hay sesión de admin
    if (adminSession && adminSession.role) {
      return apiOk({
        isStaff: adminSession.role === 'STAFF' || adminSession.role === 'ADMIN',
        isAdmin: adminSession.role === 'ADMIN',
        role: adminSession.role
      });
    }

    // Si hay sesión de usuario, verificar si tiene acceso staff
    if (userSession) {
      // Para usuarios staff, verificar si tienen área de restaurante
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const user = await prisma.user.findUnique({
          where: { id: userSession.userId },
          include: { person: true }
        });

        await prisma.$disconnect();

        if (user?.person?.area) {
          // Mapear área a rol de restaurante
          const { mapAreaToStaffRole } = require('@/lib/staff-roles');
          const restaurantRole = mapAreaToStaffRole(user.person.area);

          if (restaurantRole) {
            return apiOk({
              isStaff: true,
              isAdmin: false,
              role: restaurantRole,
              area: user.person.area
            });
          }
        } else {
          // Usuario colaborador sin área asignada - permitir acceso a interfaz staff
          return apiOk({
            isStaff: false,
            isAdmin: false,
            isCollaborator: true,
            role: 'COLLAB'
          });
        }
      } catch (err) {
        console.error('Error verificando área de usuario:', err);
      }
    }

    return apiOk({ isStaff: false, isAdmin: false });
  } catch (err) {
    return apiError('SESSION_ERROR', 'No se pudo obtener la sesión');
  }
}
