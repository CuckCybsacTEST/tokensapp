import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const prizeId = 'cmq71s3ri01qbnguqbgtct7pu';
  const oldLabel = '(NUEVO) JAGERMEISTER COLD BREW COFFE + HIELO \u2014 s/110.00';
  const newLabel = '(NUEVO) JAGERMEISTER COLD BREW COFFE + HIELO \u2014 s/119.00';

  // Verify current state
  const prize = await prisma.prize.findUnique({ where: { id: prizeId } });
  if (!prize) {
    console.error('Prize not found!');
    return;
  }
  if (prize.label !== oldLabel) {
    console.error('Label mismatch! Current label:', prize.label);
    return;
  }

  // Update the prize label
  const updated = await prisma.prize.update({
    where: { id: prizeId },
    data: { label: newLabel },
  });

  console.log('Updated prize:');
  console.log('  ID:', updated.id);
  console.log('  Key:', updated.key);
  console.log('  Old label:', oldLabel);
  console.log('  New label:', updated.label);
  console.log('\nDone. 20 tokens now show the new price.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
