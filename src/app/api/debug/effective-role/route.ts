import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapAreaToStaffRole } from '@/lib/staff-roles';
import { isValidArea } from '@/lib/areas';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
  }

  try {
    // Get staff record
    const staffRecord = await prisma.staff.findUnique({
      where: { userId },
      select: { role: true, userId: true }
    });

    // Get user with person area
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        person: {
          select: {
            id: true,
            name: true,
            area: true
          }
        }
      }
    });

    // Calculate area role
    const area = user?.person?.area;
    const areaRole = area && isValidArea(area) ? mapAreaToStaffRole(area) : null;

    // Determine effective role (same logic as API)
    let effectiveRole = null;
    if (staffRecord?.role) {
      if (staffRecord.role === 'GENERAL_STAFF' && areaRole && areaRole !== 'GENERAL_STAFF') {
        effectiveRole = areaRole;
      } else {
        effectiveRole = staffRecord.role;
      }
    } else {
      effectiveRole = areaRole;
    }

    return NextResponse.json({
      userId,
      userFound: !!user,
      user: user ? {
        id: user.id,
        username: user.username,
        role: user.role,
        personId: user.personId
      } : null,
      person: user?.person || null,
      staffRecord,
      area: user?.person?.area || null,
      areaRole,
      effectiveRole,
      hasStaffRecord: !!staffRecord,
      debug: {
        staffRoleFromTable: staffRecord?.role || null,
        areaGrantsRole: areaRole,
        prefersAreaRole: staffRecord?.role === 'GENERAL_STAFF' && areaRole && areaRole !== 'GENERAL_STAFF',
        userExists: !!user,
        personExists: !!user?.person,
        areaIsValid: area ? isValidArea(area) : false
      }
    });
  } catch (error) {
    console.error('Debug role error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    }, { status: 500 });
  }
}