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
    const baseRow: any = { id: tokenId, prizeId: prize.id, batchId, expiresAt, signature };
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
    await prisma.$transaction(async (tx) => {
      const b = await tx.batch.create({ data: { description: options.description } });
      batchRecord = { id: b.id, createdAt: b.createdAt, description: b.description };

      // Determine if signatureVersion column exists (legacy DB support) once
      let supportsSignatureVersion = true;
      try {
        const pragma: any[] = await tx.$queryRawUnsafe("PRAGMA table_info(Token)");
        supportsSignatureVersion = pragma.some((c: any) => c.name === "signatureVersion");
      } catch {
        supportsSignatureVersion = true; // assume true if introspection fails
      }

      for (const req of prizeRequests) {
        const prize = prizeMap.get(req.prizeId)!;
        const effectiveExpirationDays = req.expirationDays ?? options.expirationDays;
        if (!effectiveExpirationDays || effectiveExpirationDays <= 0) {
          throw new Error(`INVALID_EXPIRATION_DAYS:${req.prizeId}`);
        }
        // Siempre consumir stock completo actual (auto-only)
        let generationCount = 0;
        const fresh = await tx.prize.findUnique({
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
          const { rows, tokens } = buildPrizeTokens({
            prize,
            count: generationCount,
            expirationDays: effectiveExpirationDays,
            batchId: b.id,
            supportsSignatureVersion,
            secret,
          });
          if (rows.length) await tx.token.createMany({ data: rows });
          createdTokens.push(...tokens);
          emittedTotals[prize.id] = (emittedTotals[prize.id] || 0) + generationCount;
          const upd = await tx.prize.updateMany({
            where: { id: prize.id, stock: { gte: generationCount } },
            data: {
              stock: 0,
              emittedTotal: { increment: generationCount },
              lastEmittedAt: new Date(),
            } as any,
          });
          if (upd.count === 0) throw new RaceConditionError(prize.id);
          postCommitLogs.push({ prizeId: prize.id, count: generationCount });
        }
      }
    });
  } catch (e: any) {
    if (
      e instanceof PrizeNotFoundError ||
      e instanceof InsufficientStockError ||
      e instanceof RaceConditionError
    )
      throw e;
    if (e.message?.startsWith("INVALID_EXPIRATION_DAYS:")) throw e; // surface to caller
    throw new Error(e?.message || "BATCH_TRANSACTION_FAILED");
  }

  if (!batchRecord) throw new Error("BATCH_NOT_CREATED");

  const qrMode: "lazy" | "eager" | "none" = options.lazyQr
    ? "lazy"
    : options.includeQr === false
      ? "none"
      : "eager";
  const meta: BatchManifestMeta = {
    mode: "auto",
    expirationDays: options.expirationDays ?? null,
    aggregatedPrizeCount: prizeIds.length,
    totalTokens: createdTokens.length,
    qrMode,
  };

  // Emit logs fuera de la transacción para no prolongar lock/timeout.
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
