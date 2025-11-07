import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth";
import { mapAreaToStaffRole, getStaffPermissions } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";
import { StaffRole } from "@prisma/client";

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación con user_session (sistema unificado)
    const userCookie = getUserSessionCookieFromRequest(request);
    const userSession = await verifyUserSessionCookie(userCookie);

    if (!userSession) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    let user = null;
    let restaurantRole: StaffRole | null = null;
    let validArea: string | null = null;
    let effectiveRole: StaffRole | null = null;

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
    const isStaffUser = userSession.role === 'STAFF';
    effectiveRole = isStaffUser ? 'ADMIN' : restaurantRole;

    // Si no tiene rol de restaurante y no es STAFF, devolver acceso limitado
    if (!restaurantRole && !isStaffUser) {
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

    // Para usuarios colaboradores, crear registro en tabla Staff si no existe
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

    const permissions = getStaffPermissions(effectiveRole || 'WAITER');

    return NextResponse.json({
      hasRestaurantAccess: true,
      area: validArea,
      restaurantRole: effectiveRole,
      staffId: staffRecord.id,
      name: staffRecord.name,
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
