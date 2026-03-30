import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find the person by code
  const person = await prisma.person.findUnique({
    where: { code: '42459672' }
  })

  if (!person) {
    console.log('Person not found with code 42459672')
    return
  }

  console.log('Found person:', person.name, 'ID:', person.id)

  // Check if there's already an OUT scan for this business day
  const existingOut = await prisma.scan.findFirst({
    where: {
      personId: person.id,
      businessDay: '2026-03-28',
      type: 'OUT'
    }
  })

  if (existingOut) {
    console.log('OUT scan already exists for this day:', existingOut)
    return
  }

  // Insert the OUT scan at 5:15 AM Lima time (10:15 AM UTC)
  const scan = await prisma.scan.create({
    data: {
      personId: person.id,
      scannedAt: new Date('2026-03-28T10:15:00.000Z'),
      type: 'OUT',
      businessDay: '2026-03-28'
    }
  })

  console.log('OUT scan created successfully:', scan)
}

main().catch(console.error).finally(() => prisma.$disconnect())