import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      code: 'REMOVED',
      message: 'Attendance metrics endpoint removed. Use /api/admin/attendance/table instead.'
    },
    { status: 410 }, // 410 Gone to signal permanent removal
  );
}
