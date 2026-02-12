export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/apiError';

// In-memory rate limiter for exchange submissions
const submitLimits = new Map<string, { count: number; window: number }>();
const SUBMIT_LIMIT = 5; // max submissions per window
const SUBMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkSubmitRateLimit(key: string): boolean {
  const now = Date.now();
  const window = Math.floor(now / SUBMIT_WINDOW_MS);
  const mapKey = `submit:${key}`;
  const entry = submitLimits.get(mapKey);
  if (!entry || entry.window !== window) {
    submitLimits.set(mapKey, { count: 1, window });
    return true;
  }
  if (entry.count >= SUBMIT_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/exchange/submit
 * Public endpoint — submit a client exchange
 *
 * Body: {
 *   batchId: string,
 *   customerName: string,
 *   customerWhatsapp: string,
 *   customerDni?: string,
 *   exchangeType: 'photo' | 'video' | 'text' | 'trivia',
 *   customerText?: string,
 *   triviaSessionId?: string,
 *   media?: Array<{ imageUrl, originalImageUrl, thumbnailUrl, mediaType, mediaMetadata? }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    if (!checkSubmitRateLimit(ip)) {
      return apiError('TOO_MANY_REQUESTS', 'Demasiadas solicitudes. Intenta de nuevo más tarde.', undefined, 429);
    }

    const body = await req.json();
    const {
      batchId,
      customerName,
      customerWhatsapp,
      customerDni,
      exchangeType,
      customerText,
      triviaSessionId,
      media
    } = body;

    // --- Validations ---
    if (!customerName || customerName.trim().length < 2) {
      return apiError('BAD_REQUEST', 'Nombre es requerido (mínimo 2 caracteres)', undefined, 400);
    }

    if (!exchangeType || !['photo', 'video', 'text', 'trivia'].includes(exchangeType)) {
      return apiError('BAD_REQUEST', 'Tipo de intercambio inválido', undefined, 400);
    }

    // Get batch (if provided)
    let batch: any = null;
    if (batchId) {
      batch = await (prisma as any).clientExchangeBatch.findUnique({
        where: { id: batchId }
      });
      if (!batch || !batch.isActive) {
        return apiError('BAD_REQUEST', 'Lote de intercambio no disponible', undefined, 400);
      }

      // Check if exchange type is allowed for this batch
      const allowedTypes = batch.exchangeTypes.split(',').map((t: string) => t.trim());
      if (!allowedTypes.includes(exchangeType)) {
        return apiError('BAD_REQUEST', `Tipo "${exchangeType}" no permitido en este lote`, undefined, 400);
      }

      // Check max exchanges if set
      if (batch.maxExchanges) {
        const count = await (prisma as any).clientExchange.count({
          where: { batchId: batch.id }
        });
        if (count >= batch.maxExchanges) {
          return apiError('BAD_REQUEST', 'Este lote ya alcanzó el máximo de intercambios', undefined, 400);
        }
      }
    }

    // Get policy for validations
    let policy: any = null;
    if (batch?.policyId) {
      policy = await (prisma as any).clientExchangePolicy.findUnique({
        where: { id: batch.policyId }
      });
    }
    if (!policy) {
      policy = await (prisma as any).clientExchangePolicy.findFirst({
        where: { isActive: true },
        orderBy: { isDefault: 'desc' }
      });
    }

    // Policy-based validations
    if (policy) {
      if (policy.requireWhatsapp && (!customerWhatsapp || customerWhatsapp.trim().length < 6)) {
        return apiError('BAD_REQUEST', 'WhatsApp es requerido', undefined, 400);
      }
      if (policy.requireDni && (!customerDni || customerDni.trim().length < 6)) {
        return apiError('BAD_REQUEST', 'DNI es requerido', undefined, 400);
      }

      // Check per-user limits by whatsapp
      if (policy.maxExchangesPerUser && customerWhatsapp) {
        const userCount = await (prisma as any).clientExchange.count({
          where: { customerWhatsapp: customerWhatsapp.trim() }
        });
        if (userCount >= policy.maxExchangesPerUser) {
          return apiError('BAD_REQUEST', 'Has alcanzado el máximo de intercambios permitidos', undefined, 400);
        }
      }

      // Rate limit per hour from policy
      if (policy.rateLimitPerHour) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCount = await (prisma as any).clientExchange.count({
          where: {
            ipAddress: ip,
            createdAt: { gte: oneHourAgo }
          }
        });
        if (recentCount >= policy.rateLimitPerHour) {
          return apiError('TOO_MANY_REQUESTS', 'Límite de intercambios por hora alcanzado', undefined, 429);
        }
      }
    }

    // Type-specific validations
    if (exchangeType === 'photo' || exchangeType === 'video') {
      if (!media || !Array.isArray(media) || media.length === 0) {
        return apiError('BAD_REQUEST', `Se requiere al menos un archivo para intercambio tipo "${exchangeType}"`, undefined, 400);
      }
    }

    if (exchangeType === 'text') {
      if (!customerText || customerText.trim().length < 5) {
        return apiError('BAD_REQUEST', 'El texto debe tener al menos 5 caracteres', undefined, 400);
      }
    }

    if (exchangeType === 'trivia') {
      if (!triviaSessionId) {
        return apiError('BAD_REQUEST', 'Se requiere completar la trivia', undefined, 400);
      }
      // Verify the trivia session was completed successfully
      const triviaSession = await (prisma as any).triviaSession.findUnique({
        where: { id: triviaSessionId }
      });
      if (!triviaSession || triviaSession.status !== 'completed') {
        return apiError('BAD_REQUEST', 'La trivia no fue completada exitosamente', undefined, 400);
      }
    }

    // --- Create the exchange ---
    const shouldAutoReward = policy?.autoReward !== false;

    const exchange = await (prisma as any).clientExchange.create({
      data: {
        customerName: customerName.trim(),
        customerWhatsapp: customerWhatsapp?.trim() || '',
        customerDni: customerDni?.trim() || null,
        exchangeType,
        customerText: customerText?.trim() || null,
        triviaSessionId: triviaSessionId || null,
        batchId: batch?.id || null,
        status: shouldAutoReward ? 'approved' : 'pending',
        ipAddress: ip,
        userAgent: req.headers.get('user-agent') || null,
        ...(shouldAutoReward && { completedAt: new Date() }),
      },
      include: { media: true }
    });

    // Create media records
    if (media && Array.isArray(media) && media.length > 0) {
      await (prisma as any).clientExchangeMedia.createMany({
        data: media.map((m: any) => ({
          exchangeId: exchange.id,
          mediaType: m.mediaType || exchangeType,
          imageUrl: m.imageUrl || null,
          originalImageUrl: m.originalImageUrl || null,
          thumbnailUrl: m.thumbnailUrl || null,
          mediaMetadata: m.mediaMetadata ? JSON.stringify(m.mediaMetadata) : null,
        }))
      });
    }

    // Auto-reward: assign token immediately for approved exchanges
    let rewardToken: any = null;
    if (shouldAutoReward && batch) {
      rewardToken = await assignRewardToken(batch, exchange.id);
    }

    // Re-fetch with media included
    const result = await (prisma as any).clientExchange.findUnique({
      where: { id: exchange.id },
      include: {
        media: true,
        batch: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({
      exchange: result,
      rewardAssigned: !!rewardToken,
      rewardTokenId: rewardToken?.tokenId || null,
      message: shouldAutoReward
        ? (rewardToken ? '¡Intercambio completado! Tu premio ha sido asignado.' : 'Intercambio registrado. No hay premios disponibles en este momento.')
        : 'Intercambio registrado. Será revisado por un administrador.'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[exchange/submit] Error:', error);
    return apiError('INTERNAL_ERROR', 'Error procesando intercambio', undefined, 500);
  }
}

/**
 * GET /api/exchange/submit?batchId=xxx
 * Public — get exchange info / available batches
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const batchId = url.searchParams.get('batchId');

    if (batchId) {
      const batch = await (prisma as any).clientExchangeBatch.findUnique({
        where: { id: batchId, isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          exchangeTypes: true,
          maxExchanges: true,
          _count: { select: { exchanges: true } }
        }
      });

      if (!batch) {
        return apiError('NOT_FOUND', 'Lote no encontrado o inactivo', undefined, 404);
      }

      // Get associated policy
      let policy: any = null;
      const fullBatch = await (prisma as any).clientExchangeBatch.findUnique({
        where: { id: batchId }
      });
      if (fullBatch?.policyId) {
        policy = await (prisma as any).clientExchangePolicy.findUnique({
          where: { id: fullBatch.policyId }
        });
      }
      if (!policy) {
        policy = await (prisma as any).clientExchangePolicy.findFirst({
          where: { isActive: true },
          orderBy: { isDefault: 'desc' }
        });
      }

      return NextResponse.json({
        batch,
        policy: policy ? {
          allowPhoto: policy.allowPhoto,
          allowVideo: policy.allowVideo,
          allowText: policy.allowText,
          allowTrivia: policy.allowTrivia,
          requireWhatsapp: policy.requireWhatsapp,
          requireDni: policy.requireDni,
          maxMediaSize: policy.maxMediaSize,
          allowedMediaFormats: policy.allowedMediaFormats,
          maxVideoSize: policy.maxVideoSize,
          allowedVideoFormats: policy.allowedVideoFormats,
        } : null,
        available: !batch.maxExchanges || batch._count.exchanges < batch.maxExchanges
      });
    }

    // Return list of active batches
    const batches = await (prisma as any).clientExchangeBatch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        exchangeTypes: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    console.error('[exchange/submit] GET Error:', error);
    return apiError('INTERNAL_ERROR', 'Error obteniendo información', undefined, 500);
  }
}

/**
 * Assign a reusable token from the batch's reward pool
 */
async function assignRewardToken(batch: any, exchangeId: string): Promise<{ tokenId: string } | null> {
  try {
    const where: any = {
      isActive: true,
      usedAt: null,
    };

    if (batch.rewardPrizeId) {
      where.prizeId = batch.rewardPrizeId;
    } else if (batch.rewardGroupId) {
      where.groupId = batch.rewardGroupId;
    } else {
      return null;
    }

    const token = await (prisma as any).reusableToken.findFirst({
      where,
      orderBy: { createdAt: 'asc' }
    });

    if (!token) return null;

    // Mark token used & link to exchange
    await (prisma as any).reusableToken.update({
      where: { id: token.id },
      data: {
        isActive: false,
        usedAt: new Date(),
      }
    });

    // Update exchange with reward info
    await (prisma as any).clientExchange.update({
      where: { id: exchangeId },
      data: {
        rewardTokenId: token.id,
        rewardDelivered: true,
      }
    });

    return { tokenId: token.id };
  } catch (error) {
    console.error('[assignRewardToken] Error:', error);
    return null;
  }
}
