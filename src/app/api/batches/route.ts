import { prisma } from "@/lib/prisma";

// Evitar prerender en build: esta API depende de la DB
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/batches
// Returns batches with counts: total, redeemed, expired, active
export async function GET() {
  // Fetch batches basic data
  const batches = await prisma.batch.findMany({ orderBy: { createdAt: "desc" } });
  if (!batches.length) {
    return new Response(JSON.stringify([]), { status: 200 });
  }
  const batchIds = batches.map((b) => b.id);

  // Aggregate counts per batch:
  // We use groupBy twice (total & redeemed) and custom query for expired to minimize logic.
  const totals = await prisma.token.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds } },
    _count: { _all: true },
  });
  const redeemed = await prisma.token.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds }, redeemedAt: { not: null } },
    _count: { _all: true },
  });
  const now = new Date();
  const expired = await prisma.token.groupBy({
    by: ["batchId"],
    where: { batchId: { in: batchIds }, expiresAt: { lt: now }, redeemedAt: null },
    _count: { _all: true },
  });

  const mapTotals = new Map(totals.map((t) => [t.batchId, t._count._all]));
  const mapRedeemed = new Map(redeemed.map((t) => [t.batchId, t._count._all]));
  const mapExpired = new Map(expired.map((t) => [t.batchId, t._count._all]));

  const rows = batches.map((b) => {
    const total = mapTotals.get(b.id) || 0;
    const red = mapRedeemed.get(b.id) || 0;
    const exp = mapExpired.get(b.id) || 0;
    const active = total - red - exp;
    return {
      id: b.id,
      description: b.description,
      createdAt: b.createdAt,
      createdBy: b.createdBy,
      counts: { total, redeemed: red, expired: exp, active },
    };
  });

  return new Response(JSON.stringify(rows), { status: 200 });
}
