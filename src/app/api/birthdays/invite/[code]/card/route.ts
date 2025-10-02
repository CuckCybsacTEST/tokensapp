export const runtime = 'nodejs'; // necesario para usar fs/sharp (evitar Edge runtime sin acceso a filesystem)
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInviteCard } from '@/lib/birthdays/generateInviteCard';
import { apiError } from '@/lib/apiError';

// GET /api/birthdays/invite/:code/card?fmt=webp|png
// Returns a composed vertical invite card with embedded QR.
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { searchParams } = new URL(req.url);
  const fmt = (searchParams.get('fmt') === 'png' ? 'png' : 'webp') as 'png' | 'webp';
  try {
    const token = await prisma.inviteToken.findUnique({ where: { code: params.code }, include: { reservation: true } });
    if (!token) return apiError('NOT_FOUND','Token no encontrado',undefined,404);
    const kind = token.kind === 'host' ? 'host' : 'guest';
    // Public redeem URL (short path /b/:code already exists)
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redeemUrl = `${base}/b/${encodeURIComponent(token.code)}`;
  // Derive celebrant first name from reservation if available
  const celebrantFull = (token as any).reservation?.celebrantName || '';
  const celebrantFirst = celebrantFull.trim().split(/\s+/)[0] || celebrantFull;
  const reservationDateISO = (token as any).reservation?.date ? (token as any).reservation.date.toISOString() : undefined;
  if (!process.env.SILENCE_INVITE_CARD_LOGS) {
    // eslint-disable-next-line no-console
    console.info('[inviteCard] generando', { code: token.code, kind, fmt, celebrantFirst, reservationDateISO });
  }
  const buf = await generateInviteCard(kind, token.code, redeemUrl, fmt, celebrantFirst, reservationDateISO);
  return new Response(new Uint8Array(buf), { status: 200, headers: { 'Content-Type': fmt === 'png' ? 'image/png' : 'image/webp', 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' } });
  } catch (e: any) {
    if (!process.env.SILENCE_INVITE_CARD_LOGS) {
      // eslint-disable-next-line no-console
      console.error('[inviteCard] error en endpoint', { code: params.code, err: e?.message, stack: e?.stack });
    }
    return apiError('INTERNAL_ERROR','Error generando tarjeta');
  }
}
