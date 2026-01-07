import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

export async function DELETE(req: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const sessionCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const { tokenId } = params;

    // Verificar que el token existe
    const token = await prisma.reusableToken.findUnique({
      where: { id: tokenId },
      select: { id: true, usedCount: true, maxUses: true }
    });

    if (!token) {
      return apiError('NOT_FOUND', 'Token no encontrado');
    }

    // No permitir eliminar tokens que ya han sido usados
    if (token.usedCount > 0) {
      return apiError('BAD_REQUEST', 'No se puede eliminar un token que ya ha sido usado');
    }

    // Eliminar el token
    await prisma.reusableToken.delete({
      where: { id: tokenId }
    });

    return NextResponse.json({ success: true, message: 'Token eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting reusable token:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}