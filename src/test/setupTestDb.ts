import { PrismaClient } from "@prisma/client";

/**
 * Estrategia Postgres para tests:
 * - Usamos la base principal indicada por DATABASE_URL pero truncamos tablas antes de cada suite que llame initTestDb.
 * - Para aislamiento por archivo podemos usar un schema distinto (public por defecto). A futuro se puede parametrizar schema.
 * - Eliminamos toda la lógica SQLite (PRAGMA / CREATE TABLE ad‑hoc / INSERT OR IGNORE).
 */

let sharedPrisma: PrismaClient | null = null;
let lastDbSignature = "";

function buildTestUrl(baseUrlEnv?: string) {
  const base = baseUrlEnv || process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5433/qrprizes?schema=public";
  return base;
}

async function getClient() : Promise<PrismaClient> {
  const url = buildTestUrl();
  if (!sharedPrisma || lastDbSignature !== url) {
    process.env.DATABASE_URL = url; // asegúrate que prisma use este datasource
    sharedPrisma?.$disconnect().catch(()=>{});
    sharedPrisma = new PrismaClient();
    lastDbSignature = url;
  }
  return sharedPrisma;
}

const TABLES = [
  '"InviteToken"', '"TokenRedemption"', '"CourtesyItem"', '"PhotoDeliverable"', '"BirthdayReservation"', '"BirthdayPack"',
  '"PersonTaskStatus"', '"Task"', '"User"', '"Scan"', '"Person"',
  '"RouletteSpin"', '"RouletteSession"', '"Token"', '"Batch"', '"Prize"', '"PrintTemplate"', '"EventLog"', '"SystemConfig"', '"Show"'
];

async function truncateAll(p: PrismaClient) {
  // Seguridad: evitar borrar datos reales si alguien apunta accidentalmente a la base productiva/dev.
  const rawUrl = process.env.DATABASE_URL || "";
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    throw new Error('[setupTestDb] Abortado: NODE_ENV=production. No se permite truncar tablas en producción.');
  }
  try {
    const urlObj = new URL(rawUrl.replace(/^postgresql:/, 'http:'));
    const dbName = urlObj.pathname.replace(/^\//, '').split('?')[0];
    const host = urlObj.hostname;
    const looksLocal = ['localhost','127.0.0.1'].includes(host);
    const isTestDbName = /test/i.test(dbName);
    if ((!looksLocal || !isTestDbName) && process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
      // Requerimos además una señal positiva TEST_DB=1 para evitar falsos positivos (p.e. staging local).
      if (process.env.TEST_DB !== '1') {
        throw new Error(`Bloqueado truncate (DB no marcada como test). host=${host} db=${dbName}. Establece DATABASE_URL a una base que contenga 'test' en el nombre y exporta TEST_DB=1 antes de correr tests. (Override extremo: ALLOW_UNSAFE_TEST_DB=1).`);
      }
    }
  } catch (e:any) {
    if (e.message.startsWith('Bloqueado truncate')) {
      throw e; // re-lanzar mensaje claro
    }
    // Si parsing falla, mejor abortar para no arriesgar datos.
    throw new Error(`No se pudo analizar DATABASE_URL para validación de seguridad: '${rawUrl}'. Aborto por seguridad.`);
  }
  // Deshabilitamos constraints, truncamos, re‑habilitamos. Usamos formato CASCADE.
  // Importante: orden inverso para dependencias cuando TRUNCATE sin CASCADE.
  // Aquí preferimos CASCADE para simplicidad.
  const truncate = `TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE;`;
  try {
    await p.$executeRawUnsafe(truncate);
  } catch (e) {
    // Si la migración todavía no creó alguna tabla (tests parciales), ignoramos.
  }
}

// Inicializa (o reutiliza) el cliente y deja las tablas limpias para la suite.
export async function initTestDb(_label: string) {
  const prisma = await getClient();
  await truncateAll(prisma);
  // Semilla mínima: SystemConfig (tokensEnabled true) para que endpoints no fallen.
  await prisma.systemConfig.upsert({
    where: { id: 1 },
    update: { tokensEnabled: true },
    create: { id: 1, tokensEnabled: true }
  });
  return prisma;
}

export async function initTestDbMulti(label: string, _connectionLimit = 5) {
  // Para compatibilidad: simplemente delega.
  return initTestDb(label);
}
