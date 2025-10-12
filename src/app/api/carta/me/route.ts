import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from "@/lib/auth-user";
import { mapAreaToStaffRole, getStaffPermissions } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación con user_session (no admin_session)
    const cookie = getUserSessionCookieFromRequest(request);
    const session = await verifyUserSessionCookie(cookie);

    if (!session) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Obtener información del usuario y persona
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
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
    const validArea = userArea && isValidArea(userArea) ? userArea : null;
    const restaurantRole = mapAreaToStaffRole(validArea);
    const permissions = getStaffPermissions(restaurantRole);

    // Si no tiene rol de restaurante, devolver acceso limitado
    if (!restaurantRole) {
      return NextResponse.json({
        hasRestaurantAccess: false,
        area: validArea,
        permissions: {
          canViewOrders: false,
          canUpdateOrderStatus: false,
          canAssignTables: false,
          canCloseOrders: false,
          canMarkReady: false
        }
      });
    }

    // Buscar o crear registro en tabla Staff
    let staffRecord = await prisma.staff.findUnique({
      where: { userId: user.id }
    });

    if (!staffRecord) {
      // Crear registro de staff automáticamente si no existe
      staffRecord = await prisma.staff.create({
        data: {
          userId: user.id,
          name: user.person?.name || user.username,
          role: restaurantRole,
          zones: [], // Por defecto sin zonas asignadas
          active: true
        }
      });
    }

    return NextResponse.json({
      hasRestaurantAccess: true,
      area: validArea,
      restaurantRole,
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