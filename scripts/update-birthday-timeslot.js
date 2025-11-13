#!/usr/bin/env node
/*
  Update timeSlot for BirthdayReservation by celebrant names.
  Usage (PowerShell):
    # Dry-run (default):
    node scripts/update-birthday-timeslot.js

    # Execute update:
    $env:DRY_RUN="0"; node scripts/update-birthday-timeslot.js; Remove-Item Env:DRY_RUN

    # Custom names/time:
    $env:NAMES='["Gian Yurivilca","Adacely Calixto"]'; $env:TARGET_TIME='23:00'; node scripts/update-birthday-timeslot.js

  Notes:
    - Requires DATABASE_URL in environment.
    - By default, filters out status 'canceled' and 'completed'.
*/

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseEnvJSON(name, fallback) {
  try {
    if (!process.env[name]) return fallback;
    return JSON.parse(process.env[name]);
  } catch {
    return fallback;
  }
}

(async () => {
  const DRY_RUN = process.env.DRY_RUN !== '0';
  const TARGET_TIME = process.env.TARGET_TIME || '23:00';
  const DEFAULT_NAMES = ['Gian Yurivilca', 'Adacely Calixto'];
  const NAMES = parseEnvJSON('NAMES', DEFAULT_NAMES);

  console.log('--- Update BirthdayReservation timeSlot ---');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('Names:', NAMES);
  console.log('Target timeSlot:', TARGET_TIME);
  console.log('Dry run:', DRY_RUN);

  try {
    const items = await prisma.birthdayReservation.findMany({
      where: {
        celebrantName: { in: NAMES },
        // Avoid touching finished/canceled
        NOT: { status: { in: ['canceled', 'completed'] } },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, celebrantName: true, date: true, timeSlot: true, status: true },
    });

    if (!items.length) {
      console.log('No matching reservations found.');
      process.exit(0);
    }

    console.log('Found reservations:');
    for (const it of items) {
      console.log(`- ${it.id} | ${it.celebrantName} | ${new Date(it.date).toISOString()} | ${it.timeSlot} | ${it.status}`);
    }

    if (DRY_RUN) {
      console.log('\nDry-run mode: no changes applied.');
      await prisma.$disconnect();
      process.exit(0);
    }

    console.log(`\nApplying updates to timeSlot='${TARGET_TIME}'...`);
    let updated = 0;
    for (const it of items) {
      if (it.timeSlot === TARGET_TIME) {
        console.log(`Skip (already ${TARGET_TIME}): ${it.id} (${it.celebrantName})`);
        continue;
      }
      await prisma.birthdayReservation.update({
        where: { id: it.id },
        data: { timeSlot: TARGET_TIME },
      });
      updated++;
      console.log(`Updated: ${it.id} (${it.celebrantName}) ${it.timeSlot} -> ${TARGET_TIME}`);
    }

    console.log(`\nDone. Updated ${updated} of ${items.length} reservations.`);
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
