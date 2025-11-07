import { NextRequest, NextResponse } from 'next/server';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';
import { generateQrPngDataUrl } from '@/lib/qr';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const raw = getUserSessionCookieFromRequest(req as unknown as Request);
  const session = await verifyUserSessionCookie(raw);
  if (!session || session.role !== 'STAFF') return new NextResponse('UNAUTHORIZED', { status: 401 });
  const id = params.id;
  const resv = await prisma.birthdayReservation.findUnique({ where: { id }, include: { inviteTokens: true } });
  if (!resv) return new NextResponse('NOT_FOUND', { status: 404 });
  const zip = new JSZip();
  const folder = zip.folder(`reservation-${id}`)!;
  for (const t of resv.inviteTokens) {
    try {
      const redeemUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/b/${encodeURIComponent(t.code)}`;
      const dataUrl = await generateQrPngDataUrl(redeemUrl);
      const base64 = dataUrl.split(',')[1];
      folder.file(`${t.kind}-${t.code}.png`, base64, { base64: true });
    } catch {}
  }
  const bin: Buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const b64 = bin.toString('base64');
  const body = Buffer.from(b64, 'base64');
  // Convert final buffer to ArrayBuffer via slice for BodyInit stability
  const final = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
  return new Response(final, { status: 200, headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename=reservation-${id}-invites.zip` } });
}
