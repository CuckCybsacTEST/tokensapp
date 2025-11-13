// Minimal smoke to test birthdays reservation flow end-to-end against a running dev server.
// Uses PORT from env (defaults 3003) and creates a test reservation, then generates tokens.

const BASE = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3003}`;

async function main() {
  const date = new Date();
  date.setDate(date.getDate() + 2); // two days ahead
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const ymd = `${y}-${m}-${d}`;

  console.log('[smoke] Base URL:', BASE);

  // 1) Fetch packs to pick a valid packId
  const packsRes = await fetch(`${BASE}/api/birthdays/packs`).catch((e) => ({ ok:false, statusText: String(e) } as any));
  if (!('ok' in packsRes) || !packsRes.ok) {
    throw new Error(`[smoke] packs fetch failed: ${packsRes && (packsRes as any).status} ${(packsRes as any).statusText || ''}`);
  }
  const packsJson = await packsRes.json();
  const packs = packsJson?.packs || [];
  if (!Array.isArray(packs) || packs.length === 0) throw new Error('[smoke] no packs returned');
  const packId = packs[0].id;
  console.log('[smoke] Using packId:', packId, 'name:', packs[0].name);

  // 2) Create reservation
  const dni = String(Math.floor(10000000 + Math.random() * 89999999)); // random 8-digit DNI
  const payload = {
    celebrantName: 'Smoke Test User',
    phone: '999888777',
    documento: dni,
    email: 'smoke@example.com',
    date: ymd,
    timeSlot: '20:00',
    packId,
    guestsPlanned: packs[0]?.qrCount || 5,
  };

  const createRes = await fetch(`${BASE}/api/birthdays/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((e) => ({ ok:false, statusText: String(e) } as any));

  if (!('ok' in createRes) || !createRes.ok) {
    const txt = (createRes as any).statusText || '';
    throw new Error(`[smoke] reservation create failed: ${(createRes as any).status} ${txt}`);
  }
  const created = await createRes.json();
  if (!created?.ok || !created?.id || !created?.clientSecret) throw new Error('[smoke] invalid create response');
  console.log('[smoke] Created reservation:', created.id);

  // 3) Generate tokens
  const genRes = await fetch(`${BASE}/api/birthdays/reservations/${created.id}/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientSecret: created.clientSecret }),
  }).catch((e) => ({ ok:false, statusText: String(e) } as any));

  if (!('ok' in genRes) || !genRes.ok) {
    const txt = (genRes as any).statusText || '';
    throw new Error(`[smoke] tokens generate failed: ${(genRes as any).status} ${txt}`);
  }
  const gen = await genRes.json();
  if (!gen?.ok || !Array.isArray(gen?.items) || gen.items.length === 0) throw new Error('[smoke] no tokens returned');
  console.log(`[smoke] Generated ${gen.items.length} tokens. Host present:`, gen.items.some((t:any) => t.kind === 'host'));

  console.log('[smoke] OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
