import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: { id: true, username: true, role: true }
    });

    return NextResponse.json({
      user,
      roleType: typeof user?.role,
      roleValue: user?.role,
      computedRole: user?.role === "ADMIN" ? "ADMIN" : (user?.role === "STAFF" ? "STAFF" : "COLLAB")
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}