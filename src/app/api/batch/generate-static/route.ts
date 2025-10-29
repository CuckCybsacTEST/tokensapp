import { Readable } from 'stream';
import { z } from 'zod';
import { DateTime } from 'luxon';
import { prisma } from '@/lib/prisma';
import { generateBatchStatic } from '@/lib/batch/generateBatchStatic';
import { applySingleDayWindow, applySingleHourWindow } from '@/lib/batch/postProcess';
import { apiError } from '@/lib/apiError';
import { logEvent } from '@/lib/log';
import { generateQrPngDataUrl } from '@/lib/qr';
import { createZipStream } from '@/lib/zip';
import { getPublicBaseUrl } from '@/lib/config';

// Schema for static batch generation
// validity: byDays | singleDay | singleHour
const byDaysValidity = z.object({
  mode: z.literal('byDays'),
  expirationDays: z.number().int().positive().min(1).max(30)
});
const singleDayValidity = z.object({
  mode: z.literal('singleDay'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});
const singleHourValidity = z.object({
  mode: z.literal('singleHour'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.number().int().positive().min(5).max(720).default(60)
});

const validitySchema = z.union([byDaysValidity, singleDayValidity, singleHourValidity]);

const bodySchema = z.object({
  name: z.string().min(1).max(120),
  targetUrl: z.string().url().refine(u => /^https?:\/\//.test(u), 'TARGET_URL_PROTOCOL').optional(),
  prizes: z.array(z.object({ prizeId: z.string().min(1), count: z.number().int().positive().max(100000) })).min(1),
  validity: validitySchema,
  includeQr: z.boolean().optional().default(true),
  lazyQr: z.boolean().optional().default(false)
});

export async function POST(req: Request) {
  let parsed;
  try {
    const json = await req.json();
    parsed = bodySchema.safeParse(json);
  } catch {
    return apiError('BAD_REQUEST', 'JSON inválido', undefined, 400);
  }
  if (!parsed.success) {
    return apiError('BAD_REQUEST', 'Datos inválidos', { issues: parsed.error.issues }, 400);
  }
  const { name, targetUrl, prizes, validity, includeQr, lazyQr } = parsed.data;

  // Validate prizes existence & fetch minimal info
  const prizeIds = [...new Set(prizes.map(p => p.prizeId))];
  const dbPrizes = await prisma.prize.findMany({ where: { id: { in: prizeIds }, active: true }, select: { id: true, key: true, label: true, color: true, stock: true } });
  if (dbPrizes.length !== prizeIds.length) {
    return apiError('PRIZE_NOT_FOUND', 'Algún premio no existe o está inactivo', { prizeIds }, 400);
  }

  // Validate sufficient stock for each prize
  for (const reqP of prizes) {
    const dbp = dbPrizes.find(p => p.id === reqP.prizeId)!;
    if (typeof dbp.stock !== 'number' || dbp.stock < reqP.count) {
      return apiError('INSUFFICIENT_STOCK', 'Stock insuficiente', { prizeId: dbp.id, have: dbp.stock, need: reqP.count }, 400);
    }
  }

  // Determine base expirationDays for initial generation (will be patched for singleDay/hour)
  let baseExpirationDays: number = 1;
  if (validity.mode === 'byDays') baseExpirationDays = validity.expirationDays;

  // Prepare prizeRequests with exact counts
  const prizeRequests = prizes.map(p => ({ prizeId: p.prizeId, count: p.count, expirationDays: baseExpirationDays }));

  let result;
  try {
    result = await generateBatchStatic(prizeRequests, { description: name, includeQr, lazyQr, expirationDays: baseExpirationDays });
  } catch (e: any) {
    return apiError('STATIC_GEN_FAIL', 'Fallo generación', { message: e?.message }, 500);
  }

  // Anotar batch como estático con URL destino ANTES del post-proceso
  console.log(`[GENERATE-STATIC] Setting staticTargetUrl for batch ${result.batch.id}, targetUrl: ${targetUrl}`);
  await prisma.batch.update({ where: { id: result.batch.id }, data: { staticTargetUrl: targetUrl || '' } as any });
  console.log(`[GENERATE-STATIC] staticTargetUrl set successfully`);

  // Post-processing validity
  console.log(`[GENERATE-STATIC] Starting post-processing for batch ${result.batch.id}, validity mode: ${validity.mode}`);
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;
  if (validity.mode === 'singleDay') {
    console.log(`[GENERATE-STATIC] Processing singleDay for batch ${result.batch.id}, date: ${validity.date}`);
    // Validate that the date is not in the past
    const dt = DateTime.fromISO(validity.date, { zone: 'America/Lima' });
    if (!dt.isValid) return apiError('INVALID_DATE', 'Fecha inválida', undefined, 400);
    const now = DateTime.now().setZone('America/Lima').startOf('day');
    if (dt.startOf('day') < now) return apiError('PAST_DATE', 'No se pueden crear lotes para fechas pasadas', undefined, 400);
    
    try {
      const r = await applySingleDayWindow({ batchId: result.batch.id, isoDate: validity.date });
      windowStart = r.windowStart; windowEnd = r.windowEnd;
    } catch { return apiError('INVALID_DATE', 'Fecha inválida', undefined, 400); }
  } else if (validity.mode === 'singleHour') {
    // Validate that the date/time is not in the past
    const base = DateTime.fromISO(validity.date, { zone: 'America/Lima' });
    if (!base.isValid) return apiError('INVALID_DATE', 'Fecha inválida', undefined, 400);
    const [hh, mm] = validity.hour.split(':').map(Number);
    const startDateTime = base.set({ hour: hh, minute: mm, second: 0, millisecond: 0 });
    const now = DateTime.now().setZone('America/Lima');
    if (startDateTime < now) return apiError('PAST_DATE', 'No se pueden crear lotes para fechas/horas pasadas', undefined, 400);
    
    try {
      const r = await applySingleHourWindow({ batchId: result.batch.id, isoDate: validity.date, hour: validity.hour, durationMinutes: validity.durationMinutes });
      windowStart = r.windowStart; windowEnd = r.windowEnd;
    } catch { return apiError('INVALID_DATE', 'Fecha inválida', undefined, 400); }
  }

  // Reload tokens for manifest/CSV (need updated expiresAt/disabled)
  const tokens = await prisma.token.findMany({
    where: { batchId: result.batch.id },
    include: { prize: { select: { key: true, label: true, color: true } } }
  });

  // Build ZIP
  const { archive, stream } = createZipStream();
  const csvColumns = ['token_id','batch_id','prize_id','prize_key','prize_label','prize_color','expires_at_iso','expires_at_unix','signature','redirect_url','redeemed_at','disabled'];
  const csvRows: string[] = [csvColumns.join(',')];
  const baseUrl = getPublicBaseUrl();

  const grouped = new Map<string, any[]>();
  for (const t of tokens) {
    if (!grouped.has(t.prizeId)) grouped.set(t.prizeId, []);
    grouped.get(t.prizeId)!.push(t);
  }

  const manifest: any = {
    batchId: result.batch.id,
    name,
    createdAt: result.batch.createdAt.toISOString(),
    prizes: [] as any[],
    meta: {
      mode: 'static',
      static: true,
      staticTargetUrl: targetUrl,
      validityMode: validity.mode,
      windowStartIso: windowStart?.toISOString() || null,
      windowEndIso: windowEnd?.toISOString() || null,
      totalTokens: tokens.length,
      qrMode: includeQr ? (lazyQr ? 'lazy' : 'eager') : 'none'
    }
  };

  for (const [prizeId, list] of grouped.entries()) {
    const first = list[0];
    manifest.prizes.push({ prizeId, prizeKey: first.prize.key, prizeLabel: first.prize.label, count: list.length });
    for (const t of list) {
      const redirectUrl = `${baseUrl}/static/${t.id}`;
      csvRows.push([
        t.id,
        result.batch.id,
        prizeId,
        first.prize.key,
        first.prize.label,
        first.prize.color || '',
        t.expiresAt.toISOString(),
        Math.floor(t.expiresAt.getTime() / 1000).toString(),
        t.signature,
        redirectUrl,
        '',
        t.disabled ? 'true' : 'false'
      ].map(csvEscape).join(','));
      if (includeQr && !lazyQr) {
        const dataUrl = await generateQrPngDataUrl(redirectUrl);
        const base64 = dataUrl.split(',')[1];
        archive.append(Buffer.from(base64, 'base64'), { name: `png/${t.id}.png` });
      }
    }
  }

  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });
  archive.append(csvRows.join('\n'), { name: 'tokens.csv' });
  archive.finalize();

  await logEvent('STATIC_BATCH_CREATE', 'lote estático creado', { batchId: result.batch.id, targetUrl, tokens: tokens.length });

  const slug = slugify(name);
  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=${slug}_${result.batch.id}.zip`,
      'Cache-Control': 'no-store'
    }
  });
}

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0,50) || 'lote';
}

function csvEscape(val: string) {
  if (val == null) return '';
  const needs = /[",\n\r]/.test(val);
  if (!needs) return val;
  return '"' + val.replace(/"/g, '""') + '"';
}
