import { PrismaClient } from '@prisma/client';
import { mapAreaToStaffRole } from '../src/lib/staff-roles';

async function fixStaffRecord() {
  const prisma = new PrismaClient();

  try {
    // Find person with DNI 71035458
    const person = await prisma.person.findFirst({
      where: { dni: '71035458' },
      include: { user: true }
    });

    if (!person?.user) {
      console.log('User not found');
      return;
    }

    const currentArea = person.area;
    const correctRole = mapAreaToStaffRole(currentArea as any);

    console.log(`User area: ${currentArea}`);
    console.log(`Correct role should be: ${correctRole}`);

    // Update staff record
    const updated = await prisma.staff.update({
      where: { userId: person.user.id },
      data: { role: correctRole! }
    });

    console.log('Staff record updated:', {
      id: updated.id,
      role: updated.role,
      active: updated.active
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixStaffRecord();