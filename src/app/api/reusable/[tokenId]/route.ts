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

    // Get token with batch and prize info
    const token = await prisma.token.findUnique({
      where: { id: tokenId },
      include: {
        prize: { select: { key: true, label: true, color: true } },
        batch: { select: { id: true, description: true, isReusable: true } }
      }
    });

    if (!token) {
      return NextResponse.json({ error: 'Token no encontrado' }, { status: 404 });
    }

    // Check if it's a reusable token
    if (!token.batch.isReusable) {
      return NextResponse.json({ error: 'Este token no es reutilizable' }, { status: 404 });
    }

    // Return token data
    const tokenData = {
      id: token.id,
      prize: token.prize,
      batch: token.batch,
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