import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { processOfferImage } from '@/lib/offers/imagePipeline';

export const dynamic = 'force-dynamic';

function buildErrorResponse(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // In-memory concurrency guard map (global across requests in same process)
  const g: any = globalThis as any;
  if (!g.__offersImageLocks) g.__offersImageLocks = new Map<string, number>();
  const locks: Map<string, number> = g.__offersImageLocks;
  const key = params.id;

  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const auth = requireRole(session, ['ADMIN', 'STAFF']);
    if (!auth.ok) {
      return buildErrorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (locks.has(key)) {
      return buildErrorResponse('IMAGE_IN_PROGRESS', 'Image processing already in progress for this offer', 409);
    }
    locks.set(key, Date.now());

    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      locks.delete(key);
      return buildErrorResponse('MISSING_FILE', 'file field required', 400);
    }

    // Process the image
    let meta;
    try {
      meta = await processOfferImage(params.id, file);
    } finally {
      locks.delete(key); // always release lock
    }

    return NextResponse.json({ ok: true, meta });
  } catch (e: any) {
    // Ensure lock is cleared on unexpected errors
    locks.delete(key);
    const code = e?.code || 'INTERNAL';
    const http = e?.http || 500;
    const message = e?.message || String(e);
    return buildErrorResponse(code, message, http);
  }
}