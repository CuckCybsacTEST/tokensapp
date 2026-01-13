import { BatchManifestMeta, PrizeRequest } from "@/lib/batch/types";
import { logEvent } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { getPrizesByIds } from "@/lib/prizeCache";
import { CURRENT_SIGNATURE_VERSION, signToken } from "@/lib/signing";

// (Test-only) deterministic race hook storage. Not exported publicly; a reset helper is.
const rcState: { prizes?: Set<string> } = {};
export function __resetRaceTestState() { rcState.prizes = undefined; }

export interface GenerateBatchOptions {
  includeQr?: boolean;
  lazyQr?: boolean;
  description?: string;
  expirationDays?: number;
  overrideExpiresAt?: Date;
  overrideDisabled?: boolean;
}

export interface GeneratedToken {
  id: string;
  prizeId: string;
  prizeKey: string;
  prizeLabel: string;
  prizeColor: string | null;
  expiresAt: Date;
  signature: string;
  signatureVersion: number;
  pairedNextTokenId?: string | null;
}

export interface GenerateBatchResult {
  batch: { id: string; createdAt: Date; description: string | null };
  tokens: GeneratedToken[];
  meta: {
    mode: "auto";
    expirationDays: number | null;
    aggregatedPrizeCount: number;
    totalTokens: number;
    qrMode: "lazy" | "eager" | "none";
  };
  prizeEmittedTotals: Record<string, number>;
}

export class PrizeNotFoundError extends Error {
  prizeId: string;
  constructor(prizeId: string) {
    super("PRIZE_NOT_FOUND");
    this.prizeId = prizeId;
  }
}

export class InsufficientStockError extends Error {
  prizeId: string;
  constructor(prizeId: string) {
    super("INSUFFICIENT_STOCK");
    this.prizeId = prizeId;
  }
}

export class RaceConditionError extends Error {
  prizeId: string;
  constructor(prizeId: string) {
    super("RACE_CONDITION");
    this.prizeId = prizeId;
  }
}

interface BuildPrizeTokensArgs {
  prize: any; // Prisma Prize type (kept as any to avoid pulling type)
  count: number;
  expirationDays: number;
  batchId: string;
  supportsSignatureVersion: boolean;
  secret: string;
  overrideExpiresAt?: Date;
  overrideDisabled?: boolean;
}

function buildPrizeTokens(args: BuildPrizeTokensArgs) {
  const { prize, count, expirationDays, batchId, supportsSignatureVersion, secret, overrideExpiresAt, overrideDisabled } = args;
  
  // Calculate expiry at 03:00 AM (Lima) of the target business day
  // We shift 8 hours to align with 03:00 AM business day logic
  const now = new Date();
  const businessDate = new Date(now.getTime() - 8 * 3600 * 1000);
  
  // Set to 03:00:00 Lima (08:00:00 UTC) of the day AFTER the business day starts
  // (e.g. Business Day Jan 13 expires Jan 14 03:00 AM)
  const expiresAt = overrideExpiresAt || new Date(Date.UTC(
    businessDate.getUTCFullYear(),
    businessDate.getUTCMonth(),
    businessDate.getUTCDate() + (expirationDays || 1),
    8, 0, 0, 0
  ));

  const rows: any[] = [];
  const tokens: GeneratedToken[] = [];
  for (let i = 0; i < count; i++) {
    const tokenId = crypto.randomUUID();
    const signature = signToken(secret, tokenId, prize.id, expiresAt, CURRENT_SIGNATURE_VERSION);
    const baseRow: any = { id: tokenId, prizeId: prize.id, batchId, expiresAt, signature, disabled: overrideDisabled ?? false };
    if (supportsSignatureVersion) baseRow.signatureVersion = CURRENT_SIGNATURE_VERSION;
    rows.push(baseRow);
    tokens.push({
      id: tokenId,
      prizeId: prize.id,
      prizeKey: prize.key,
      prizeLabel: prize.label,
      prizeColor: prize.color || null,
      expiresAt,
      signature,
      signatureVersion: CURRENT_SIGNATURE_VERSION,
      disabled: overrideDisabled ?? false,
    });
  }
  return { rows, tokens };
}

// --- functionalDate derivation (duplicated logic similar to restore & backfill) ---
function limaMidnightUtc(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 5, 0, 0, 0));
}
const datePatterns: RegExp[] = [
  /(\d{2})[.\/-](\d{2})[.\/-](\d{4})/,
  /(\d{2})(\d{2})(\d{4})/,
  /(\d{2})[.\/-](\d{2})[.\/-](\d{2})/,
];
function deriveFunctionalDate(description: string | null | undefined, createdAt: Date) {
  let y: number | undefined, m: number | undefined, d: number | undefined;
  if (description) {
    for (const rg of datePatterns) {
      const mt = description.match(rg);
      if (mt) {
        if (mt[0].length === 8 && /\d{8}/.test(mt[0])) {
          d = parseInt(mt[1], 10); m = parseInt(mt[2], 10); y = parseInt(mt[3], 10);
        } else if (mt[3] && mt[3].length === 2) {
          d = parseInt(mt[1], 10); m = parseInt(mt[2], 10); y = 2000 + parseInt(mt[3], 10);
        } else {
          d = parseInt(mt[1], 10); m = parseInt(mt[2], 10); y = parseInt(mt[3], 10);
        }
        break;
      }
    }
  }
  if (y && m && d) return limaMidnightUtc(y, m, d);
  
  // Shift 8 hours back to ensure 00:00-03:00 counts as the previous day
  const shifted = new Date(createdAt.getTime() - 8 * 3600 * 1000);
  y = shifted.getUTCFullYear(); m = shifted.getUTCMonth() + 1; d = shifted.getUTCDate();
  return limaMidnightUtc(y, m, d);
}

/**
 * Core batch generation logic. Performs validation, stock decrement, batch + token creation.
 * Leaves side-effects like logging & ZIP/manifest assembly to the caller.
 */
export async function generateBatchCore(
  prizeRequests: PrizeRequest[],
  options: GenerateBatchOptions = {}
): Promise<GenerateBatchResult> {
  if (!prizeRequests.length) {
    return Promise.reject(new Error("NO_PRIZES"));
  }

  // Gather unique prize ids and fetch (cached) records
  const prizeIds = [...new Set(prizeRequests.map((p) => p.prizeId))];
  const prizes = await getPrizesByIds(prizeIds);
  const prizeMap = new Map(prizes.map((p) => [p.id, p]));
  for (const req of prizeRequests) {
    if (!prizeMap.has(req.prizeId)) throw new PrizeNotFoundError(req.prizeId);
  }

  const secret = process.env.TOKEN_SECRET || "dev_secret";
  const createdTokens: GeneratedToken[] = [];
  let batchRecord: { id: string; createdAt: Date; description: string | null } | null = null;

  const emittedTotals: Record<string, number> = {};
  const postCommitLogs: { prizeId: string; count: number }[] = [];
  try {
    // Crear batch primero (operación rápida)
    const b = await prisma.batch.create({ data: { description: options.description } });
    // Derivar functionalDate inmediato para que métricas diarias lo vean (evita fallback createdAt)
    try {
      const fDate = deriveFunctionalDate(options.description, b.createdAt);
      await prisma.batch.update({ where: { id: b.id }, data: { functionalDate: fDate } });
    } catch (e) {
      // swallow derivation errors, fallback metrics may still work
    }
    batchRecord = { id: b.id, createdAt: b.createdAt, description: b.description };

    // Postgres baseline includes signatureVersion column
    const supportsSignatureVersion = true;

    const CREATE_CHUNK = parseInt(process.env.BATCH_CREATE_CHUNK || '1000');
    const allRows: any[] = [];
    const allTokens: GeneratedToken[] = [];
    for (const req of prizeRequests) {
      const prize = prizeMap.get(req.prizeId)!;
      const effectiveExpirationDays = req.expirationDays ?? options.expirationDays;
      if (!effectiveExpirationDays || effectiveExpirationDays <= 0) {
        throw new Error(`INVALID_EXPIRATION_DAYS:${req.prizeId}`);
      }
      // Siempre consumir stock completo actual (auto-only)
      let generationCount = 0;
      const fresh = await prisma.prize.findUnique({
        where: { id: prize.id },
        select: { stock: true },
      });
      const currentStock = fresh?.stock ?? null;
      if (currentStock && currentStock > 0) generationCount = currentStock;
      // Deterministic race test hook (only active in NODE_ENV test to avoid prod surprises)
      if (process.env.NODE_ENV === "test" && process.env.FORCE_RACE_TEST === "1") {
        if (generationCount > 0) {
          await new Promise((r) => setTimeout(r, 25));
        }
        if (!rcState.prizes) rcState.prizes = new Set();
        if (rcState.prizes.has(prize.id)) {
          throw new RaceConditionError(prize.id);
        }
        rcState.prizes.add(prize.id);
      }
      if (generationCount > 0) {
        // Reservar stock de forma optimista antes de crear tokens para evitar timeouts en transacción larga
        const upd = await prisma.prize.updateMany({
          where: { id: prize.id, stock: { gte: generationCount } },
          data: {
            stock: 0,
            emittedTotal: { increment: generationCount },
            lastEmittedAt: new Date(),
          } as any,
        });
        if (upd.count === 0) throw new RaceConditionError(prize.id);

        const { rows, tokens } = buildPrizeTokens({
          prize,
          count: generationCount,
          expirationDays: effectiveExpirationDays,
          batchId: b.id,
          supportsSignatureVersion,
          secret,
          overrideExpiresAt: options.overrideExpiresAt,
          overrideDisabled: options.overrideDisabled,
        });
        // Acumular para pairing global posterior
        allRows.push(...rows);
        allTokens.push(...tokens);
        createdTokens.push(...tokens);
        emittedTotals[prize.id] = (emittedTotals[prize.id] || 0) + generationCount;
        postCommitLogs.push({ prizeId: prize.id, count: generationCount });
      }
    }

    // Pairing: asignar pairedNextTokenId a cada token de retry con un token funcional disponible
    // Estrategia: selección aleatoria balanceada por premio (round-robin entre buckets de prizeKey),
    // para evitar barrer un solo premio.
    try {
      const retryIds = allTokens.filter(t => t.prizeKey === 'retry').map(t => t.id);
      const functionalTokens = allTokens.filter(t => t.prizeKey !== 'retry' && t.prizeKey !== 'lose');
      if (retryIds.length > 0) {
        if (functionalTokens.length < retryIds.length) {
          throw new Error('PAIRING_INSUFFICIENT');
        }
        // Helper shuffle
        const shuffle = <T,>(arr: T[]): T[] => {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = arr[i];
            arr[i] = arr[j];
            arr[j] = tmp;
          }
          return arr;
        };
        // Buckets por prizeKey con listas barajadas
        const buckets = new Map<string, string[]>();
        for (const ft of functionalTokens) {
          if (!buckets.has(ft.prizeKey)) buckets.set(ft.prizeKey, []);
          buckets.get(ft.prizeKey)!.push(ft.id);
        }
        for (const [k, arr] of buckets) shuffle(arr);
        // Orden aleatorio de buckets para el round-robin
        const bucketKeys = shuffle(Array.from(buckets.keys()));
        const pickFromBuckets = (count: number): string[] => {
          const picked: string[] = [];
          let idx = 0;
          while (picked.length < count) {
            let progressed = false;
            for (let r = 0; r < bucketKeys.length && picked.length < count; r++) {
              const k = bucketKeys[(idx + r) % bucketKeys.length];
              const arr = buckets.get(k)!;
              if (arr.length > 0) {
                picked.push(arr.pop()!);
                progressed = true;
              }
            }
            if (!progressed) break; // no más tokens en buckets (debería no ocurrir por chequeo previo)
            idx++;
          }
          return picked;
        };
        const functionalPicked = pickFromBuckets(retryIds.length);
        const idToRowIndex = new Map<string, number>();
        for (let i = 0; i < allRows.length; i++) idToRowIndex.set(allRows[i].id, i);
        for (let i = 0; i < retryIds.length; i++) {
          const rid = retryIds[i];
          const fid = functionalPicked[i];
          const rowIdx = idToRowIndex.get(rid);
          if (rowIdx != null) {
            allRows[rowIdx] = { ...allRows[rowIdx], pairedNextTokenId: fid };
          }
          const tok = allTokens.find(t => t.id === rid);
          if (tok) tok.pairedNextTokenId = fid;
          const tOut = createdTokens.find(t => t.id === rid);
          if (tOut) (tOut as any).pairedNextTokenId = fid;
        }
      }
    } catch (e) {
      if (String((e as any)?.message) === 'PAIRING_INSUFFICIENT') {
        throw new Error('PAIRING_INSUFFICIENT');
      }
      // si falla pairing por alguna razón no crítica, continuar sin pairing (defensa)
    }

    // Insertar todos los tokens en chunks
    if (allRows.length) {
      for (let i = 0; i < allRows.length; i += CREATE_CHUNK) {
        const slice = allRows.slice(i, i + CREATE_CHUNK);
        // eslint-disable-next-line no-await-in-loop
        await prisma.token.createMany({ data: slice });
      }
    }
  } catch (e: any) {
    if (
      e instanceof PrizeNotFoundError ||
      e instanceof InsufficientStockError ||
      e instanceof RaceConditionError
    )
      throw e;
    if (e.message?.startsWith("INVALID_EXPIRATION_DAYS:")) throw e; // surface to caller
    if (e.message === 'PAIRING_INSUFFICIENT') throw e;
    throw new Error(e?.message || "BATCH_TRANSACTION_FAILED");
  }

  if (!batchRecord) throw new Error("BATCH_NOT_CREATED");

  const qrMode: "lazy" | "eager" | "none" = options.lazyQr
    ? "lazy"
    : options.includeQr === false
      ? "none"
      : "eager";
  const meta = {
    mode: "auto" as const,
    expirationDays: options.expirationDays ?? null,
    aggregatedPrizeCount: prizeIds.length,
    totalTokens: createdTokens.length,
    qrMode,
  };

  // Emit logs fuera de bloque crítico
  for (const ev of postCommitLogs) {
    // no await aggregation; sequential to preserve order but outside tx
    // eslint-disable-next-line no-await-in-loop
    await logEvent("PRIZE_STOCK_CONSUMED", `stock consumido prize ${ev.prizeId}`, {
      prizeId: ev.prizeId,
      count: ev.count,
    });
  }
  return { batch: batchRecord, tokens: createdTokens, meta, prizeEmittedTotals: emittedTotals };
}

/**
 * Planned-counts generation: create exactly the requested number of tokens per prize,
 * without reading or consuming Prize.stock. Keeps pairing and chunked createMany.
 */
export async function generateBatchPlanned(
  prizeRequests: PrizeRequest[],
  options: GenerateBatchOptions = {}
): Promise<GenerateBatchResult> {
  if (!prizeRequests.length) throw new Error("NO_PRIZES");

  // Validate prizes exist
  const prizeIds = [...new Set(prizeRequests.map((p) => p.prizeId))];
  const prizes = await getPrizesByIds(prizeIds);
  const prizeMap = new Map(prizes.map((p) => [p.id, p]));
  for (const req of prizeRequests) {
    if (!prizeMap.has(req.prizeId)) throw new PrizeNotFoundError(req.prizeId);
  }

  const secret = process.env.TOKEN_SECRET || "dev_secret";
  const createdTokens: GeneratedToken[] = [];
  let batchRecord: { id: string; createdAt: Date; description: string | null } | null = null;
  const emittedTotals: Record<string, number> = {};
  const allRows: any[] = [];
  const allTokens: GeneratedToken[] = [];

  // Create batch and set functionalDate
  const b = await prisma.batch.create({ data: { description: options.description } });
  try {
    const fDate = deriveFunctionalDate(options.description, b.createdAt);
    await prisma.batch.update({ where: { id: b.id }, data: { functionalDate: fDate } });
  } catch {}
  batchRecord = { id: b.id, createdAt: b.createdAt, description: b.description };

  const supportsSignatureVersion = true;
  const CREATE_CHUNK = parseInt(process.env.BATCH_CREATE_CHUNK || '1000');

  // Build rows exactly as requested
  for (const req of prizeRequests) {
    const prize = prizeMap.get(req.prizeId)!;
    const effectiveExpirationDays = req.expirationDays ?? options.expirationDays;
    if (!effectiveExpirationDays || effectiveExpirationDays <= 0) {
      throw new Error(`INVALID_EXPIRATION_DAYS:${req.prizeId}`);
    }
    const count = (req as any).count ?? 0;
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`INVALID_PLANNED_COUNT:${req.prizeId}`);
    }
    if (count === 0) continue;
    const { rows, tokens } = buildPrizeTokens({
      prize,
      count,
      expirationDays: effectiveExpirationDays,
      batchId: b.id,
      supportsSignatureVersion,
      secret,
      overrideExpiresAt: options.overrideExpiresAt,
      overrideDisabled: options.overrideDisabled,
    });
    allRows.push(...rows);
    allTokens.push(...tokens);
    createdTokens.push(...tokens);
    emittedTotals[prize.id] = (emittedTotals[prize.id] || 0) + count;
  }

  // Pairing retry -> functional (exclude retry/lose), aleatorio balanceado por premio
  try {
    const retryIds = allTokens.filter(t => t.prizeKey === 'retry').map(t => t.id);
    const functionalTokens = allTokens.filter(t => t.prizeKey !== 'retry' && t.prizeKey !== 'lose');
    if (retryIds.length > 0) {
      if (functionalTokens.length < retryIds.length) throw new Error('PAIRING_INSUFFICIENT');
      const shuffle = <T,>(arr: T[]): T[] => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        return arr;
      };
      const buckets = new Map<string, string[]>();
      for (const ft of functionalTokens) {
        if (!buckets.has(ft.prizeKey)) buckets.set(ft.prizeKey, []);
        buckets.get(ft.prizeKey)!.push(ft.id);
      }
      for (const [k, arr] of buckets) shuffle(arr);
      const bucketKeys = shuffle(Array.from(buckets.keys()));
      const pickFromBuckets = (count: number): string[] => {
        const picked: string[] = [];
        let idx = 0;
        while (picked.length < count) {
          let progressed = false;
          for (let r = 0; r < bucketKeys.length && picked.length < count; r++) {
            const k = bucketKeys[(idx + r) % bucketKeys.length];
            const arr = buckets.get(k)!;
            if (arr.length > 0) {
              picked.push(arr.pop()!);
              progressed = true;
            }
          }
          if (!progressed) break;
          idx++;
        }
        return picked;
      };
      const functionalPicked = pickFromBuckets(retryIds.length);
      const idToRowIndex = new Map<string, number>();
      for (let i = 0; i < allRows.length; i++) idToRowIndex.set(allRows[i].id, i);
      for (let i = 0; i < retryIds.length; i++) {
        const rid = retryIds[i];
        const fid = functionalPicked[i];
        const rowIdx = idToRowIndex.get(rid);
        if (rowIdx != null) {
          allRows[rowIdx] = { ...allRows[rowIdx], pairedNextTokenId: fid };
        }
        const tok = allTokens.find(t => t.id === rid);
        if (tok) tok.pairedNextTokenId = fid;
        const tOut = createdTokens.find(t => t.id === rid);
        if (tOut) (tOut as any).pairedNextTokenId = fid;
      }
    }
  } catch (e) {
    if ((e as any)?.message === 'PAIRING_INSUFFICIENT') throw e;
  }

  // Insert tokens in chunks
  if (allRows.length) {
    for (let i = 0; i < allRows.length; i += CREATE_CHUNK) {
      const slice = allRows.slice(i, i + CREATE_CHUNK);
      // eslint-disable-next-line no-await-in-loop
      await prisma.token.createMany({ data: slice });
    }
  }

  if (!batchRecord) throw new Error('BATCH_NOT_CREATED');
  const qrMode: "lazy" | "eager" | "none" = options.lazyQr ? 'lazy' : (options.includeQr === false ? 'none' : 'eager');
  const meta = {
    mode: "auto" as const,
    expirationDays: options.expirationDays ?? null,
    aggregatedPrizeCount: prizeIds.length,
    totalTokens: createdTokens.length,
    qrMode,
  };
  return { batch: batchRecord, tokens: createdTokens, meta, prizeEmittedTotals: emittedTotals };
}
