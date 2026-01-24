import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface CustomerSession {
  id: string;
  customerId: string;
  sessionToken: string;
  expiresAt: Date;
  lastActivity: Date;
  customer: {
    id: string;
    dni: string;
    name: string;
    email: string | null;
    phone: string;
    whatsapp: string | null;
    birthday: Date | null;
    membershipLevel: string;
    points: number;
    totalSpent: number;
    visitCount: number;
    lastVisit: Date | null;
    isActive: boolean;
    createdAt: Date;
  };
}

export interface AuthResult {
  session: CustomerSession | null;
  error: string | null;
}

/**
 * Valida la sesión de un cliente desde las cookies
 */
export async function validateCustomerSession(req: NextRequest): Promise<AuthResult> {
  try {
    const sessionToken = req.cookies.get('customer_session')?.value;

    if (!sessionToken) {
      return { session: null, error: 'NO_SESSION' };
    }

    // Buscar sesión en la base de datos
    const session = await prisma.customerSession.findUnique({
      where: { sessionToken },
      include: {
        customer: {
          select: {
            id: true,
            dni: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            birthday: true,
            membershipLevel: true,
            points: true,
            totalSpent: true,
            visitCount: true,
            lastVisit: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    });

    if (!session) {
      return { session: null, error: 'INVALID_SESSION' };
    }

    // Verificar expiración
    if (session.expiresAt < new Date()) {
      // Limpiar sesión expirada
      await prisma.customerSession.delete({
        where: { id: session.id }
      }).catch(() => {}); // Ignorar errores de limpieza

      return { session: null, error: 'SESSION_EXPIRED' };
    }

    // Verificar que el cliente esté activo
    if (!session.customer.isActive) {
      return { session: null, error: 'CUSTOMER_INACTIVE' };
    }

    // Actualizar lastActivity (solo si han pasado más de 5 minutos)
    const now = new Date();
    const lastActivity = new Date(session.lastActivity);
    const minutesSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

    if (minutesSinceLastActivity > 5) {
      await prisma.customerSession.update({
        where: { id: session.id },
        data: { lastActivity: now }
      }).catch(() => {}); // Ignorar errores de actualización
    }

    return { session, error: null };

  } catch (error) {
    console.error('Error validating customer session:', error);
    return { session: null, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Middleware helper para requerir autenticación de cliente
 */
export async function requireCustomerAuth(req: NextRequest): Promise<CustomerSession> {
  const { session, error } = await validateCustomerSession(req);

  if (error || !session) {
    throw new Error(error || 'UNAUTHORIZED');
  }

  return session;
}

/**
 * Helper para crear respuesta de error de autenticación
 */
export function createAuthErrorResponse(error: string, status = 401) {
  return new Response(
    JSON.stringify({ ok: false, code: error }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}