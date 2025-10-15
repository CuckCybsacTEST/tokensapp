import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { getSessionCookieFromRequest, verifySessionCookie } from "@/lib/auth";
import { mapAreaToStaffRole, getStaffPermissions } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";
import { StaffRole } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación con user_session o admin_session
    const userCookie = getUserSessionCookieFromRequest(request);
    const userSession = await verifyUserSessionCookie(userCookie);
    
    const adminCookie = getSessionCookieFromRequest(request);
    const adminSession = await verifySessionCookie(adminCookie);

    if (!userSession && !adminSession) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    let user = null;
    let restaurantRole: StaffRole | null = null;
    let validArea: string | null = null;
    let isStaffUser = false;
    let effectiveRole: StaffRole | null = null;
    let isAdminUser = false;

    if (adminSession) {
      // Si hay sesión de admin, darle acceso completo como ADMIN
      effectiveRole = 'ADMIN'; // Both ADMIN and STAFF admins get ADMIN access
      isAdminUser = true;
    } else if (userSession) {
      // Obtener información del usuario colaborador
      user = await prisma.user.findUnique({
        where: { id: userSession.userId },
        include: {
          person: true
        }
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      // Validar y mapear área a rol de restaurante
      const userArea = user.person?.area;
      validArea = userArea && isValidArea(userArea) ? userArea : null;
      restaurantRole = mapAreaToStaffRole(validArea as any);
      
      // Si es STAFF, darle acceso completo como ADMIN de restaurante
      isStaffUser = userSession.role === 'STAFF';
      effectiveRole = isStaffUser ? 'ADMIN' : restaurantRole;
    }

    const permissions = getStaffPermissions(effectiveRole || 'WAITER');

    // Si no tiene rol de restaurante y no es STAFF, devolver acceso limitado
    if (!restaurantRole && !isStaffUser && !isAdminUser) {
      return NextResponse.json({
        hasRestaurantAccess: false,
        area: validArea,
        permissions: {
          canViewOrders: false,
          canUpdateOrderStatus: false,
          canAssignTables: false,
          canCloseOrders: false,
          canMarkReady: false,
          allowedStatuses: []
        }
      });
    }

    // Para usuarios admin, no necesitamos registro en tabla Staff
    if (isAdminUser) {
      return NextResponse.json({
        hasRestaurantAccess: true,
        userId: 'admin',
        name: 'Administrator',
        role: effectiveRole,
        area: null,
        permissions
      });
    }

    // Buscar o crear registro en tabla Staff para usuarios colaboradores
    let staffRecord = await prisma.staff.findUnique({
      where: { userId: user!.id }
    });

    if (!staffRecord) {
      // Crear registro de staff automáticamente si no existe
      staffRecord = await prisma.staff.create({
        data: {
          userId: user!.id,
          name: user!.person?.name || user!.username,
          role: effectiveRole!,
          zones: [], // Por defecto sin zonas asignadas
          active: true
        }
      });
    } else if (staffRecord.role !== effectiveRole) {
      // Actualizar rol si cambió
      staffRecord = await prisma.staff.update({
        where: { id: staffRecord.id },
        data: { role: effectiveRole! }
      });
    }

    return NextResponse.json({
      hasRestaurantAccess: true,
      area: validArea,
      restaurantRole: effectiveRole,
      staffId: staffRecord.id,
      zones: staffRecord.zones,
      permissions
    });

  } catch (error) {
    console.error("Error obteniendo perfil de staff:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}