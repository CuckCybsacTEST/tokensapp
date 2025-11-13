import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapAreaToStaffRole } from "@/lib/staff-roles";
import { isValidArea } from "@/lib/areas";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  console.log('DEBUG API /api/auth/role: userId', userId);

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const [staffRecord, user] = await Promise.all([
      prisma.staff.findUnique({ where: { userId }, select: { role: true } }),
      prisma.user.findUnique({ where: { id: userId }, include: { person: { select: { area: true } } } })
    ]);

    console.log('DEBUG API /api/auth/role: staffRecord', staffRecord, 'user', user);

    const area = user?.person?.area;
    const areaRole = area && isValidArea(area) ? mapAreaToStaffRole(area) : null;

    console.log('DEBUG API /api/auth/role: area', area, 'areaRole', areaRole);

    // If staff role is GENERAL_STAFF (generic) but area grants a more specific role, prefer area role.
    if (staffRecord?.role) {
      if (staffRecord.role === 'GENERAL_STAFF' && areaRole && areaRole !== 'GENERAL_STAFF') {
        console.log('DEBUG API /api/auth/role: returning areaRole', areaRole);
        return NextResponse.json({ role: areaRole });
      }
      console.log('DEBUG API /api/auth/role: returning staffRecord.role', staffRecord.role);
      return NextResponse.json({ role: staffRecord.role });
    }
    console.log('DEBUG API /api/auth/role: returning areaRole', areaRole);
    return NextResponse.json({ role: areaRole });
  } catch (e) {
    console.log('DEBUG API /api/auth/role: error', e);
    return NextResponse.json({ role: null });
  }
}