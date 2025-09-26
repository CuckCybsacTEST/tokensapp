/*
  Daily cron helper: enables scheduled tokens for “today” (America/Lima)
  Usage:
    - Env: CRON_SECRET must match server env
    - Env: CRON_BASE_URL e.g. https://yourapp.up.railway.app (recommended)
    - Run: npm run -s cron:enable-tokens
*/
import { DateTime } from 'luxon';

async function main() {
  const base = process.env.CRON_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
  const secret = process.env.CRON_SECRET || '';
  if (!secret) {
    console.error('[cron] Missing CRON_SECRET env');
    process.exitCode = 1;
    return;
  }
  // Día de referencia (informativo; el endpoint puede inferirlo)
  const nowLimaIso = DateTime.now().setZone('America/Lima').toISO();
  const todayLima = String(nowLimaIso).slice(0, 10);

  const url = `${base.replace(/\/+$/, '')}/api/system/tokens/enable-scheduled`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': secret },
    // Podemos omitir “day” para que el endpoint use “hoy (Lima)” automáticamente
    body: JSON.stringify({}),
  });
  const txtCt = res.headers.get('content-type') || '';
  const payload = txtCt.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    console.error('[cron] Failed', res.status, payload);
    process.exitCode = 1;
    return;
  }
  console.log(`[cron] OK día ${todayLima} ->`, payload);
}

main().catch((e) => {
  console.error('[cron] Error', e);
  process.exitCode = 1;
});
