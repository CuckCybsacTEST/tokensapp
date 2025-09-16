import { Readable } from "stream";
import { z } from "zod";
import { DateTime } from "luxon";

import {
  generateBatchCore,
  InsufficientStockError,
  RaceConditionError,
} from "@/lib/batch/generateBatchCore";
import { logEvent } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

const ALLOWED_EXPIRATION = new Set([1, 3, 5, 7, 15, 30]);
import { generateQrPngDataUrl } from "@/lib/qr";
import { createZipStream } from "@/lib/zip";

// Body (legacy): { expirationDays: number, includeQr?: boolean, lazyQr?: boolean, name?: string }
// Body (new byDays): { mode: 'byDays', expirationDays: number, includeQr?: boolean, lazyQr?: boolean, name?: string }
// Body (new singleDay): { mode: 'singleDay', singleDayDate: 'YYYY-MM-DD', includeQr?: boolean, lazyQr?: boolean, name?: string }
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

const schema = z.union([legacySchema, byDaysSchema, singleDaySchema]);

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
    return new Response(
      JSON.stringify({ error: "RATE_LIMIT", retryAfterSeconds: rl.retryAfterSeconds }),
      { status: 429, headers: { "Retry-After": rl.retryAfterSeconds.toString() } }
    );
  }
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    // Preserve legacy-specific error mapping for expirationDays
    if ((flat.fieldErrors as any)?.expirationDays) {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_EXPIRATION" });
      return new Response(JSON.stringify({ error: "INVALID_EXPIRATION" }), { status: 400 });
    }
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "BAD_REQUEST" });
    return new Response(JSON.stringify({ error: "BAD_REQUEST", details: flat }), { status: 400 });
  }

  // Normalize inputs for downstream logic, keeping legacy behavior intact.
  let mode: "byDays" | "singleDay" = "byDays";
  let expirationDays: number | null = null;
  let includeQr = true;
  let lazyQr = false;
  let providedName: string | undefined;
  let singleDayStart: DateTime | null = null;
  let singleDayEnd: DateTime | null = null;

  if ("mode" in parsed.data) {
    if (parsed.data.mode === "byDays") {
      mode = "byDays";
      expirationDays = parsed.data.expirationDays;
      includeQr = parsed.data.includeQr;
      lazyQr = parsed.data.lazyQr;
      providedName = parsed.data.name;
    } else {
      mode = "singleDay";
      includeQr = parsed.data.includeQr;
      lazyQr = parsed.data.lazyQr;
      providedName = parsed.data.name;
      const dt = DateTime.fromISO(parsed.data.singleDayDate, { zone: "system" });
      if (!dt.isValid) {
        await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "BAD_REQUEST" });
        return new Response(JSON.stringify({ error: "BAD_REQUEST", details: "INVALID_DATE" }), { status: 400 });
      }
      singleDayStart = dt.startOf("day");
      singleDayEnd = dt.endOf("day");
      // For now, generate with a 1-day expiration; post-processing will adjust to endOfDay.
      expirationDays = 1;
    }
  } else {
    // Legacy payload without mode
    expirationDays = parsed.data.expirationDays;
    includeQr = parsed.data.includeQr;
    lazyQr = parsed.data.lazyQr;
    providedName = parsed.data.name;
  }
  const name = (providedName || "Lote").trim().slice(0, 120);

  // Fetch active prizes with stock > 0 (non-null) OR stock == null (unlimited?) -> per requirement only integer >0, so filter where stock not null & >0
  const prizes = await prisma.prize.findMany({
    where: { active: true, stock: { not: null, gt: 0 } },
    select: { id: true, stock: true, key: true, label: true, color: true },
  });
  if (!prizes.length) {
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "NO_ACTIVE_PRIZES" });
    return new Response(JSON.stringify({ error: "NO_ACTIVE_PRIZES" }), { status: 400 });
  }

  // Validate each prize stock (integer > 0); if any invalid, return immediately
  for (const p of prizes) {
    if (typeof p.stock !== "number" || !Number.isInteger(p.stock) || p.stock <= 0) {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", {
        reason: "INVALID_STOCK",
        prizeId: p.id,
      });
      return new Response(JSON.stringify({ error: "INVALID_STOCK", prizeId: p.id }), {
        status: 400,
      });
    }
  }

  // Build prizeRequests using full stock counts
  const prizeRequests = prizes.map((p) => ({
    prizeId: p.id,
    count: p.stock as number,
    expirationDays,
  }));

  // Enforce total tokens limit
  const totalTokensRequested = prizeRequests.reduce((a, p) => a + p.count, 0);
  const max = parseInt(process.env.BATCH_MAX_TOKENS_AUTO || "10000");
  if (totalTokensRequested > max) {
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", {
      reason: "LIMIT_EXCEEDED",
      requested: totalTokensRequested,
      max,
    });
    return new Response(
      JSON.stringify({ error: "LIMIT_EXCEEDED", requested: totalTokensRequested, max }),
      { status: 400 }
    );
  }

  let batch, tokens, meta, prizeEmittedTotals;
  try {
    const res = await generateBatchCore(prizeRequests, {
      description: name, // reuse description field as human-friendly name
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
      return new Response(JSON.stringify({ error: "NO_PRIZES" }), { status: 400 });
    }
    if (e.message?.startsWith("INVALID_EXPIRATION_DAYS:")) {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_EXPIRATION" });
      return new Response(JSON.stringify({ error: "INVALID_EXPIRATION" }), { status: 400 });
    }
    if (e instanceof InsufficientStockError || e.message === "INSUFFICIENT_STOCK") {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "INVALID_STOCK" });
      return new Response(JSON.stringify({ error: "INVALID_STOCK" }), { status: 400 });
    }
    if (e instanceof RaceConditionError || e.message === "RACE_CONDITION") {
      await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", {
        reason: "RACE_CONDITION",
        prizeId: e.prizeId,
      });
      // Segundo log explícito con solo la razón, si se requiere auditoría mínima.
      await logEvent("BATCH_AUTO_FAIL", undefined, { reason: "RACE_CONDITION" });
      return new Response(JSON.stringify({ code: "RACE_CONDITION" }), { status: 409 });
    }
    // eslint-disable-next-line no-console
    console.error("[AUTO_BATCH_ERROR]", e);
    await logEvent("BATCH_AUTO_ERROR", "Fallo batch auto", { message: e?.message });
    await logEvent("BATCH_AUTO_FAIL", "Auto batch fallo", { reason: "AUTO_BATCH_FAILED" });
    const payload: any = { error: "AUTO_BATCH_FAILED" };
    if (process.env.NODE_ENV !== "production") payload.debug = e?.message;
    return new Response(JSON.stringify(payload), { status: 500 });
  }

  // Post-process for single-day mode: adjust expiresAt to endOfDay and toggle disabled for future dates.
  if (mode === "singleDay" && batch?.id && singleDayEnd && singleDayStart) {
    const nowStart = DateTime.now().setZone("system").startOf("day");
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

  // Build manifest & ZIP (sustituye implementación previa del endpoint manual)
  const csvColumns = [
    "token_id",
    "batch_id",
    "prize_id",
    "prize_key",
    "prize_label",
    "prize_color",
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
  manifest.meta = {
    ...manifest.meta,
    mode: meta.mode,
    expirationDays: meta.expirationDays,
    aggregatedPrizeCount: meta.aggregatedPrizeCount,
    totalTokens: meta.totalTokens,
    qrMode: meta.qrMode,
    prizeEmittedTotals,
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
    for (const t of list) {
      const redeemUrl = `${process.env.PUBLIC_BASE_URL || "https://example.com"}/r/${t.id}`;
      csvRows.push(
        [
          t.id,
          batch.id,
          t.prizeId,
          t.prizeKey,
          t.prizeLabel,
          t.prizeColor ?? "",
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
