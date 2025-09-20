export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from '@/lib/auth';
import { restoreFromZipBuffer } from '@/server/restoreFromZip';

export async function POST(req: Request) {
  try {
    const raw = getSessionCookieFromRequest(req);
    const session = await verifySessionCookie(raw);
    const ok = requireRole(session, ['ADMIN']);
    if (!ok.ok) return NextResponse.json({ ok: false, code: ok.error || 'UNAUTHORIZED' }, { status: 401 });

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, error: 'CONTENT_TYPE' }, { status: 400 });
    }

    const form = await req.formData();
    const files = form.getAll('file');
    if (!files.length) return NextResponse.json({ ok: false, error: 'NO_FILE' }, { status: 400 });

    const results: any[] = [];
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const ab = await f.arrayBuffer();
      const buf = Buffer.from(ab);
      try {
        const res = await restoreFromZipBuffer(buf);
        results.push({ name: f.name, ...res });
      } catch (e: any) {
        results.push({ name: f.name, error: e?.message || 'RESTORE_FAILED' });
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error('admin restore POST error', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
