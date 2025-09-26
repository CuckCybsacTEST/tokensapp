import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/batch/[id]
// Body: { description: string }
// Actualiza sólo la descripción del batch.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!id) return NextResponse.json({ ok: false, error: 'NO_ID' }, { status: 400 });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const desc = typeof body.description === 'string' ? body.description.trim() : '';
  if (!desc) return NextResponse.json({ ok: false, error: 'INVALID_DESCRIPTION' }, { status: 400 });
  const exists = await prisma.batch.findUnique({ where: { id } });
  if (!exists) return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  const updated = await prisma.batch.update({ where: { id }, data: { description: desc } });
  return NextResponse.json({ ok: true, batch: { id: updated.id, description: updated.description } });
}
