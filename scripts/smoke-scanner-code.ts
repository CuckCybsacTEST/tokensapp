/*
  Smoke test para el flujo por código:
  - Selecciona una persona de la DB (por code)
  - Hace login admin (dev)
  - POST /api/scanner/scan con { code, type: 'IN' }
*/
import { prisma } from '@/lib/prisma';

async function main() {
  const base = process.env.SMOKE_URL || 'http://localhost:3000';

  // Tomar la primera persona activa
  const rows: any[] = await prisma.$queryRawUnsafe(`SELECT code FROM Person WHERE active=1 ORDER BY createdAt ASC LIMIT 1`);
  if (!rows || rows.length === 0) {
    console.error('No hay personas activas. Ejecuta: npm run seed');
    process.exit(2);
  }
  const code = rows[0].code as string;
  console.log('Usando code =', code);

  // Login (dev users)
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin-admin' }),
  });
  console.log('login status', loginRes.status);
  if (!loginRes.ok) {
    console.error('Login falló');
    process.exit(1);
  }
  const setCookie = loginRes.headers.get('set-cookie') || '';
  const cookie = setCookie.split(';')[0];

  // POST scan por código
  const scanRes = await fetch(`${base}/api/scanner/scan`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ code, type: 'IN', deviceId: 'smoke-code' }),
  });
  console.log('scan status', scanRes.status);
  const txt = await scanRes.text();
  console.log(txt);
}

main().finally(() => prisma.$disconnect());
