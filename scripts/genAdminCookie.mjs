import { createSessionCookie } from '../src/lib/auth.ts';

const roleArg = (process.argv[2] || '').toUpperCase();
const role = roleArg === 'STAFF' ? 'STAFF' : 'ADMIN';
const cookie = await createSessionCookie(role);
console.log(`admin_session=${cookie}`);
