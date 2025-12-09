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

    const prizes = await prisma.reusablePrize.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
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

    const body = await req.json();
    const { label, key, color, description } = body;

    if (!label?.trim() || !key?.trim()) {
      return NextResponse.json({ error: 'Label y key son requeridos' }, { status: 400 });
    }

    // Check if key already exists
    const existing = await prisma.reusablePrize.findUnique({
      where: { key: key.trim() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un premio con esa key' }, { status: 400 });
    }

    const prize = await prisma.reusablePrize.create({
      data: {
        label: label.trim(),
        key: key.trim(),
        color: color || null,
        description: description?.trim() || null
      }
    });

    return NextResponse.json(prize);
  } catch (error) {
    console.error('Error creating reusable prize:', error);
    return apiError('INTERNAL_ERROR', 'Error interno');
  }
}