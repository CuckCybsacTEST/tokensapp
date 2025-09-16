import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemConfig } from '@/lib/config';
import { apiError } from '@/lib/apiError';

export async function POST(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;
    
  // Verificar que el sistema está habilitado
  // Forzar lectura fresca de la configuración para evitar estado en caché tras un toggle reciente
  const cfg = await getSystemConfig(true);
    if (!cfg.tokensEnabled) {
      return NextResponse.json({ 
        error: 'El sistema de tokens se encuentra temporalmente desactivado. Por favor, inténtalo más tarde.', 
        message: 'Los tokens están temporalmente fuera de servicio. Vuelve a intentarlo en unos minutos.',
        status: 'disabled'
      }, { status: 403 });
    }
    
    // Buscar el token
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: { prize: true },
    });
    
    if (!token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 });
    }
    
    // Verificar si el token ya fue utilizado, expirado o está deshabilitado
    if (token.redeemedAt) {
      return NextResponse.json({ 
        error: 'Token ya canjeado',
        token: {
          id: token.id,
          expiresAt: token.expiresAt.toISOString(),
          redeemedAt: token.redeemedAt.toISOString(),
          revealedAt: (token as any).revealedAt ? (token as any).revealedAt.toISOString() : null,
          deliveredAt: (token as any).deliveredAt ? (token as any).deliveredAt.toISOString() : null,
          disabled: token.disabled,
          prize: token.prize
        }
      }, { status: 400 });
    }
    
    if (token.disabled || !token.prize.active) {
      return NextResponse.json({
        error: 'Token inactivo'
      }, { status: 400 });
    }
    
    if (Date.now() > token.expiresAt.getTime()) {
      return NextResponse.json({
        error: 'Token expirado'
      }, { status: 400 });
    }
    
    // Actualizar el token para marcar como entregado
    const now = new Date();
    const updatedToken = await prisma.token.update({
      where: { id: tokenId },
      data: {
        revealedAt: (token as any).revealedAt || now,
        deliveredAt: now,
        redeemedAt: now
      },
      include: { prize: true }
    });
    
    // Devolver la información del token actualizado
    return NextResponse.json({
      token: {
        id: updatedToken.id,
        expiresAt: updatedToken.expiresAt.toISOString(),
        redeemedAt: updatedToken.redeemedAt ? updatedToken.redeemedAt.toISOString() : null,
        revealedAt: (updatedToken as any).revealedAt ? (updatedToken as any).revealedAt.toISOString() : null,
        deliveredAt: (updatedToken as any).deliveredAt ? (updatedToken as any).deliveredAt.toISOString() : null,
        disabled: updatedToken.disabled,
        prize: updatedToken.prize
      }
    });
  }
  catch (error: any) {
    return apiError(error);
  }
}
