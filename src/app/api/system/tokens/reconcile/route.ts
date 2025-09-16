import { NextResponse } from 'next/server';
import { reconcileOnce } from '@/lib/scheduler';

/**
 * Protected endpoint for triggering a one-time reconciliation. Requires header:
 *   x-scheduler-token: <SCHEDULER_TOKEN env value>
 */
export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-scheduler-token') || '';
    const expected = process.env.SCHEDULER_TOKEN || '';
    if (!expected || token !== expected) {
      return NextResponse.json({ ok: false, error: 'forbidden', message: 'Invalid scheduler token' }, { status: 403 });
    }

    const res = await reconcileOnce();
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'reconcile_failed', details: res.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, computed: res.computed });
  } catch (e: any) {
    console.error('reconcile endpoint error', e);
    return NextResponse.json({ ok: false, error: 'internal_server_error', message: String(e?.message || e) }, { status: 500 });
  }
}
