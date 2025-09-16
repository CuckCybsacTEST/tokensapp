// Backward-compat: delegate to /api/system/tokens/toggle
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const enabled = !!body.enabled;
    // Re-POST to the canonical toggle endpoint
    const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/system/tokens/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: (req.headers as any).get?.('cookie') || '' },
      body: JSON.stringify({ enabled })
    } as any);
    const text = await r.text();
    return new NextResponse(text, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}
