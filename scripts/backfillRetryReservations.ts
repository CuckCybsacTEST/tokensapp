import { createSessionCookie } from '../src/lib/auth';

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function attempt(url: string, cookie: string) {
  console.log('[backfill] POST', url);
  const res = await fetch(url, { method: 'POST', headers: { Cookie: 'admin_session=' + cookie } });
  const text = await res.text();
  console.log('[backfill] status', res.status);
  console.log('[backfill] body', text);
  return res.ok;
}

async function main() {
  const cookie = await createSessionCookie('ADMIN');
  const urls = [
    'http://127.0.0.1:3000/api/admin/tokens/backfill-retry-reservations',
    'http://localhost:3000/api/admin/tokens/backfill-retry-reservations'
  ];
  const MAX_RETRIES = 5;
  for (let i = 0; i < MAX_RETRIES; i++) {
    for (const u of urls) {
      try {
        const ok = await attempt(u, cookie);
        if (ok) return;
      } catch (e) {
        console.log('[backfill] attempt failed', (e as any)?.message);
      }
    }
    console.log(`[backfill] retry #${i+1} in 1s...`);
    await delay(1000);
  }
  console.error('[backfill] all attempts failed');
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
