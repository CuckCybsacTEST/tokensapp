import { PrismaClient } from '@prisma/client';

async function checkUserStatus() {
  const prisma = new PrismaClient();

  try {
    // Find person with DNI 71035458
    const person = await prisma.person.findFirst({
      where: { dni: '71035458' },
      include: { user: true }
    });

    if (!person) {
      console.log('Person with DNI 71035458 not found');
      return;
    }

    console.log('=== PERSON DATA ===');
    console.log('ID:', person.id);
    console.log('Name:', person.name);
    console.log('DNI:', person.dni);
    console.log('Area:', person.area);

    if (person.user) {
      console.log('\n=== USER DATA ===');
      console.log('ID:', person.user.id);
      console.log('Username:', person.user.username);
      console.log('Role:', person.user.role);

      // Check if user has staff record
      const staff = await prisma.staff.findUnique({
        where: { userId: person.user.id }
      });

      console.log('\n=== STAFF RECORD ===');
      if (staff) {
        console.log('ID:', staff.id);
        console.log('Role:', staff.role);
        console.log('Active:', staff.active);
        console.log('Zones:', staff.zones);
      } else {
        console.log('No staff record found');
      }
    } else {
      console.log('No user associated with this person');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserStatus();