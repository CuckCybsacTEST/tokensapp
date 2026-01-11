import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';
import { DateTime } from 'luxon';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Auth check - require STAFF or ADMIN role
    const sessionCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const body = await req.json();
    const { prizeId, maxUses, description, validity } = body;

    // Validation
    if (!prizeId || !maxUses || maxUses <= 0 || maxUses > 1000) {
      return NextResponse.json(
        { error: 'Invalid parameters: prizeId and maxUses (1-1000) required' },
        { status: 400 }
      );
    }

    // Verify prize exists in ReusablePrize table
    const prize = await prisma.reusablePrize.findUnique({
      where: { id: prizeId },
      select: { id: true, label: true }
    });

    if (!prize) {
      return NextResponse.json({ error: 'Prize not found' }, { status: 404 });
    }

    // Generate unique token ID
    const tokenId = randomBytes(8).toString('hex').toUpperCase();
    const fullTokenId = `rt_${tokenId}`;

    // Calculate expiration and time window
    let expiresAt: Date;
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    if (validity?.type === 'expires_at' && validity.expiresAt) {
      // Parse the provided date as Lima timezone
      expiresAt = DateTime.fromISO(validity.expiresAt).setZone('America/Lima').toJSDate();
    } else if (validity?.type === 'duration_days' && validity.durationDays) {
      expiresAt = DateTime.now().setZone('America/Lima').plus({ days: validity.durationDays }).toJSDate();
    } else if (validity?.type === 'time_window' && validity.startTime && validity.endTime) {
      // Time window validation - expires in 1 year but only valid during specified hours
      expiresAt = DateTime.now().setZone('America/Lima').plus({ years: 1 }).toJSDate();

      // Parse start and end times as today in Lima timezone
      const today = DateTime.now().setZone('America/Lima').startOf('day');
      startTime = today.set({
        hour: parseInt(validity.startTime.split(':')[0]),
        minute: parseInt(validity.startTime.split(':')[1])
      }).toJSDate();
      endTime = today.set({
        hour: parseInt(validity.endTime.split(':')[0]),
        minute: parseInt(validity.endTime.split(':')[1])
      }).toJSDate();
    } else {
      // Default to 1 year if no validity specified
      expiresAt = DateTime.now().setZone('America/Lima').plus({ years: 1 }).toJSDate();
    }

    // Create reusable token directly (no batch needed)
    const token = await prisma.reusableToken.create({
      data: {
        id: fullTokenId,
        prizeId,
        maxUses,
        usedCount: 0,
        expiresAt,
        startTime,
        endTime,
        signature: `reusable_sig_${tokenId}`,
        signatureVersion: 1,
        deliveryNote: description || `Token individual - ${prize.label}`
      },
      select: {
        id: true,
        prizeId: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        startTime: true,
        endTime: true,
        deliveryNote: true
      }
    });

    // Generate QR URL
    const baseUrl = process.env.NEXT_PUBLIC_QR_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const qrUrl = `${baseUrl}/reusable/${token.id}`;

    return NextResponse.json({
      success: true,
      token: {
        id: token.id,
        qrUrl,
        prize: prize,
        maxUses: token.maxUses,
        expiresAt: token.expiresAt
      }
    });

  } catch (error) {
    console.error('Error creating individual reusable token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}