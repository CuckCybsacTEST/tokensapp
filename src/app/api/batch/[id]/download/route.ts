import { Readable } from "stream";

import { logEvent } from "@/lib/log";
import { prisma } from "@/lib/prisma";
import { generateQrPngDataUrl } from "@/lib/qr";
import { createZipStream } from "@/lib/zip";
import { getPublicBaseUrl } from "@/lib/config";

// GET /api/batch/:id/download?qr=1 (qr=1 => incluye PNGs)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const batchId = params.id;
  const url = new URL(req.url);
  const includeQr = url.searchParams.get("qr") === "1";

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { tokens: { include: { prize: true } } },
  });
  if (!batch) {
    return new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 });
  }

  const { archive, stream } = createZipStream();

  const manifest: any = {
    batchId: batch.id,
    createdAt: batch.createdAt.toISOString(),
    description: batch.description ?? null,
    prizes: [] as any[],
  };

  const byPrize = new Map<string, typeof batch.tokens>();
  for (const t of batch.tokens) {
    if (!byPrize.has(t.prizeId)) byPrize.set(t.prizeId, [] as any);
    byPrize.get(t.prizeId)!.push(t);
  }

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
  const baseUrl = getPublicBaseUrl(req.url);

  for (const [prizeId, tokens] of byPrize) {
    const prize = tokens[0].prize;
    manifest.prizes.push({
      prizeId,
      prizeKey: prize.key,
      prizeLabel: prize.label,
      count: tokens.length,
    });
    for (const t of tokens) {
      const redeemUrl = `${baseUrl}/r/${t.id}`;
      csvRows.push(
        [
          t.id,
          batch.id,
          t.prizeId,
          prize.key,
          prize.label,
          prize.color ?? "",
          t.expiresAt.toISOString(),
          Math.floor(t.expiresAt.getTime() / 1000).toString(),
          t.signature,
          redeemUrl,
          t.redeemedAt ? t.redeemedAt.toISOString() : "",
          t.disabled ? "true" : "false",
        ]
          .map(csvEscape)
          .join(",")
      );
      if (includeQr) {
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

  await logEvent("BATCH_EXPORT", `batch ${batch.id} exportado`, { includeQr });

  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=batch_${batch.id}.zip`,
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
