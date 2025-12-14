import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/apiError';
import { checkRateLimit } from '@/lib/rateLimit';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { getUserSessionCookieFromRequest, verifyUserSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateQrPngDataUrl } from '@/lib/qr';
import { composeTemplateWithQr } from '@/lib/print/compose';
import { createZipStream } from '@/lib/zip';
import path from 'path';
import os from 'os';
import { writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { getBirthdayQrBaseUrl } from '@/lib/config';
import { supabaseAdmin } from '@/lib/supabase';

const QuerySchema = z.object({
  templateId: z.string().optional(),
  // optional limits
  max: z.coerce.number().int().min(1).max(5000).optional(),
});

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = dataUrl.match(/^data:(.*?);base64,(.+)$/);
  if (!m) throw new Error('INVALID_DATA_URL');
  return Buffer.from(m[2], 'base64');
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Authn/Authz
  const adminCookie = getSessionCookieFromRequest(req as unknown as Request);
  const userCookie = getUserSessionCookieFromRequest(req as unknown as Request);
  const adminSession = await verifySessionCookie(adminCookie);
  const userSession = await verifyUserSessionCookie(userCookie);
  const session = adminSession || userSession;
  if (!session) return apiError('UNAUTHORIZED', 'No session', undefined, 401);
  // Allow ADMIN/STAFF from admin session, or COLLAB/STAFF from user session
  const isAdmin = adminSession?.role && ['ADMIN', 'STAFF'].includes(adminSession.role);
  const isUser = userSession?.role && ['COLLAB', 'STAFF'].includes(userSession.role);
  if (!isAdmin && !isUser) return apiError('FORBIDDEN', 'Insufficient permissions', undefined, 403);

  // RL: protect heavy export
  const ip = req.headers.get('x-forwarded-for') || (req as any).ip || 'unknown';
  const rl = checkRateLimit(`admin:birthdays:cards:${ip}`);
  if (!rl.ok) return apiError('RATE_LIMITED', 'Too many requests', undefined, 429, { 'Retry-After': String(rl.retryAfterSeconds) });

  // Parse query
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    templateId: searchParams.get('templateId') || undefined,
    max: searchParams.get('max') || undefined,
  });
  if (!parsed.success) return apiError('INVALID_QUERY', 'Validation failed', parsed.error.flatten(), 400);
  const limit = parsed.data.max ?? 2000;

  // Fetch reservation and tokens
  const reservationId = params.id;
  const reservation = await prisma.birthdayReservation.findUnique({ where: { id: reservationId }, include: { pack: true } });
  if (!reservation) return apiError('NOT_FOUND', 'Reservation not found', undefined, 404);

  const tokens = await prisma.inviteToken.findMany({ where: { reservationId }, orderBy: { code: 'asc' } });
  if (!tokens.length) return apiError('NO_TOKENS', 'No invite tokens for this reservation', undefined, 404);

  // Expect: one 'host' and one 'guest' token in new model. Back-compat: if there are many guests, fallback to old behavior.
  const host = tokens.find(t => t.kind === 'host');
  const guest = tokens.find(t => t.kind === 'guest');

  // Resolve print template
  let template = null as null | { id: string; filePath: string | null; storageUrl: string | null; storageKey: string | null; meta: string | null };
  if (parsed.data.templateId) {
    template = await prisma.printTemplate.findUnique({ where: { id: parsed.data.templateId }, select: { id: true, filePath: true, storageUrl: true, storageKey: true, meta: true } });
  } else {
    // use latest template as default
    template = await prisma.printTemplate.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true, filePath: true, storageUrl: true, storageKey: true, meta: true } });
  }
  if (!template) return apiError('NO_TEMPLATE', 'No print template configured', undefined, 400);

  // Resolve template path - prefer Supabase URL, fallback to local file
  let templatePath: string;
  let tempTemplatePath: string | null = null;

  if (template.storageUrl) {
    // Download from Supabase
    console.log('Downloading template from Supabase:', template.storageUrl);
    const response = await fetch(template.storageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download template from Supabase: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    tempTemplatePath = path.join(os.tmpdir(), `template-${randomUUID()}.png`);
    await writeFile(tempTemplatePath, new Uint8Array(arrayBuffer));
    templatePath = tempTemplatePath;
  } else if (template.filePath) {
    // Use local file (compatibility)
    templatePath = path.resolve(process.cwd(), template.filePath.startsWith('public/') ? template.filePath : `public/templates/${template.filePath}`);
  } else {
    return apiError('TEMPLATE_FILE_NOT_FOUND', 'No template file available', undefined, 400);
  }

  console.log('Using template path:', templatePath);
  let dpi = 300;
  let qrMeta = { xMm: 150, yMm: 230, widthMm: 30, rotationDeg: 0 } as { xMm: number; yMm: number; widthMm: number; rotationDeg?: number };
  if (template.meta) {
    try {
      const meta = JSON.parse(template.meta);
      if (meta.dpi) dpi = meta.dpi;
      if (meta.qr) qrMeta = meta.qr;
    } catch {
      // ignore bad meta
    }
  }

  // Create ZIP streaming
  const { archive, stream } = createZipStream();

  // Start async composition and append to archive
  (async () => {
    try {
      const baseUrl = getBirthdayQrBaseUrl(req.url);
      if (host && guest) {
        // 1 host card
  const hostUrl = `${baseUrl}/b/${encodeURIComponent(host.code)}`;
        const hostDataUrl = await generateQrPngDataUrl(hostUrl);
        const hostBuf = dataUrlToBuffer(hostDataUrl);
        const hostPng = await composeTemplateWithQr({ templatePath, qrBuffer: hostBuf, qrMetadata: qrMeta, dpi });
        archive.append(hostPng, { name: `invite-host-${host.code}.png` });

        // N guest copies (limited by 'limit')
        const maxCopies = Math.min(limit, (guest as any).maxUses || reservation.pack.qrCount || 1);
        for (let i = 1; i <= maxCopies; i++) {
          const guestUrl = `${baseUrl}/b/${encodeURIComponent(guest.code)}`;
          const guestDataUrl = await generateQrPngDataUrl(guestUrl);
          const guestBuf = dataUrlToBuffer(guestDataUrl);
          const guestPng = await composeTemplateWithQr({ templatePath, qrBuffer: guestBuf, qrMetadata: qrMeta, dpi });
          archive.append(guestPng, { name: `invite-guest-${guest.code}-${i.toString().padStart(2,'0')}.png` });
        }
      } else {
        // Legacy fallback: print all tokens individually
        const tokensSlice = tokens.slice(0, limit);
        for (const t of tokensSlice) {
          const redeemUrl = `${baseUrl}/b/${encodeURIComponent(t.code)}`;
          const dataUrl = await generateQrPngDataUrl(redeemUrl);
          const qrBuf = dataUrlToBuffer(dataUrl);
          const composed = await composeTemplateWithQr({ templatePath, qrBuffer: qrBuf, qrMetadata: qrMeta, dpi });
          const filename = `invite-${t.code}.png`;
          archive.append(composed, { name: filename });
        }
      }
      await archive.finalize();
    } catch (e) {
      archive.emit('error', e as any);
    } finally {
      // Clean up temp template file
      if (tempTemplatePath) {
        try {
          await unlink(tempTemplatePath);
        } catch (cleanupError) {
          console.warn('Error cleaning up temp template file:', cleanupError);
        }
      }
    }
  })();

  const headers = new Headers({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="reservation-${reservationId}-invites.zip"`,
  });
  return new NextResponse(stream as any, { status: 200, headers });
}
