import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/admin/prizes/ensure-system
// Idempotent: creates 'retry' and 'lose' prizes if missing. Never modifies existing rows.
export async function POST(_req: NextRequest) {
  try {
    const desired = [
      { key: 'retry', label: 'Nuevo intento', color: '#3BA7F0' }, // azul brillante
      { key: 'lose', label: 'Piña', color: '#FFD600' }, // amarillo brillante
    ];
    const existing = await prisma.prize.findMany({ where: { key: { in: desired.map(d => d.key) } }, select: { key: true } });
    const existingKeys = new Set(existing.map(e => e.key));
    const toCreate = desired.filter(d => !existingKeys.has(d.key));
    const created: string[] = [];
    for (const d of toCreate) {
      await prisma.prize.create({ data: { key: d.key, label: d.label, color: d.color, active: true, stock: 0 } });
      created.push(d.key);
    }
    return NextResponse.json({ ok: true, created, skipped: [...existingKeys] });
  } catch (e) {
    console.error('[ensure-system-prizes]', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
