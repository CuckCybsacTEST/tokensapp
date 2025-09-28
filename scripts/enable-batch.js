// Enable all tokens of a given batch (set disabled=false)
// Usage: node scripts/enable-batch.js <batchId> [--dry]

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batchId = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!batchId) {
    console.error('Usage: node scripts/enable-batch.js <batchId> [--dry]');
    process.exit(1);
  }
  console.log('\n=== Enable Batch Tokens ===');
  console.log('Batch:', batchId);
  console.log('Dry-run:', dry);

  const totalInBatch = await prisma.token.count({ where: { batchId } });
  const currentlyDisabled = await prisma.token.count({ where: { batchId, disabled: true } });
  console.log('Total tokens in batch:', totalInBatch);
  console.log('Currently disabled:', currentlyDisabled);

  if (currentlyDisabled === 0) {
    console.log('No disabled tokens to update.');
    return;
  }

  if (dry) {
    console.log(`[DRY] Would update ${currentlyDisabled} tokens to disabled=false.`);
    return;
  }

  const res = await prisma.token.updateMany({ where: { batchId, disabled: true }, data: { disabled: false } });
  console.log('Updated tokens:', res.count);

  const remainingDisabled = await prisma.token.count({ where: { batchId, disabled: true } });
  console.log('Remaining disabled after update:', remainingDisabled);
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
