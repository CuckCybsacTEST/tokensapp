export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TYPES = ["SCAN_OK", "SCAN_DUPLICATE", "SCAN_INVALID"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 100);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, type, message, metadata, createdAt
       FROM EventLog
       WHERE type IN ('${TYPES.join("','")}')
       ORDER BY createdAt DESC
       LIMIT ${limit}`
    );

    // Parse metadata to extract scanType (IN/OUT) when present
    const events = rows.map((r) => {
      let scanType: 'IN' | 'OUT' | null = null;
      if (r?.metadata) {
        try {
          const meta = JSON.parse(r.metadata);
          const t = (meta?.type || '').toUpperCase();
          if (t === 'IN' || t === 'OUT') scanType = t;
        } catch {
          // ignore malformed metadata
        }
      }
      return { ...r, scanType };
    });

    return NextResponse.json({ ok: true, events });
  } catch (e: any) {
    console.error('events endpoint error', e);
    return NextResponse.json({ ok: false, code: 'INTERNAL', message: String(e?.message || e) }, { status: 500 });
  }
}
