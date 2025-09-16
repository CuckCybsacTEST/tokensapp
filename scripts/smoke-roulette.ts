import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('--- Smoke Roulette Start ---');
  // Limpieza rápida (solo entorno dev)
  await prisma.$executeRawUnsafe('DELETE FROM RouletteSpin');
  await prisma.$executeRawUnsafe('DELETE FROM RouletteSession');
  await prisma.token.deleteMany();
  await prisma.prize.deleteMany({ where: { key: { in: ['smokeA','smokeB'] } } });
  // Crear premio simple
  const prizeA = await prisma.prize.create({ data: { key: 'smokeA', label: 'Smoke A', active: true } });
  const prizeB = await prisma.prize.create({ data: { key: 'smokeB', label: 'Smoke B', active: true } });
  const batch = await prisma.batch.create({ data: { description: 'smoke batch' } });
  const expiresAt = new Date(Date.now() + 60_000);
  // 2 tokens A, 1 token B (total 3)
  await prisma.token.createMany({ data: [
    { prizeId: prizeA.id, batchId: batch.id, expiresAt, signature: 's', signatureVersion: 1 },
    { prizeId: prizeA.id, batchId: batch.id, expiresAt, signature: 's', signatureVersion: 1 },
    { prizeId: prizeB.id, batchId: batch.id, expiresAt, signature: 's', signatureVersion: 1 },
  ]});

  // Esperar a que el servidor responda
  for (let attempt=1; attempt<=10; attempt++) {
    try {
      const ping = await fetch('http://localhost:3000/api/prizes');
      if (ping.ok) break;
    } catch {}
    await new Promise(r=>setTimeout(r, 200*attempt));
    if (attempt===10) throw new Error('Server not responding');
  }

  // Crear sesión BY_TOKEN (3 tokens ≤12) con reintentos si el servidor aún no está listo
  let createRes: Response | null = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      createRes = await fetch(`http://localhost:3000/api/roulette?mode=token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ batchId: batch.id }),
      });
      break;
    } catch (e) {
      if (attempt === 5) throw e;
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
  if (!createRes) throw new Error('No response creating roulette');
  const createJson = await createRes.json();
  console.log('Create session status', createRes.status, createJson);
  if (createRes.status !== 201) throw new Error('Failed to create roulette session');
  const sessionId = createJson.sessionId;

  // Spins hasta fin
  let spins = 0;
  while (true) {
    const spinRes = await fetch(`http://localhost:3000/api/roulette/${sessionId}`, { method: 'POST' });
    const body = await spinRes.json();
    console.log('Spin', spinRes.status, body);
    if (spinRes.status === 200) {
      spins++;
      if (body.finished) break;
    } else if (spinRes.status === 409 && body.error === 'FINISHED') {
      break;
    } else {
      throw new Error('Unexpected spin response');
    }
    if (spins > 10) throw new Error('Loop runaway');
  }
  console.log('Total spins', spins);
  const session = await fetch(`http://localhost:3000/api/roulette/${sessionId}`);
  console.log('Final session', await session.json());
  console.log('--- Smoke Roulette End ---');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
