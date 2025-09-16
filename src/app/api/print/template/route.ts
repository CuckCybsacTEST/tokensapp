import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

let prisma: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const p = require('@/lib/prisma');
  prisma = p?.prisma ?? p?.default ?? p;
} catch (e) {
  prisma = null;
}

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const roleCheck = requireRole(session, ['ADMIN']);
    if (!roleCheck.ok) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    // Expect a multipart/form-data request with fields: file (image) and meta (JSON string)
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'INVALID_CONTENT_TYPE' }, { status: 400 });
    }

    // Use formidable-like parsing is not available here; use a simple approach by
    // delegating to the Web API FormData parsing via request.formData() (Node 18+ / Next.js).
    const formData = await (req as any).formData();
    const file = formData.get('file') as any;
    const metaStr = String(formData.get('meta') || '{}');
    if (!file || !file.stream) return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 });

    // Validate MIME and size. Use max 5MB.
    const MAX_BYTES = 5 * 1024 * 1024;
    const mime = file.type || '';
    if (!/image\/(png|jpeg|jpg)/.test(mime)) return NextResponse.json({ error: 'INVALID_IMAGE_TYPE' }, { status: 400 });
    const contentLength = Number(req.headers.get('content-length') || '0');
    if (contentLength && contentLength > MAX_BYTES) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 });

    // Read into array buffer then sanitize with sharp: resize if very large and re-encode as PNG
    const stream = file.stream();
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        if (received > MAX_BYTES) return NextResponse.json({ error: 'FILE_TOO_LARGE' }, { status: 400 });
        chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
      }
    }
    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { buf.set(c, offset); offset += c.length; }

    // sanitize via sharp
    let outBuf: Buffer;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const sharp = require('sharp');
      const img = sharp(Buffer.from(buf));
      const meta = await img.metadata();
      const maxDim = Math.max(meta.width || 0, meta.height || 0);
      if (maxDim > 2400) {
        // scale down proportionally
        outBuf = await img.resize({ width: 2400, height: 2400, fit: 'inside' }).png().toBuffer();
      } else {
        outBuf = await img.png().toBuffer();
      }
    } catch (e: any) {
      console.error('image sanitize failed', e);
      return NextResponse.json({ error: 'INVALID_IMAGE' }, { status: 400 });
    }

    const filename = `template_${Date.now()}.png`;
    const outDir = path.resolve(process.cwd(), 'public', 'templates');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
  fs.writeFileSync(outPath, new Uint8Array(outBuf));

    // create DB record if prisma available
    let created: any = null;
    if (prisma) {
      try {
        created = await prisma.printTemplate.create({ data: { name: filename, filePath: `public/templates/${filename}`, meta: metaStr } });
      } catch (e) {
        // ignore DB error but report
        console.error('print template create failed', e);
      }
    }

    return NextResponse.json({ ok: true, templateId: created?.id ?? filename, filePath: `public/templates/${filename}` });
  } catch (e: any) {
    console.error('upload template error', e);
    return NextResponse.json({ error: 'UPLOAD_FAILED', detail: e?.message }, { status: 500 });
  }
}

// No default export; using named export `POST` for App Router
