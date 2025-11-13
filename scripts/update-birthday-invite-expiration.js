#!/usr/bin/env node
/*
  Update InviteToken.expiresAt by code to specific local time (23:45 today by default).

  Usage (PowerShell):
    # Dry-run (default):
    node scripts/update-birthday-invite-expiration.js --code pZY8qgn7zA

    # Apply changes:
    $env:DRY_RUN="0"; node scripts/update-birthday-invite-expiration.js --code pZY8qgn7zA --time 23:45; Remove-Item Env:DRY_RUN

  Options:
    --code <string>     Invite token code (required)
    --date <YYYY-MM-DD> Optional date (local). Defaults to today.
    --time <HH:MM>      Optional time (24h). Defaults to 23:45.

  Notes:
    - Loads .env.local automatically for DATABASE_URL.
*/

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--code') out.code = args[++i];
    else if (a === '--date') out.date = args[++i];
    else if (a === '--time') out.time = args[++i];
  }
  return out;
}

function makeExpiresAtLocal(dateStr, timeStr) {
  const now = new Date();
  const [hh, mm] = (timeStr || '23:45').split(':').map(Number);
  let y, m, d;
  if (dateStr) {
    const m2 = /^\d{4}-\d{2}-\d{2}$/.exec(dateStr) ? dateStr.split('-').map(Number) : null;
    if (!m2) throw new Error('Invalid --date format, expected YYYY-MM-DD');
    y = m2[0]; m = m2[1] - 1; d = m2[2];
  } else {
    y = now.getFullYear(); m = now.getMonth(); d = now.getDate();
  }
  const local = new Date(y, m, d, hh, mm, 0, 0);
  return local;
}

(async () => {
  const DRY_RUN = process.env.DRY_RUN !== '0';
  const { code, date, time } = parseArgs();
  if (!code) {
    console.error('Missing --code');
    process.exit(1);
  }

  console.log('--- Update InviteToken.expiresAt ---');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('code:', code);
  const target = makeExpiresAtLocal(date, time || '23:45');
  console.log('target expiresAt (local):', target.toString());

  try {
    const token = await prisma.inviteToken.findUnique({
      where: { code },
      select: { id: true, code: true, expiresAt: true, reservationId: true }
    });
    if (!token) {
      console.log('InviteToken not found for code');
      process.exit(1);
    }
    console.log('Current expiresAt:', token.expiresAt ? new Date(token.expiresAt).toString() : 'null');

    if (DRY_RUN) {
      console.log('Dry-run: no changes applied.');
      process.exit(0);
    }

    const updated = await prisma.inviteToken.update({
      where: { code },
      data: { expiresAt: target },
      select: { id: true, code: true, expiresAt: true }
    });
    console.log('Updated expiresAt:', new Date(updated.expiresAt).toString());
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
