export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

export async function GET(req: Request) {
  try {
    const activePolicy = await (prisma as any).customQrPolicy.findFirst({
      where: { isActive: true },
      include: {
        // Si necesitas incluir el batch, descomenta:
        // batch: true
      }
    });

    if (!activePolicy) {
      // Fallback: política por defecto si no hay activa
      const defaultPolicy = await (prisma as any).customQrPolicy.findFirst({
        where: { isDefault: true }
      });

      if (defaultPolicy) {
        return NextResponse.json({
          message: 'Política por defecto encontrada',
          policy: defaultPolicy
        });
      }

      return NextResponse.json({
        message: 'No hay política disponible',
        policy: null
      });
    }

    return NextResponse.json({
      message: 'Política activa encontrada',
      policy: activePolicy
    });

  } catch (error: any) {
    console.error('[API] Error obteniendo política pública:', error);
    return apiError('INTERNAL_ERROR', 'Error interno del servidor', undefined, 500);
  }
}