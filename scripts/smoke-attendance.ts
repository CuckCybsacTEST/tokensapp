// Smoke test for /api/admin/attendance/metrics
// Usage: tsx scripts/smoke-attendance.ts

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

  // Call metrics endpoint
  const url = base + '/api/admin/attendance/metrics?period=today';
  const m = await fetch(url, { headers: { cookie } });
  const j = await m.json().catch(() => null);
  if (!m.ok || !j?.ok) {
    console.error('METRICS FAIL', m.status, j);
    process.exit(1);
  }

  const unique = j.attendance?.uniquePersons;
  const totals = j.attendance?.totals;
  const series = j.series?.byDay || [];
  const seriesLen = series.length;
  const completedDaysPct = j.attendance?.completedDaysPct;
  const heat = j.attendance?.heatmapByHour || [];
  const nonZeroHours = heat.filter((h: any) => (h.in || 0) + (h.out || 0) > 0).map((h: any) => h.hour);
  console.log('uniquePersons =', unique);
  console.log('totals =', totals);
  console.log('completedDaysPct =', completedDaysPct);
  console.log('series.byDay.length =', seriesLen);
  if (seriesLen) {
    console.log('series first/last day =', series[0].day, '/', series[seriesLen-1].day);
  }
  console.log('heatmap non-zero hours (UTC) =', nonZeroHours);
}

main().catch((e) => { console.error(e); process.exit(1); });
