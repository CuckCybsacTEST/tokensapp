import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || 'No autorizado' }, { status: 401 });
    }

    const groups = await prisma.tokenGroup.findMany({
      include: {
        tokens: {
          include: {
            prize: true
          }
        },
        _count: {
          select: { tokens: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });


    return NextResponse.json(groups);
  } catch (error) {
    console.error('[token-groups] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || 'No autorizado' }, { status: 401 });
    }

    const { name, description, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const group = await prisma.tokenGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error creating token group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}