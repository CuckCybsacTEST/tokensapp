import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || 'No autorizado' }, { status: 401 });
    }

    const group = await prisma.tokenGroup.findUnique({
      where: { id: params.id },
      include: {
        tokens: {
          include: {
            prize: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { tokens: true }
        }
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error fetching token group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const group = await prisma.tokenGroup.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating token group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = getSessionCookieFromRequest(request);
    const session = await verifySessionCookie(sessionCookie);
    const auth = requireRole(session, ['STAFF', 'ADMIN']);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error || 'No autorizado' }, { status: 401 });
    }

    // First, remove all tokens from this group
    await prisma.reusableToken.updateMany({
      where: { groupId: params.id },
      data: { groupId: null }
    });

    // Then delete the group
    await prisma.tokenGroup.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting token group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}