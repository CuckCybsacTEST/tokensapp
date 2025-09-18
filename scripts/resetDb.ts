import { existsSync, rmSync } from 'fs';
import { execSync } from 'node:child_process';

const dbPath = 'prisma/dev.db';

function run(cmd: string) {
  execSync(cmd, { stdio: 'inherit' });
}

(function main() {
  const withSeed = process.argv.includes('--seed');
  if (existsSync(dbPath)) {
    rmSync(dbPath);
    console.log(`[reset:db] Removed ${dbPath}`);
  } else {
    console.log('[reset:db] No existing dev.db (skip remove)');
  }
  console.log('[reset:db] prisma db push');
  run('npm run db:push');
  if (withSeed) {
    console.log('[reset:db] seeding');
    run('npm run seed');
  }
  console.log('[reset:db] Done');
})();
