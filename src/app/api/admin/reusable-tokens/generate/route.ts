import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';
import JSZip from 'jszip';
import { generateQrPngDataUrl } from '@/lib/qr';
import { headers } from 'next/headers';
import { DateTime } from 'luxon';

export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }
    const body = await req.json();

    const { prizeId, maxUses, count, description, validity } = body;

    if (!prizeId || !count || count <= 0 || !maxUses || maxUses <= 0) {
      return apiError('INVALID_INPUT', 'Datos inválidos');
    }

    // Validate prize exists and is active
    const prize = await prisma.prize.findUnique({
      where: { id: prizeId },
      select: { id: true, active: true, key: true, label: true }
    });
    if (!prize || !prize.active) {
      return apiError('PRIZE_NOT_FOUND', 'Premio no encontrado o inactivo');
    }

    // Calculate expiration using Lima timezone
    let expiresAt: Date;
    const limaTimezone = 'America/Lima';
    
    if (validity?.mode === 'byDays') {
      // Calculate expiration from now in Lima time
      const nowInLima = DateTime.now().setZone(limaTimezone);
      const expiresInLima = nowInLima.plus({ days: validity.expirationDays });
      expiresAt = expiresInLima.setZone('utc').toJSDate();
    } else if (validity?.mode === 'singleDay') {
      // Parse date as Lima time and set to end of day (23:59:59 Lima)
      const dateInLima = DateTime.fromISO(validity.date, { zone: limaTimezone });
      const expiresInLima = dateInLima.set({ hour: 23, minute: 59, second: 59 });
      expiresAt = expiresInLima.setZone('utc').toJSDate();
    } else if (validity?.mode === 'singleHour') {
      // Parse date and time as Lima time and add duration
      const startInLima = DateTime.fromISO(`${validity.date}T${validity.hour}`, { zone: limaTimezone });
      const expiresInLima = startInLima.plus({ minutes: validity.durationMinutes });
      expiresAt = expiresInLima.setZone('utc').toJSDate();
    } else {
      return apiError('INVALID_VALIDITY', 'Modo de validez inválido');
    }

    // Create batch
    const batch = await prisma.batch.create({
      data: {
        description: description || `Lote reutilizable - ${prize.label}`,
        staticTargetUrl: null, // Reusable batches have null URL
        isReusable: true, // Mark as reusable
      }
    });

    // Generate tokens
    const tokens = [];
    for (let i = 0; i < count; i++) {
      const tokenId = `rt_${Date.now()}_${i}`;
      const signature = `reusable_sig_${tokenId}`;

      // Calculate startTime for singleHour mode using Lima timezone
      let startTime: Date | null = null;
      if (validity?.mode === 'singleHour') {
        const startInLima = DateTime.fromISO(`${validity.date}T${validity.hour}`, { zone: limaTimezone });
        startTime = startInLima.setZone('utc').toJSDate();
      }

      const token = await prisma.token.create({
        data: {
          id: tokenId,
          prizeId,
          batchId: batch.id,
          expiresAt,
          signature,
          maxUses,
          usedCount: 0,
          startTime,
          endTime: validity?.mode === 'singleHour' ? expiresAt : null,
        }
      });
      tokens.push(token);
    }

    // Get the base URL from the request headers
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;

    // Generate ZIP with QRs and manifest
    const zip = new JSZip();
    const generatedAtLima = DateTime.now().setZone(limaTimezone);
    const manifest = {
      batchId: batch.id,
      description: batch.description,
      prize: { key: prize.key, label: prize.label },
      totalTokens: tokens.length,
      maxUses,
      expiresAt: expiresAt.toISOString(),
      generatedAt: generatedAtLima.toISO(),
      tokens: tokens.map(t => ({ id: t.id, qrUrl: `${baseUrl}/reusable/${t.id}` }))
    };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Generate QR for each token
    for (const token of tokens) {
      const qrUrl = `${baseUrl}/reusable/${token.id}`;
      const qrDataUrl = await generateQrPngDataUrl(qrUrl);
      const base64Data = qrDataUrl.split(',')[1];
      zip.file(`qr-${token.id}.png`, base64Data, { base64: true });
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Log event
    await prisma.eventLog.create({
      data: {
        type: 'REUSABLE_BATCH_GENERATED',
        message: `Lote reutilizable generado: ${batch.id} (${tokens.length} tokens)`,
        metadata: JSON.stringify({ batchId: batch.id, prizeId, count, maxUses })
      }
    });

    return new NextResponse(zipBlob, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="reusable_batch_${batch.id}.zip"`
      }
    });

  } catch (error) {
    console.error('Error generating reusable batch:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}