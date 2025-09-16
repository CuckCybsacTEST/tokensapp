import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { initTestDb } from "@/test/setupTestDb";

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
  prisma = await initTestDb("test_prize_consume.db");
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

describe("auto generate-all consumes stock and increments emittedTotal", () => {
  it("consumes two prizes (3 and 2) -> total 5 tokens, stock becomes 0, emittedTotal increments", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active,emittedTotal) VALUES ('p1','k1','Premio A',3,1,0);`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active,emittedTotal) VALUES ('p2','k2','Premio B',2,1,0);`
    );

  const res = await mkRequest({ expirationDays: 7, includeQr: false });
    expect(res.status).toBe(200);
    const arrayBuf = await res.arrayBuffer();
    const { manifest } = await parseBatchZip(arrayBuf);

    expect(manifest.meta.totalTokens).toBe(5);
    expect(manifest.prizes.length).toBe(2);

    const p1: any = await prisma.prize.findUnique({ where: { id: "p1" } });
    const p2: any = await prisma.prize.findUnique({ where: { id: "p2" } });
    expect(p1?.stock).toBe(0);
    expect(p2?.stock).toBe(0);
    expect(p1?.emittedTotal).toBe(3);
    expect(p2?.emittedTotal).toBe(2);
  });
});
