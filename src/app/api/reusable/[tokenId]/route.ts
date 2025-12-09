import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reusable/[tokenId]
// Devuelve datos de un token reutilizable para la UI pública

export async function GET(req: NextRequest, { params }: { params: { tokenId: string } }) {
  try {
    const { tokenId } = params;
    if (!tokenId) {
      return NextResponse.json({ error: 'tokenId requerido' }, { status: 400 });
    }

    // Get token with prize info (ReusableToken table)
    const token = await prisma.reusableToken.findUnique({
      where: { id: tokenId },
      include: {
        prize: { select: { key: true, label: true, color: true } }
      }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 });
    }

    // Return token data (adapt to expected format)
    const tokenData = {
      id: token.id,
      prize: token.prize,
      batch: {
        id: `batch_${token.id}`, // Mock batch ID for compatibility
        description: token.deliveryNote || `Token individual - ${token.prize.label}`,
        isReusable: true
      },
      expiresAt: token.expiresAt.toISOString(),
      maxUses: token.maxUses,
      usedCount: token.usedCount,
      disabled: token.disabled,
      deliveredAt: token.deliveredAt?.toISOString() || null,
      startTime: token.startTime?.toISOString() || null,
      endTime: token.endTime?.toISOString() || null
    };

    return NextResponse.json({ token: tokenData });
  } catch (error) {
    console.error('Error fetching reusable token:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}