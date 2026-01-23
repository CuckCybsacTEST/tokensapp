import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';

export async function POST(
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

    const { tokenIds } = await request.json();

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json({ error: 'tokenIds must be a non-empty array' }, { status: 400 });
    }

    // Verify group exists
    const group = await prisma.tokenGroup.findUnique({
      where: { id: params.id }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Update tokens to be in this group
    const result = await prisma.reusableToken.updateMany({
      where: {
        id: { in: tokenIds }
      },
      data: { groupId: params.id }
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Error adding tokens to group:', error);
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

    const { tokenIds } = await request.json();

    if (!Array.isArray(tokenIds)) {
      return NextResponse.json({ error: 'tokenIds must be an array' }, { status: 400 });
    }

    // Remove tokens from this group (set groupId to null)
    const result = await prisma.reusableToken.updateMany({
      where: {
        id: { in: tokenIds },
        groupId: params.id // Only remove if they're actually in this group
      },
      data: { groupId: null }
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    });
  } catch (error) {
    console.error('Error removing tokens from group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}