#!/usr/bin/env node
/*
  Mark birthday reservation arrivals:
  - Set hostArrivedAt to now (local time)
  - Set guestArrivals to guestsPlanned or a provided number

  Usage (PowerShell):
    # Dry-run (default):
    node scripts/birthday-arrival-mark.js --name "Gian Yurivilca"

    # Apply changes (host arrived now, guests to 5):
    $env:DRY_RUN="0"; node scripts/birthday-arrival-mark.js --name "Gian Yurivilca" --guests 5; Remove-Item Env:DRY_RUN

  Options:
    --name <string>   Celebrant name (exact match)
    --guests <int>    Number of guest arrivals to set (defaults to guestsPlanned)
    --id <string>     Use reservation id directly instead of name

  Notes:
    - Loads DATABASE_URL from .env.local
    - Skips canceled reservations
*/

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--name') out.name = args[++i];
    else if (a === '--guests') out.guests = Number(args[++i]);
    else if (a === '--id') out.id = args[++i];
  }
  return out;
}

(async () => {
  const DRY_RUN = process.env.DRY_RUN !== '0';
  const { name, guests, id } = parseArgs();
  if (!name && !id) {
    console.error('Missing --name or --id');
    process.exit(1);
  }
  console.log('--- Mark birthday arrival ---');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('Target:', id ? `id=${id}` : `name=${name}`);

  try {
    const where = id ? { id } : { celebrantName: name };
    const r = await prisma.birthdayReservation.findFirst({
      where: { ...where, NOT: { status: 'canceled' } },
      select: { id: true, celebrantName: true, status: true, guestsPlanned: true, hostArrivedAt: true, guestArrivals: true }
    });
    if (!r) {
      console.log('Reservation not found.');
      process.exit(1);
    }

    console.log('Before:', r);
    const newGuestArrivals = Number.isFinite(guests) ? guests : (r.guestsPlanned || 0);
    const data = {
      hostArrivedAt: new Date(),
      guestArrivals: newGuestArrivals,
    };

    if (DRY_RUN) {
      console.log('Planned update:', data);
      process.exit(0);
    }

    const updated = await prisma.birthdayReservation.update({ where: { id: r.id }, data, select: { id: true, hostArrivedAt: true, guestArrivals: true } });
    console.log('After:', updated);
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
