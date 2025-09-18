import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSystemConfig } from '@/lib/config';
import { computeTokensEnabled } from '@/lib/tokensMode';
import { apiError } from '@/lib/apiError';
import { DateTime } from 'luxon';

export async function GET(
  request: NextRequest,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = params.tokenId;
    
  // Verificar que el sistema está habilitado por interruptor Y dentro de ventana horaria
  const cfg = await getSystemConfig(true);
  const tz = process.env.TOKENS_TIMEZONE || 'America/Lima';
  const scheduled = computeTokensEnabled({ now: new Date(), tz });
  const allowedBySwitch = cfg.tokensEnabled;
  const allowedBySchedule = scheduled.enabled; // 18:00-00:00
  console.log(`[roulette-data] Token ${tokenId}: switch=${allowedBySwitch ? 'ON' : 'OFF'} scheduled=${allowedBySchedule ? 'OPEN' : 'CLOSED'} tz=${tz}`);
  // Option B: Si el interruptor está ON, permitimos aunque estemos fuera del horario (override manual temporal)
  if (!allowedBySwitch) {
    console.log(`[roulette-data] Rechazando token ${tokenId}: system OFF (override not active)`);
    return NextResponse.json({
      error: 'Sistema desactivado',
      message: 'El sistema de tokens está desactivado temporalmente.',
      status: 'disabled'
    }, { status: 403 });
  }
  // allowedBySwitch === true: se permite aunque scheduled.enabled sea false; añadimos log informativo
  if (!allowedBySchedule) {
    console.log(`[roulette-data] Permitido por override manual fuera de ventana horaria (switch ON, scheduled CLOSED)`);
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
