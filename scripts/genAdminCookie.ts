import { createUserSessionCookie } from '../src/lib/auth';

async function main() {
  const roleArg = process.argv[2]?.toUpperCase();
  const role = roleArg === 'STAFF' ? 'STAFF' : 'ADMIN';
  const cookie = await createUserSessionCookie('admin-user', role as any);
  // Output in a ready to use header line
  console.log(`admin_session=${cookie}`);
  console.log('\nCopy the above string and use it as the Cookie header, e.g.');
  console.log(`curl -H "Cookie: admin_session=${cookie}" http://localhost:3000/api/system/tokens/status`);
}

main().catch(e => { console.error(e); process.exit(1); });
