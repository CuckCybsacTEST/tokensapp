import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Target: End of day December 23, 2025 in Lima (UTC-5)
  // 2025-12-23 23:59:59.999 -05:00
  // In UTC: 2025-12-24 04:59:59.999 Z
  
  const expiryDate = new Date('2025-12-24T04:59:59.999Z');

  console.log(`Updating CustomQrPolicy to set defaultExpiryDate to ${expiryDate.toISOString()} (Lima: 2025-12-23 23:59:59)...`);

  // Update all policies or just the active one?
  // User said "ajusta la politica actual" (singular) but also "todo lo que se genere a partir de ahora".
  // It's safer to update all active policies, or just the one marked as active.
  // Let's update all active policies to be sure.
  
  const result = await prisma.customQrPolicy.updateMany({
    where: {
      isActive: true
    },
    data: {
      defaultExpiryDate: expiryDate,
    },
  });

  console.log(`Successfully updated ${result.count} active CustomQrPolicy records.`);
  
  // Also check if there are any policies that are not active but might be used?
  // Usually only active ones are used.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
