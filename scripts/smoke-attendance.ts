// Smoke test para /api/admin/attendance/table (endpoint de métricas eliminado)
// Uso: tsx scripts/smoke-attendance.ts

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3000';
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin-admin';

  // Login admin to get cookie
  const r = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: adminUser, password: adminPass }),
    redirect: 'manual',
  });
  if (!r.ok) {
    const t = await r.text();
    console.error('LOGIN FAIL', r.status, t);
    process.exit(1);
  }
  const setCookie = r.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];

  // Call table endpoint
  const url = base + '/api/admin/attendance/table?period=today&page=1&pageSize=5';
  const resp = await fetch(url, { headers: { cookie } });
  const j = await resp.json().catch(() => null);
  if (!resp.ok || !j?.ok) {
    console.error('TABLE FAIL', resp.status, j);
    process.exit(1);
  }
  console.log('Filas recibidas:', j.rows?.length, 'Total:', j.total);
  if (j.rows?.length) {
    console.log('Primera fila ejemplo:', j.rows[0]);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
