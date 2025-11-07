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
}

export interface GenerateBatchResult {
  batch: { id: string; createdAt: Date; description: string | null };
  tokens: GeneratedToken[];
  meta: {
    mode: "static";
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
}

function buildPrizeTokens(args: BuildPrizeTokensArgs) {
  const { prize, count, expirationDays, batchId, supportsSignatureVersion, secret } = args;
  const expiresAtBase = Date.now();
  const rows: any[] = [];
  const tokens: GeneratedToken[] = [];
  for (let i = 0; i < count; i++) {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(expiresAtBase + expirationDays * 24 * 3600 * 1000);
    const signature = signToken(secret, tokenId, prize.id, expiresAt, CURRENT_SIGNATURE_VERSION);
    const baseRow: any = { id: tokenId, prizeId: prize.id, batchId, expiresAt, signature, disabled: false };
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
  const createdLocal = new Date(createdAt.getTime() - 5 * 3600 * 1000);
  y = createdLocal.getUTCFullYear(); m = createdLocal.getUTCMonth() + 1; d = createdLocal.getUTCDate();
  return limaMidnightUtc(y, m, d);
}

/**
 * Static batch generation: create exactly the requested number of tokens per prize,
 * without reading or consuming Prize.stock automatically. Consumes exactly the requested amounts.
 * No pairing logic (not applicable to static batches).
 */
export async function generateBatchStatic(
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

  // Build rows exactly as requested and consume stock
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

    // Consume exactly the requested stock
    const upd = await prisma.prize.updateMany({
      where: { id: prize.id, stock: { gte: count } },
      data: {
        stock: { decrement: count },
        emittedTotal: { increment: count },
        lastEmittedAt: new Date(),
      } as any,
    });
    if (upd.count === 0) throw new InsufficientStockError(prize.id);

    const { rows, tokens } = buildPrizeTokens({
      prize,
      count,
      expirationDays: effectiveExpirationDays,
      batchId: b.id,
      supportsSignatureVersion,
      secret,
    });
    allRows.push(...rows);
    allTokens.push(...tokens);
    createdTokens.push(...tokens);
    emittedTotals[prize.id] = (emittedTotals[prize.id] || 0) + count;
  }

  // Insert tokens in chunks (no pairing needed for static batches)
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
    mode: "static" as const,
    expirationDays: options.expirationDays ?? null,
    aggregatedPrizeCount: prizeIds.length,
    totalTokens: createdTokens.length,
    qrMode,
  };
  return { batch: batchRecord, tokens: createdTokens, meta, prizeEmittedTotals: emittedTotals };
}
