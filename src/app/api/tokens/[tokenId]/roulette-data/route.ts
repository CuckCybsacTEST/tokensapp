import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemConfig } from '@/lib/config';
import { apiError } from '@/lib/apiError';
import { DateTime } from 'luxon';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;
    
  // Verificar que el sistema está habilitado
  // Forzamos lectura directa de DB para evitar caché desactualizada entre aislamientos de rutas
  const cfg = await getSystemConfig(true);
    console.log(`[roulette-data] Token ${tokenId}: Sistema de tokens está ${cfg.tokensEnabled ? 'HABILITADO' : 'DESHABILITADO'}`);
    
    if (!cfg.tokensEnabled) {
      console.log(`[roulette-data] Rechazando token ${tokenId} porque los tokens están deshabilitados`);
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
        token: serializeToken(token),
        message: 'Token ya canjeado'
      });
    }
    
    if (token.disabled || !token.prize.active) {
      return NextResponse.json({
        token: serializeToken(token),
        message: 'Token inactivo'
      });
    }
    
    if (Date.now() > token.expiresAt.getTime()) {
      return NextResponse.json({
        token: serializeToken(token),
        message: 'Token expirado'
      });
    }
    
    // Obtener premios disponibles en este batch
    const groups = await prisma.token.groupBy({
      by: ["prizeId"],
      where: {
        batchId: token.batchId,
        redeemedAt: null,
        disabled: false,
        expiresAt: { gt: new Date() },
      },
      _count: { _all: true },
    });
    
    const prizeIds = groups.map((g) => g.prizeId);
    const prizeDetails = await prisma.prize.findMany({ where: { id: { in: prizeIds } } });
    
    const elements = groups.map((g) => {
      const p = prizeDetails.find((pd) => pd.id === g.prizeId)!;
      return { prizeId: p.id, label: p.label, color: p.color || null, count: g._count._all };
    });
    
    // Garantizar que el premio de este token esté incluido (p.ej. ya consumido en reveal/deliver legacy)
    if (!elements.find((e) => e.prizeId === token.prizeId)) {
      elements.push({
        prizeId: token.prizeId,
        label: token.prize.label,
        color: token.prize.color || null,
        count: 1,
      });
    }
    
    // Reglas: la ruleta sólo es válida con 2 o más elementos
    if (elements.length < 2) {
      return NextResponse.json({
        token: serializeToken(token),
        elements,
        status: 'not-enough-elements',
        message: 'La ruleta requiere al menos 2 premios disponibles.',
      }, { status: 400 });
    }

    return NextResponse.json({
      token: serializeToken(token),
      elements,
    });
  } catch (error) {
    console.error("API error:", error);
    return apiError('internal_error', 'Error procesando la solicitud', null, 500);
  }
}

// Función auxiliar para serializar un token
function serializeToken(token: any) {
  let availableFrom: string | null = null;
  try {
    // Derivamos el inicio del día a partir de expiresAt (que en singleDay es fin de día)
    const exp = DateTime.fromISO(new Date(token.expiresAt).toISOString(), { zone: 'system' });
    if (exp.isValid) availableFrom = exp.startOf('day').toISO();
  } catch {}
  return {
    id: token.id,
    expiresAt: token.expiresAt.toISOString(),
    redeemedAt: token.redeemedAt ? token.redeemedAt.toISOString() : null,
    revealedAt: token.revealedAt ? token.revealedAt.toISOString() : null,
    deliveredAt: token.deliveredAt ? token.deliveredAt.toISOString() : null,
    disabled: token.disabled,
    availableFrom,
    batchId: token.batchId,
    prize: {
      id: token.prize.id,
      key: token.prize.key,
      label: token.prize.label,
      color: token.prize.color || null,
      active: token.prize.active,
    },
  };
}
