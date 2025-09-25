import { createSessionCookie } from '@/lib/auth';

async function main() {
  const cookie = await createSessionCookie('ADMIN');
  const url = process.argv[2] || 'http://localhost:3000/api/admin/attendance/table?period=today&page=1&pageSize=20';
  const res = await fetch(url, { headers: { cookie: `admin_session=${cookie}` } });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text);
}

main().catch((e) => {
  console.error('Error running diag:', e);
  process.exit(1);
});
