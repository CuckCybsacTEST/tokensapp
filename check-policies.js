import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPolicies() {
  try {
    const activePolicies = await prisma.customQrPolicy.findMany({
      where: { isActive: true }
    });
    console.log('Active policies:', activePolicies);

    const allPolicies = await prisma.customQrPolicy.findMany();
    console.log('All policies:', allPolicies.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPolicies();