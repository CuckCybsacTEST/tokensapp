export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

// Deprecated: SystemConfig no longer has admin/test mode fields. Use /api/system/tokens/toggle instead.
export async function POST() {
  return NextResponse.json(
    { ok: false, error: 'gone', message: 'admin-disable removed. Use /api/system/tokens/toggle' },
    { status: 410 }
  );
}
