import { Readable } from "stream";
import { z } from "zod";
import { DateTime } from "luxon";

import {
  generateBatchCore,
  generateBatchPlanned,
  InsufficientStockError,
  RaceConditionError,
} from "@/lib/batch/generateBatchCore";
import { logEvent } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { apiError } from '@/lib/apiError';

const ALLOWED_EXPIRATION = new Set([1, 3, 5, 7, 15, 30]);
import { generateQrPngDataUrl } from "@/lib/qr";
import { createZipStream } from "@/lib/zip";
import { getPublicBaseUrl } from "@/lib/config";

// Body (legacy): { expirationDays: number, includeQr?: boolean, lazyQr?: boolean, name?: string }
// Body (new byDays): { mode: 'byDays', expirationDays: number, includeQr?: boolean, lazyQr?: boolean, name?: string }
// Body (new singleDay): { mode: 'singleDay', singleDayDate: 'YYYY-MM-DD', includeQr?: boolean, lazyQr?: boolean, name?: string }
// Body (new singleHour): { mode: 'singleHour', date: 'YYYY-MM-DD', hour: 'HH:mm', durationMinutes?: number (5..720), includeQr?: boolean, lazyQr?: boolean, name?: string }
const legacySchema = z.object({
  expirationDays: z
    .number()
    .int()
    .positive()
    .refine((v) => ALLOWED_EXPIRATION.has(v), { message: "INVALID_EXPIRATION" }),
  includeQr: z.boolean().optional().default(true),
  lazyQr: z.boolean().optional().default(false),
  name: z.string().min(1).max(120).optional(),
});

const byDaysSchema = z.object({
  mode: z.literal("byDays"),
  expirationDays: z
    .number()
    .int()
    .positive()
    .refine((v) => ALLOWED_EXPIRATION.has(v), { message: "INVALID_EXPIRATION" }),
  includeQr: z.boolean().optional().default(true),
  lazyQr: z.boolean().optional().default(false),
  name: z.string().min(1).max(120).optional(),
});

const singleDaySchema = z.object({
  mode: z.literal("singleDay"),
  // ISO date without time, e.g., 2025-09-11
  singleDayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  includeQr: z.boolean().optional().default(true),
  lazyQr: z.boolean().optional().default(false),
  name: z.string().min(1).max(120).optional(),
});

const singleHourSchema = z.object({
  mode: z.literal('singleHour'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().positive().min(5).max(720).optional().default(60),
  includeQr: z.boolean().optional().default(true),
  lazyQr: z.boolean().optional().default(false),
  name: z.string().min(1).max(120).optional(),
});

const plannedCountsSchema = z.object({
  mode: z.literal('plannedCounts'),
  items: z.array(z.object({ prizeId: z.string().min(1), count: z.number().int().min(0) })).min(1),
  includeQr: z.boolean().optional().default(true),
  lazyQr: z.boolean().optional().default(false),
  name: z.string().min(1).max(120).optional(),
  expirationDays: z
    .number()
    .int()
    .positive()
    .refine((v) => ALLOWED_EXPIRATION.has(v), { message: "INVALID_EXPIRATION" })
    .optional(),
});

const schema = z.union([legacySchema, byDaysSchema, singleDaySchema, singleHourSchema, plannedCountsSchema]);

export async function POST(req: Request) {
  // Rate limit per IP (same window/limit as redeem) to prevent abuse of auto generation
  const ipHeader = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const ip = ipHeader.split(",")[0].trim();
  const rl = checkRateLimit(`generateAll:${ip}`);
  if (!rl.ok) {
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", {
      reason: "RATE_LIMIT",
      retryAfterSeconds: rl.retryAfterSeconds,
    });
    return apiError('RATE_LIMIT', 'Rate limit exceeded', { retryAfterSeconds: rl.retryAfterSeconds }, 429, { 'Retry-After': rl.retryAfterSeconds.toString() });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    if ((flat.fieldErrors as any)?.expirationDays) {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_EXPIRATION" });
      return apiError('INVALID_EXPIRATION', 'Expiración inválida', undefined, 400);
    }
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "BAD_REQUEST" });
    return apiError('BAD_REQUEST', 'Solicitud inválida', { details: flat }, 400);
  }

  // Normalize inputs for downstream logic, keeping legacy behavior intact.
  let mode: "byDays" | "singleDay" | 'singleHour' | 'plannedCounts' = "byDays";
  let expirationDays: number | null = null;
  let includeQr = true;
  let lazyQr = false;
  let providedName: string | undefined;
  let singleDayStart: DateTime | null = null;
  let singleDayEnd: DateTime | null = null;
  let singleHourWindowStart: Date | null = null;
  let singleHourWindowEnd: Date | null = null;
  let singleHourDuration: number | null = null;

  if ("mode" in parsed.data) {
    if (parsed.data.mode === "byDays") {
      mode = "byDays";
      expirationDays = parsed.data.expirationDays;
      includeQr = parsed.data.includeQr;
      lazyQr = parsed.data.lazyQr;
      providedName = parsed.data.name;
    } else if (parsed.data.mode === 'singleDay') {
      mode = "singleDay";
      includeQr = parsed.data.includeQr;
      lazyQr = parsed.data.lazyQr;
      providedName = parsed.data.name;
  // Usar zona horaria de Lima para evitar confusiones de fin de día
  const dt = DateTime.fromISO(parsed.data.singleDayDate, { zone: "America/Lima" });
      if (!dt.isValid) {
        await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "BAD_REQUEST" });
        return apiError('BAD_REQUEST', 'Fecha inválida', { details: 'INVALID_DATE' }, 400);
      }
      singleDayStart = dt.startOf("day");
      singleDayEnd = dt.endOf("day");
      // For now, generate with a 1-day expiration; post-processing will adjust to endOfDay.
      expirationDays = 1;
    } else if (parsed.data.mode === 'singleHour') {
      // singleHour
      mode = 'singleHour';
      includeQr = parsed.data.includeQr;
      lazyQr = parsed.data.lazyQr;
      providedName = parsed.data.name;
      singleHourDuration = parsed.data.durationMinutes;
      const base = DateTime.fromISO(parsed.data.date, { zone: 'America/Lima' });
      if (!base.isValid) {
        await logEvent('BATCH_AUTO_FAIL', 'Auto batch fallo', { reason: 'BAD_REQUEST' });
        return apiError('BAD_REQUEST', 'Fecha inválida', { details: 'INVALID_DATE' }, 400);
      }
      const [hh, mm] = parsed.data.hour.split(':').map(Number);
      // Construir hora exacta manualmente (evitando métodos luxon que TS no reconoce en la versión instalada)
      const jsBase = base.toJSDate();
      const jsStart = new Date(jsBase.getTime()); // base a medianoche Lima en UTC ajustado por luxon
      jsStart.setHours(hh, mm, 0, 0); // esto ajusta en la zona local del servidor; aceptamos pequeño desfase si TZ difiere.
      singleHourWindowStart = jsStart;
      singleHourWindowEnd = new Date(jsStart.getTime() + singleHourDuration * 60000);
      if (!singleHourWindowEnd) {
        return apiError('BAD_REQUEST', 'Ventana inválida', { details: 'INVALID_WINDOW' }, 400);
      }
      // Internamente seguimos usando expirationDays=1 para permitir firma coherente; será reemplazado con update.
      expirationDays = 1;
    } else {
      // plannedCounts
      mode = 'plannedCounts';
      includeQr = parsed.data.includeQr;
      lazyQr = parsed.data.lazyQr;
      providedName = parsed.data.name;
      if (parsed.data.expirationDays == null) {
        await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_EXPIRATION" });
        return apiError('INVALID_EXPIRATION', 'Expiración inválida', undefined, 400);
      }
      expirationDays = parsed.data.expirationDays;
    }
  } else {
    // Legacy payload without mode
    expirationDays = parsed.data.expirationDays;
    includeQr = parsed.data.includeQr;
    lazyQr = parsed.data.lazyQr;
    providedName = parsed.data.name;
  }
  const name = (providedName || "Lote").trim().slice(0, 120);

  // Assemble prizeRequests depending on mode
  let prizeRequests: { prizeId: string; count: number; expirationDays: number }[] = [];
  if (mode === 'plannedCounts') {
    // Validate items against DB and compute pairing constraint
    const pc = parsed.data as any;
    const itemIds = (pc.items as any[]).map((i: any) => i.prizeId);
    const prizeDefs = await prisma.prize.findMany({ where: { id: { in: itemIds } }, select: { id: true, key: true, active: true, label: true, color: true } });
    const missing = itemIds.filter(id => !prizeDefs.some(p => p.id === id));
    if (missing.length) {
      await logEvent('BATCH_AUTO_FAIL', 'Auto batch fallo', { reason: 'PRIZE_NOT_FOUND', missing });
      return apiError('PRIZE_NOT_FOUND', 'Premio no encontrado', { missing }, 400);
    }
    // Pairing constraint: functional must be >= retry
    const retryCount = (pc.items as any[]).reduce((a:number, it:any) => a + (prizeDefs.find(p=>p.id===it.prizeId)?.key === 'retry' ? it.count : 0), 0);
    const functionalCount = (pc.items as any[]).reduce((a:number, it:any) => a + ((['retry','lose'].includes(prizeDefs.find(p=>p.id===it.prizeId)?.key || '')) ? 0 : it.count), 0);
    if (retryCount > functionalCount) {
      await logEvent('BATCH_AUTO_FAIL','Auto batch fallo',{ reason: 'PAIRING_INSUFFICIENT', retryCount, functionalCount });
      return apiError('PAIRING_INSUFFICIENT','Stock insuficiente para parear retry con tokens funcionales',{ retryCount, functionalCount },400);
    }
    prizeRequests = (pc.items as any[]).map((it:any) => ({ prizeId: it.prizeId, count: it.count, expirationDays: expirationDays as number }));
  } else {
    // Fetch active prizes with stock > 0
    const prizes = await prisma.prize.findMany({
      where: { active: true, stock: { not: null, gt: 0 } },
      select: { id: true, stock: true, key: true, label: true, color: true },
    });
    if (!prizes.length) {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "NO_ACTIVE_PRIZES" });
      return apiError('NO_ACTIVE_PRIZES', 'No hay premios activos', undefined, 400);
    }
    // Validate stock values
    for (const p of prizes as Array<{ id: string; stock: number | null }>) {
      if (typeof p.stock !== "number" || !Number.isInteger(p.stock) || p.stock <= 0) {
        await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_STOCK", prizeId: p.id });
        return apiError('INVALID_STOCK', 'Stock inválido', { prizeId: p.id }, 400);
      }
    }
    // Pairing constraint based on current active stocks
    try {
      const retryCount = prizes.filter((p: any) => p.key === 'retry').reduce((a: number, p: any) => a + (p.stock || 0), 0);
      const functionalCount = prizes.filter((p: any) => p.key !== 'retry' && p.key !== 'lose').reduce((a: number, p: any) => a + (p.stock || 0), 0);
      if (retryCount > functionalCount) {
        await logEvent('BATCH_AUTO_FAIL', 'Auto batch fallo', { reason: 'PAIRING_INSUFFICIENT', retryCount, functionalCount });
        return apiError('PAIRING_INSUFFICIENT', 'Stock insuficiente para parear retry con tokens funcionales', { retryCount, functionalCount }, 400);
      }
    } catch {}
    // Build prizeRequests from stock
    prizeRequests = prizes.map((p: { id: string; stock: number | null }) => ({ prizeId: p.id, count: p.stock as number, expirationDays: expirationDays as number }));
  }

  // Enforce total tokens limit
  const totalTokensRequested = prizeRequests.reduce((a: number, p: { count: number }) => a + (p.count || 0), 0);
  const max = parseInt(process.env.BATCH_MAX_TOKENS_AUTO || "10000");
  if (totalTokensRequested > max) {
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", {
      reason: "LIMIT_EXCEEDED",
      requested: totalTokensRequested,
      max,
    });
    return apiError('LIMIT_EXCEEDED', 'Límite excedido', { requested: totalTokensRequested, max }, 400);
  }

  let batch, tokens, meta, prizeEmittedTotals;
  try {
    const generator = mode === 'plannedCounts' ? generateBatchPlanned : generateBatchCore;
    const res = await generator(prizeRequests, {
      description: name,
      includeQr,
      lazyQr,
      expirationDays,
    });
    batch = res.batch;
    tokens = res.tokens;
    meta = res.meta;
    prizeEmittedTotals = res.prizeEmittedTotals;
  } catch (e: any) {
    if (e.message === "NO_PRIZES") {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "NO_PRIZES" });
      return apiError('NO_PRIZES', 'Sin premios', undefined, 400);
    }
    if (e.message?.startsWith("INVALID_EXPIRATION_DAYS:")) {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_EXPIRATION" });
      return apiError('INVALID_EXPIRATION', 'Expiración inválida', undefined, 400);
    }
    if (e instanceof InsufficientStockError || e.message === "INSUFFICIENT_STOCK") {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_STOCK" });
      return apiError('INVALID_STOCK', 'Stock inválido', undefined, 400);
    }
    if (e instanceof RaceConditionError || e.message === "RACE_CONDITION") {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", {
        reason: "RACE_CONDITION",
        prizeId: e.prizeId,
      });
      await logEvent("BATCH_AUTO_FAIL", undefined, { reason: "RACE_CONDITION" });
      return apiError('RACE_CONDITION', 'Condición de carrera', { prizeId: e.prizeId }, 409);
    }
    console.error("[AUTO_BATCH_ERROR]", e);
    await logEvent("BATCH_AUTO_ERROR", "Fallo batch auto", { message: e?.message });
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "AUTO_BATCH_FAILED" });
    const details: any = {};
    if (process.env.NODE_ENV !== 'production') details.debug = e?.message;
    return apiError('AUTO_BATCH_FAILED', 'Fallo al generar lote automático', details, 500);
  }

  // Post-process for single-day mode: adjust expiresAt to endOfDay and toggle disabled for future dates.
  if (mode === "singleDay" && batch?.id && singleDayEnd && singleDayStart) {
  // Comparación en zona Lima: si el día seleccionado es futuro, los tokens se crean deshabilitados y se podrán habilitar el mismo día.
  const nowStart = DateTime.now().setZone("America/Lima").startOf("day");
    const isFutureDay = singleDayStart.toJSDate().getTime() > nowStart.toJSDate().getTime();
    await prisma.token.updateMany({
      where: { batchId: batch.id },
      data: {
        expiresAt: singleDayEnd.toJSDate(),
        disabled: isFutureDay,
      },
    });
    await logEvent("BATCH_SINGLE_DAY_POST", "post-proceso singleDay aplicado", {
      batchId: batch.id,
      singleDayDate: singleDayStart.toISO(),
      isFutureDay,
    });
    // Reload tokens from DB to reflect updated fields; map to the expected in-memory shape
    const fresh = await prisma.token.findMany({
      where: { batchId: batch.id },
      include: { prize: { select: { key: true, label: true, color: true } } },
      orderBy: { id: "asc" },
    });
    tokens = fresh.map((t: any) => ({
      id: t.id,
      prizeId: t.prizeId,
      prizeKey: t.prize.key,
      prizeLabel: t.prize.label,
      prizeColor: t.prize.color ?? null,
      expiresAt: t.expiresAt,
      signature: t.signature,
      signatureVersion: t.signatureVersion,
      disabled: t.disabled,
    }));
  }

  // Post-process for singleHour mode: adjust validFrom + expiresAt window, set disabled if future
  if (mode === 'singleHour' && batch?.id && singleHourWindowStart && singleHourWindowEnd && singleHourDuration) {
    const isFutureWindow = singleHourWindowStart.getTime() > Date.now();
    await prisma.token.updateMany({
      where: { batchId: batch.id },
      data: {
        expiresAt: singleHourWindowEnd,
        disabled: isFutureWindow,
      }
    });
    // Raw SQL para setear validFrom sin que el tipo del cliente actual (pre-migrate) bloquee
    try {
      await prisma.$executeRawUnsafe(`UPDATE \"Token\" SET \"validFrom\" = $1 WHERE \"batchId\" = $2`, singleHourWindowStart as any, batch.id as any);
    } catch (e) {
      console.error('[singleHour.validFrom.update.error]', e);
    }
    await logEvent('BATCH_SINGLE_HOUR_POST', 'post-proceso singleHour aplicado', {
      batchId: batch.id,
      windowStart: singleHourWindowStart.toISOString(),
      windowEnd: singleHourWindowEnd.toISOString(),
      durationMinutes: singleHourDuration,
      isFutureWindow,
    });
    const fresh = await prisma.token.findMany({
      where: { batchId: batch.id },
      include: { prize: { select: { key: true, label: true, color: true } } },
      orderBy: { id: 'asc' },
    });
    tokens = fresh.map((t: any) => ({
      id: t.id,
      prizeId: t.prizeId,
      prizeKey: t.prize.key,
      prizeLabel: t.prize.label,
      prizeColor: t.prize.color ?? null,
      expiresAt: t.expiresAt,
      signature: t.signature,
      signatureVersion: t.signatureVersion,
      disabled: t.disabled,
    }));
    // Adjuntar metadata de la ventana en meta (no destructivo)
    meta = {
      ...meta,
      windowStartIso: singleHourWindowStart.toISOString(),
      windowEndIso: singleHourWindowEnd.toISOString(),
      windowDurationMinutes: singleHourDuration,
      windowMode: 'hour',
    } as any;
  }

  // Build manifest & ZIP (sustituye implementación previa del endpoint manual)
  const csvColumns = [
    "token_id",
    "batch_id",
    "prize_id",
    "prize_key",
    "prize_label",
    "prize_color",
    "paired_next_token_id",
    "expires_at_iso",
    "expires_at_unix",
    "signature",
    "redeem_url",
    "redeemed_at",
    "disabled",
  ];
  const csvRows: string[] = [csvColumns.join(",")];
  const grouped = new Map<string, any[]>();
  for (const t of tokens) {
    if (!grouped.has(t.prizeId)) grouped.set(t.prizeId, []);
    grouped.get(t.prizeId)!.push(t);
  }
  const manifest: any = {
    batchId: batch.id,
    name,
    createdAt: batch.createdAt.toISOString(),
    prizes: [] as any[],
    meta,
  };
  // Ensure required meta fields are present (non-destructive merge)
  const metaAny: any = meta;
  manifest.meta = {
    ...manifest.meta,
    mode: meta.mode,
    expirationDays: meta.expirationDays,
    aggregatedPrizeCount: meta.aggregatedPrizeCount,
    totalTokens: meta.totalTokens,
    qrMode: meta.qrMode,
    prizeEmittedTotals,
    pairing: { strategy: 'retry->functional', excludes: ['retry','lose'] },
    ...(metaAny.windowMode ? { windowStartIso: metaAny.windowStartIso, windowEndIso: metaAny.windowEndIso, windowDurationMinutes: metaAny.windowDurationMinutes, windowMode: metaAny.windowMode } : {}),
  };
  const { archive, stream } = createZipStream();
  for (const req of prizeRequests) {
    const list = grouped.get(req.prizeId) || [];
    const first = list[0];
    manifest.prizes.push({
      prizeId: req.prizeId,
      prizeKey: first?.prizeKey,
      prizeLabel: first?.prizeLabel,
      count: list.length,
      expirationDays: req.expirationDays,
    });
    const baseUrl = getPublicBaseUrl();
    for (const t of list) {
      const redeemUrl = `${baseUrl}/r/${t.id}`;
      csvRows.push(
        [
          t.id,
          batch.id,
          t.prizeId,
          t.prizeKey,
          t.prizeLabel,
          t.prizeColor ?? "",
          (t as any).pairedNextTokenId || "",
          t.expiresAt.toISOString(),
          Math.floor(t.expiresAt.getTime() / 1000).toString(),
          t.signature,
          redeemUrl,
          "",
          (t as any).disabled ? "true" : "false",
        ]
          .map(csvEscape)
          .join(",")
      );
      const shouldEmbedQr = !lazyQr && includeQr;
      if (shouldEmbedQr) {
        const dataUrl = await generateQrPngDataUrl(redeemUrl);
        const base64 = dataUrl.split(",")[1];
        archive.append(Buffer.from(base64, "base64"), { name: `png/${t.id}.png` });
      }
    }
  }
  const totalTokens = manifest.prizes.reduce((a: number, p: any) => a + p.count, 0);
  manifest.totals = { tokens: totalTokens, prizes: manifest.prizes.length };

  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.append(csvRows.join("\n"), { name: "tokens.csv" });
  archive.finalize();

  await logEvent("BATCH_AUTO_CREATE", `lote auto ${batch.id} (${name}) creado`, manifest);
  await logEvent("BATCH_AUTO_OK", "Auto batch generado", {
    prizes: manifest.prizes.length,
    tokens: manifest.meta.totalTokens,
    expirationDays,
    mode: manifest.meta.mode,
    name,
    prizeEmittedTotals: manifest.meta.prizeEmittedTotals,
  });

  function slugify(str: string) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) || "lote";
  }
  const slug = slugify(name);
  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${slug}_${batch.id}.zip`,
      "Cache-Control": "no-store",
    },
  });
}

function csvEscape(val: string) {
  if (val == null) return "";
  const needs = /[",\n\r]/.test(val);
  if (!needs) return val;
  return '"' + val.replace(/"/g, '""') + '"';
}
