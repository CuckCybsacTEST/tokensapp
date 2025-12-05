import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { apiError } from '@/lib/apiError';

export async function GET(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const prizes = await prisma.prize.findMany({
      where: { isReusable: true },
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
        stock: true,
        active: true,
        emittedTotal: true
      },
      orderBy: { label: 'asc' }
    });

    return NextResponse.json(prizes);
  } catch (error) {
    console.error('Error fetching reusable prizes:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return apiError('UNAUTHORIZED', auth.error || 'No autorizado');
    }

    const { label, color, stock } = await req.json();

    if (!label || label.trim().length === 0) {
      return apiError('INVALID_INPUT', 'Label requerido');
    }

    // Generate unique key
    const baseKey = label.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
    let key = baseKey;
    let counter = 1;
    while (await prisma.prize.findUnique({ where: { key } })) {
      key = `${baseKey}${counter}`;
      counter++;
    }

    const prize = await prisma.prize.create({
      data: {
        key,
        label: label.trim(),
        color: color || null,
        stock: stock ? parseInt(stock) : null,
        isReusable: true,
        active: true
      },
      select: {
        id: true,
        key: true,
        label: true,
        color: true,
        stock: true,
        active: true,
        emittedTotal: true
      }
    });

    return NextResponse.json(prize);
  } catch (error) {
    console.error('Error creating reusable prize:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}