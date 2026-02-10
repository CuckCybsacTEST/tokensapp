import { NextRequest } from 'next/server';
import { apiError, apiOk } from '@/lib/apiError';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { getEvent, listGuests } from '@/lib/invitations/service';
import { generateInvitationCard } from '@/lib/invitations/generateCard';
import archiver from 'archiver';

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
    const session = await verifyUserSessionCookie(userCookie);
    if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
    if (!session.role || !['ADMIN', 'STAFF'].includes(session.role))
      return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

    const event = await getEvent(params.eventId);
    if (!event) return apiError('NOT_FOUND', 'Event not found', undefined, 404);

    const guests = event.invitations.filter((inv) => inv.code);
    if (guests.length === 0) return apiError('NO_CODES', 'No invitations with codes generated yet', undefined, 400);

    const baseUrl = req.headers.get('x-forwarded-proto')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('host')}`
      : new URL(req.url).origin;

    // ── Single guest download (individual card PNG) ───────────────────
    const guestId = req.nextUrl.searchParams.get('guestId');
    if (guestId) {
      const inv = guests.find((g) => g.id === guestId);
      if (!inv) return apiError('GUEST_NOT_FOUND', 'Guest not found or has no code', undefined, 404);

      const redeemUrl = `${baseUrl}/i/${inv.code}`;
      const cardBuf = await generateInvitationCard({
        redeemUrl,
        guestName: inv.guestName,
        eventDate: event.date,
        templateUrl: event.templateUrl,
        format: 'png',
      });
      const safeName = inv.guestName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
      return new Response(cardBuf, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="${safeName}_${inv.code}.png"`,
          'Content-Length': String(cardBuf.length),
        },
      });
    }

    // ── All guests → ZIP ─────────────────────────────────────────────
    const chunks: Uint8Array[] = [];
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('data', (chunk) => chunks.push(chunk));

    const done = new Promise<void>((resolve, reject) => {
      archive.on('end', resolve);
      archive.on('error', reject);
    });

    for (const inv of guests) {
      try {
        const redeemUrl = `${baseUrl}/i/${inv.code}`;
        const cardBuf = await generateInvitationCard({
          redeemUrl,
          guestName: inv.guestName,
          eventDate: event.date,
          templateUrl: event.templateUrl,
          format: 'png',
        });
        const safeName = inv.guestName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
        archive.append(cardBuf, { name: `${safeName}_${inv.code}.png` });
      } catch (err) {
        console.error(`[download-cards] Error generating card for ${inv.id}:`, err);
      }
    }

    archive.finalize();
    await done;

    const zipBuffer = Buffer.concat(chunks);
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="event-${event.name.replace(/[^a-zA-Z0-9]/g, '_')}-cards.zip"`,
        'Content-Length': String(zipBuffer.length),
      },
    });
  } catch (e: any) {
    return apiError('DOWNLOAD_ERROR', String(e?.message || e), undefined, 500);
  }
}
