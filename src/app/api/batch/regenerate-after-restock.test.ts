import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { initTestDb } from "@/lib/setupTestDb";

let autoGenerate: any;
let parseBatchZip: any;
let invalidatePrizeCache: any;
let prisma: PrismaClient;

async function mkRequest(body: any) {
  const req = new Request("http://localhost/api/batch/generate-all", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return autoGenerate(req as any);
}

beforeAll(async () => {
  process.env.TOKEN_SECRET = "auto_secret";
  prisma = await initTestDb("test_regenerate_restock.db");
  (global as any)._prisma = prisma;
  ({ POST: autoGenerate } = await import("./generate-all/route"));
  ({ parseBatchZip } = await import("@/test/zipTestUtils"));
  ({ invalidatePrizeCache } = await import("@/lib/prizeCache"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  invalidatePrizeCache();
});

describe("regenerate after restock", () => {
  it("initial 4 then restock 2 -> totals emittedTotal=6 and second batch only 2 tokens", async () => {
    // Insert prize with stock=4
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active,emittedTotal) VALUES ('pR','kR','Premio R',4,1,0);`
    );

    // First generation
    const firstRes = await mkRequest({ expirationDays: 5, includeQr: false });
    expect(firstRes.status).toBe(200);
    const firstZip = await firstRes.arrayBuffer();
    const { manifest: manifest1 } = await parseBatchZip(firstZip);
    expect(manifest1.meta.totalTokens).toBe(4);

    let prize: any = await prisma.prize.findUnique({ where: { id: "pR" } });
    expect(prize.stock).toBe(0);
    expect(prize.emittedTotal).toBe(4);

    // Restock with +2
    await prisma.prize.update({ where: { id: "pR" }, data: { stock: 2 } });
    invalidatePrizeCache(); // ensure cache sees new stock

    // Second generation (should only create 2 tokens more)
    const secondRes = await mkRequest({ expirationDays: 5, includeQr: false });
    expect(secondRes.status).toBe(200);
    const secondZip = await secondRes.arrayBuffer();
    const { manifest: manifest2 } = await parseBatchZip(secondZip);
    expect(manifest2.meta.totalTokens).toBe(2);

    prize = await prisma.prize.findUnique({ where: { id: "pR" } });
    expect(prize.stock).toBe(0);
    expect(prize.emittedTotal).toBe(6);
  });
});
