import { prisma } from "@/lib/prisma";
import { getPublicBaseUrl } from "@/lib/config";
import { getSessionCookieFromRequest, verifySessionCookie, requireRole } from "@/lib/auth";
import { Readable } from "stream";

// GET /api/batch/:id/export
// Returns a text/csv stream with token details for the batch
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // Auth: ADMIN only
  const raw = getSessionCookieFromRequest(req);
  const session = await verifySessionCookie(raw);
  const ok = requireRole(session, ["ADMIN"]);
  if (!ok.ok) {
    return new Response(JSON.stringify({ error: "FORBIDDEN" }), { status: 403 });
  }
  const batchId = params.id;

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      tokens: { include: { prize: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!batch) {
    return new Response(JSON.stringify({ error: "NOT_FOUND" }), { status: 404 });
  }

  const baseUrl = getPublicBaseUrl(req.url);

  // CSV columns
  const headers = [
    "token_id",
    "batch_id",
    "batch_description",
    "prize_id",
    "prize_key",
    "prize_label",
    "prize_color",
    "assigned_prize_id",
    "created_at_iso",
    "expires_at_iso",
    "expires_at_unix",
    "signature",
    "redeem_url",
    "revealed_at",
    "redeemed_at",
    "delivered_at",
    "delivered_by_user_id",
    "disabled",
  ];

  const lines: string[] = [];
  lines.push(headers.join(","));

  for (const t of batch.tokens) {
    const redeemUrl = `${baseUrl}/r/${t.id}`;
    const row = [
      t.id,
      batch.id,
      batch.description ?? "",
      t.prizeId,
      t.prize?.key ?? "",
      t.prize?.label ?? "",
      t.prize?.color ?? "",
      t.assignedPrizeId ?? "",
      t.createdAt.toISOString(),
      t.expiresAt.toISOString(),
      Math.floor(t.expiresAt.getTime() / 1000).toString(),
      t.signature,
      redeemUrl,
      t.revealedAt ? t.revealedAt.toISOString() : "",
      t.redeemedAt ? t.redeemedAt.toISOString() : "",
      t.deliveredAt ? t.deliveredAt.toISOString() : "",
      t.deliveredByUserId ?? "",
      t.disabled ? "true" : "false",
    ].map(csvEscape);
    lines.push(row.join(","));
  }

  const csv = lines.join("\n");

  // Stream the CSV
  const stream = Readable.from([csv]);
  return new Response(Readable.toWeb(stream) as any, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=batch_${batch.id}.csv`,
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
