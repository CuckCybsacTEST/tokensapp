import bcrypt from 'bcryptjs';
import { computeBusinessDayFromUtc, getConfiguredCutoffHour } from '../src/lib/attendanceDay';
// Cargar PrismaClient de forma compatible con distintos setups de tipos
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client') as { PrismaClient: any };
const prisma = new PrismaClient();

// Seed guard: HARD DISABLE by default. Only run when ALLOW_SEED=1 explicitly.
async function shouldSkipSeed() {
  if (process.env.ALLOW_SEED !== '1') {
    console.log('seed_skip: ALLOW_SEED!=1 (seed deshabilitado por defecto en todos los entornos)');
    return true;
  }
  const mode = (process.env.SEED_MODE || 'only-empty').toLowerCase();
  if (mode === 'never') {
    console.log('seed_skip: SEED_MODE=never');
    return true;
  }
  if (mode === 'only-empty') {
    try {
      const [prize, token, person, user, task, packs] = await Promise.all([
        prisma.prize.count(),
        prisma.token.count().catch(() => 0 as any),
        prisma.person.count().catch(() => 0 as any),
        prisma.user.count().catch(() => 0 as any),
        prisma.task.count().catch(() => 0 as any),
        prisma.birthdayPack.count().catch(() => 0 as any),
      ]);
      const total = prize + token + person + user + task + packs;
      if (total > 0) {
        console.log(`seed_skip: DB not empty (rows=${total})`);
        return true;
      }
    } catch {
      // If counts fail (tables missing), proceed with seed
    }
  }
  return false;
}

async function main() {
  if (await shouldSkipSeed()) return;
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, tokensEnabled: true }
  });

  const existing = await prisma.prize.count();
  if (existing === 0) {
    const base = [
      { label: 'Premio A', color: '#FF0000', stock: 100 },
      { label: 'Premio B', color: '#00AAFF', stock: 50 }
    ];
    for (let i = 0; i < base.length; i++) {
      const key = `premio${i + 1}`;
      await prisma.prize.create({ data: { key, ...base[i] } });
    }
  }

  // Seed mínimo de personas activas para scanner (no duplicar si ya existen)
  const persons = [
    { code: 'EMP-0001', name: 'Ana Gómez', jobTitle: 'Supervisora' },
    { code: 'EMP-0002', name: 'Luis Pérez', jobTitle: 'Operario' },
    { code: 'EMP-0003', name: 'Carla Ruiz', jobTitle: 'Recepción' },
  ];
  // Raw SQL fallback to avoid Prisma Client type mismatch in some environments
  const esc = (s: string) => s.replace(/'/g, "''");
  for (const p of persons) {
    const codeEsc = esc(p.code);
    const nameEsc = esc(p.name);
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM Person WHERE code='${codeEsc}' LIMIT 1`
    );
    if (!existing || existing.length === 0) {
      const nowIso = new Date().toISOString();
      const jobEsc = esc(p.jobTitle || '');
      // Omitimos id para que Prisma/DB genere (cuid())
      await prisma.$executeRawUnsafe(
        `INSERT INTO Person (code, name, jobTitle, active, createdAt, updatedAt) VALUES ('${codeEsc}', '${nameEsc}', ${p.jobTitle ? `'${jobEsc}'` : 'NULL'}, 1, '${nowIso}', '${nowIso}')`
      );
    }
  }

  // Backfill DNI y Área (en Postgres asumimos columnas presentes)
  const areaByJob: Record<string, string> = {
    'Supervisora': 'Supervisión',
    'Operario': 'Operaciones',
    'Recepción': 'Recepción',
  };
  for (const p of persons) {
    const dni = `DNI-${p.code}`;
    const area = areaByJob[p.jobTitle || ''] || 'General';
    await prisma.$executeRawUnsafe(
      `UPDATE Person SET dni='${esc(dni)}' WHERE code='${esc(p.code)}' AND (dni IS NULL OR dni='')`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE Person SET area='${esc(area)}' WHERE code='${esc(p.code)}' AND (area IS NULL OR area='')`
    );
  }

  // Seed mínimo de colaboradores (Users) vinculados a Person
  const collaborators = [
    { username: 'ana', code: 'EMP-0001', password: 'ana-ana' },
    { username: 'luis', code: 'EMP-0002', password: 'luis-luis' },
  ];
  for (const u of collaborators) {
    // Buscar Person por code
    const prow: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM Person WHERE code='${esc(u.code)}' LIMIT 1`
    );
    const personId = prow?.[0]?.id as string | undefined;
    if (!personId) continue; // si no existe la persona, saltar

    // ¿Existe ya el usuario por username o personId?
    const uEsc = esc(u.username);
    const existingUser: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM User WHERE username='${uEsc}' OR personId='${esc(personId)}' LIMIT 1`
    );
    if (existingUser && existingUser.length > 0) continue;

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(u.password, salt);
    const nowIso = new Date().toISOString();
    await prisma.$executeRawUnsafe(
      `INSERT INTO User (username, passwordHash, role, personId, createdAt, updatedAt) VALUES ('${uEsc}', '${esc(passwordHash)}', 'COLLAB', '${esc(personId)}', '${nowIso}', '${nowIso}')`
    );
  }

  // Alinear áreas demo con opciones del dashboard (si existe columna area)
  await prisma.$executeRawUnsafe(`UPDATE Person SET area='Barra' WHERE code='EMP-0001'`);
  await prisma.$executeRawUnsafe(`UPDATE Person SET area='Mozos' WHERE code='EMP-0002'`);
  await prisma.$executeRawUnsafe(`UPDATE Person SET area='Seguridad' WHERE code='EMP-0003'`);

  // -----------------------------
  // Attendance & Checklist demo data
  // -----------------------------
  try {
    // Load person ids
    const personsRows: any[] = await prisma.$queryRawUnsafe(`SELECT id, code FROM Person WHERE code IN ('EMP-0001','EMP-0002','EMP-0003')`);
    const byCode: Record<string, string> = {};
    for (const r of personsRows || []) byCode[r.code] = r.id;
    const p1 = byCode['EMP-0001'];
    const p2 = byCode['EMP-0002'];
    const p3 = byCode['EMP-0003'];
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    function iso(d: Date) { return d.toISOString(); }
    function add(d: Date, ms: number) { return new Date(d.getTime() + ms); }
  function dayStr(d: Date) { return d.toISOString().slice(0,10); }
  const cutoff = getConfiguredCutoffHour();

    // Helper: upsert scan (avoid dup by person+ts proximity)
    async function insertScan(personId: string, at: Date, type: 'IN'|'OUT') {
      // Evitar duplicados (mismo minuto) usando diferencia en segundos PostgreSQL
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM "Scan" WHERE "personId"='${personId}' AND ABS(EXTRACT(EPOCH FROM ("scannedAt" - TIMESTAMPTZ '${iso(at)}'))) < 60 LIMIT 1`
      );
      if (rows?.length) return;
      const bd = computeBusinessDayFromUtc(at, cutoff);
      await prisma.$queryRawUnsafe(
        `INSERT INTO "Scan" ("personId", "scannedAt", "type", "createdAt", "businessDay") VALUES ('${personId}', '${iso(at)}', '${type}', '${iso(new Date())}', '${bd}') RETURNING id`
      );
    }

    // Helper: upsert task status
    async function upsertTaskStatus(personId: string, day: string, done: number) {
      // choose some tasks deterministically
      const tasks: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM Task WHERE active=1 ORDER BY sortOrder LIMIT 3`);
      for (let i=0;i<tasks.length;i++) {
        const tid = tasks[i].id as string;
        const exists: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM PersonTaskStatus WHERE personId='${personId}' AND taskId='${tid}' AND day='${day}' LIMIT 1`);
        if (exists?.length) continue;
        await prisma.$executeRawUnsafe(
          `INSERT INTO PersonTaskStatus (personId, taskId, day, done, updatedAt) VALUES ('${personId}', '${tid}', '${day}', ${i < done ? 'true' : 'false'}, '${iso(new Date())}')`
        );
      }
    }

    // Create data for today, yesterday, and 2 days ago
    const days = [0, -1, -2];
    for (const offset of days) {
      const base = add(today, offset * 24 * 3600 * 1000);
      const day = dayStr(base);
      // EMP-0001: full day with tasks complete (2/3 or 3/3)
      if (p1) {
        // For today (offset 0): only IN to allow editing during the day
        await insertScan(p1, add(base, 8*3600*1000 + 5*60*1000), 'IN'); // 08:05Z
        if (offset !== 0) {
          await insertScan(p1, add(base, 16*3600*1000 + 2*60*1000), 'OUT'); // 16:02Z
        }
        await upsertTaskStatus(p1, day, 3);
      }
      // EMP-0002: IN but no OUT (incomplete day), partial tasks
      if (p2) {
        await insertScan(p2, add(base, 9*3600*1000 + 15*60*1000), 'IN'); // 09:15Z
        await upsertTaskStatus(p2, day, 1);
      }
      // EMP-0003: near-midnight tests to validate UTC day bucket
      if (p3) {
        // IN at 23:50Z previous day if offset==0 → use day-1 to cross boundary
        const nearMidnightIn = add(base, 23*3600*1000 + 50*60*1000);
        await insertScan(p3, nearMidnightIn, 'IN');
        // OUT after midnight 00:20Z next day
        const afterMidnightOut = add(base, 24*3600*1000 + 20*60*1000);
        await insertScan(p3, afterMidnightOut, 'OUT');
        // tasks marked on base day
        await upsertTaskStatus(p3, day, 2);
      }
    }
  } catch (e) {
    // non-fatal for seed
  }

  // Seed de tareas por defecto (Checklist) - globales (area NULL) + específicas por área
  const defaultTasks: { label: string; sortOrder?: number; active?: boolean; area?: string | null }[] = [
    // Globales
    { label: 'Revisar stocks de insumos' },
    { label: 'Preparar área de atención' },
    { label: 'Verificar limpieza de sala' },
    // Específicas por área (ejemplos)
    { label: 'Revisar hieleras y vasos', area: 'Barra' },
    { label: 'Preparar POS de barra', area: 'Barra' },
    { label: 'Chequeo de bandejas y servilletas', area: 'Mozos' },
    { label: 'Relevamiento de mesas asignadas', area: 'Mozos' },
    { label: 'Verificar cámaras y radios', area: 'Seguridad' },
    { label: 'Briefing de accesos y salidas', area: 'Seguridad' },
  ];
  for (let i = 0; i < defaultTasks.length; i++) {
    const t = defaultTasks[i];
    const label = t.label.trim();
    if (!label) continue;
    const labelEsc = esc(label);
    const existingTask: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM Task WHERE label='${labelEsc}' AND ${t.area ? `area='${esc(t.area)}'` : 'area IS NULL'} LIMIT 1`
    );
    if (!existingTask || existingTask.length === 0) {
      const nowIso = new Date().toISOString();
      const active = (t.active ?? true) ? 'true' : 'false';
      const sortOrder = t.sortOrder ?? i * 10;
      const area = t.area ? `'${esc(t.area)}'` : 'NULL';
      await prisma.$executeRawUnsafe(
        `INSERT INTO Task (label, active, sortOrder, area, createdAt, updatedAt) VALUES ('${labelEsc}', ${active}, ${sortOrder}, ${area}, '${nowIso}', '${nowIso}')`
      );
    }
  }

  // -----------------------------
  // Seed: Tareas medibles de ejemplo (idempotentes)
  // -----------------------------
  try {
    const measurableTasks: { label: string; area: string; targetValue: number; unitLabel: string; sortOrder?: number }[] = [
      { label: 'Vender copas', area: 'Pruebas', targetValue: 7, unitLabel: 'copas', sortOrder: 9000 },
      { label: 'Promocionar copas', area: 'Pruebas', targetValue: 7, unitLabel: 'copas', sortOrder: 9010 },
      // E2E: tarea fija y visible para área Barra
      { label: 'E2E Medible Barra', area: 'Barra', targetValue: 3, unitLabel: 'copas', sortOrder: 9050 },
    ];
    for (const t of measurableTasks) {
      const labelEsc = esc(t.label.trim());
      const areaEsc = esc(t.area.trim());
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM Task WHERE label='${labelEsc}' AND area='${areaEsc}' LIMIT 1`
      );
      const nowIso = new Date().toISOString();
      if (rows && rows.length > 0) {
        const id = rows[0].id as string;
        // Update to ensure measurement flags are set and fields aligned
        await prisma.$executeRawUnsafe(
          `UPDATE Task SET measureEnabled=true, targetValue=${t.targetValue}, unitLabel='${esc(t.unitLabel)}', active=true, updatedAt='${nowIso}' WHERE id='${esc(id)}'`
        );
      } else {
        const sortOrder = t.sortOrder ?? 10000;
        await prisma.$executeRawUnsafe(
          `INSERT INTO Task (label, active, sortOrder, area, measureEnabled, targetValue, unitLabel, createdAt, updatedAt) VALUES ('${labelEsc}', true, ${sortOrder}, '${areaEsc}', true, ${t.targetValue}, '${esc(t.unitLabel)}', '${nowIso}', '${nowIso}')`
        );
      }
    }
  } catch {}
  
  // -----------------------------
  // Seed: Birthday Packs (idempotente via upsert por name)
  // -----------------------------
  try {
    const packs = [
      {
        name: 'Chispa',
        qrCount: 5,
        bottle: 'Russkaya',
        featured: false,
        perks: ['Botella de cortesía: Russkaya', 'Fotos', 'Collares neón', '5 QRs cumpleañero'],
      },
      {
        name: 'Fuego',
        qrCount: 10,
        bottle: 'Old Times',
        featured: true,
        perks: ['Botella de cortesía: Old Times', 'Foto grupal impresa', '10 QRs cumpleañero', 'Collares neón'],
      },
      {
        name: 'Estrella',
        qrCount: 20,
        bottle: 'Red Label',
        featured: true,
        perks: ['Botella de cortesía: Red Label', '20 QRs cumpleañero', '3 fotos impresas', 'Stickers VIP adhesivos', 'Collares neón'],
      },
    ];

    for (const p of packs) {
      await prisma.birthdayPack.upsert({
        where: { name: p.name },
        update: {
          qrCount: p.qrCount,
          bottle: p.bottle,
          featured: p.featured,
          perks: JSON.stringify(p.perks),
          active: true,
        },
        create: {
          name: p.name,
          qrCount: p.qrCount,
          bottle: p.bottle,
          featured: p.featured,
          perks: JSON.stringify(p.perks),
          active: true,
        },
      });
    }
  } catch (e) {
    // no bloquear seed si el modelo aún no existe
  }
  // simple stdout to mark completion (avoid importing app code here)
  console.log('seed_done');
}

main().catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
