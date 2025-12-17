import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Date: 23/12/2025. We'll set it to the end of that day in local time (Lima is UTC-5) or just UTC.
  // Usually expiration dates are stored in UTC.
  // If the user says "23/12/2025", they probably mean it's valid *until* that day is over.
  // Let's set it to 2025-12-23 23:59:59.999 UTC-5 (Lima time) converted to UTC.
  // Or simpler: 2025-12-24 00:00:00 UTC minus 5 hours?
  // Let's stick to a safe "End of Day" in UTC to ensure it covers the day.
  // 2025-12-23T23:59:59.999Z is a safe bet for "expires on this date".
  
  const targetDate = new Date('2025-12-23T23:59:59.999-05:00'); // End of day Lima time approx, or just use ISO string.
  // Actually, let's use a fixed ISO string that represents the end of that day.
  // If the app uses UTC, 2025-12-24T04:59:59Z would be end of day in Lima (UTC-5).
  // But let's just use the date provided.
  
  const expiryDate = new Date('2025-12-23T23:59:59.999Z');

  console.log(`Updating all CustomQr tokens to expire at ${expiryDate.toISOString()}...`);

  const result = await prisma.customQr.updateMany({
    where: {
        // "de ese tipo" -> implies all CustomQr. 
        // If we wanted to be safer, we could filter by active ones, but "todos" implies all.
    },
    data: {
      expiresAt: expiryDate,
    },
  });

  console.log(`Successfully updated ${result.count} CustomQr tokens.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
