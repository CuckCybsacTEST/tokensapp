import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { initTestDb } from "@/test/setupTestDb";
// NOTE: We intentionally defer importing helpers that (directly or indirectly) import prisma
// (e.g. parseBatchZip, prize cache) until AFTER we initialize the test DB and set global.prismaGlobal.
// Otherwise a PrismaClient would be constructed pointing at a previous DATABASE_URL, and the route
// would query a different SQLite file (leading to NO_ACTIVE_PRIZES despite inserts).
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
  prisma = await initTestDb("test_batch.db");
  (global as any)._prisma = prisma;
  // Now that global prisma is set, import the route and helpers.
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
  delete process.env.BATCH_MAX_TOKENS_AUTO;
  invalidatePrizeCache();
});

describe("generate-all endpoint", () => {
  it("success with two prizes", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('ap1','ak1','Premio 1',5,1);`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('ap2','ak2','Premio 2',3,1);`
    );
    const res = await mkRequest({ expirationDays: 7, includeQr: false });
    expect(res.status).toBe(200);
    const ct = res.headers.get("Content-Type") || "";
    expect(ct).toContain("application/zip");
    const { manifest } = await parseBatchZip(await res.arrayBuffer());
    expect(manifest.meta.mode).toBe("auto");
    expect(manifest.meta.totalTokens).toBe(8);
    expect(manifest.prizes.length).toBe(2);
    expect(manifest.meta.aggregatedPrizeCount).toBe(2);
    expect(manifest.meta.aggregatedPrizeCount).toBe(manifest.prizes.length);
    expect(manifest.meta.prizeEmittedTotals).toBeDefined();
    expect(manifest.meta.prizeEmittedTotals.ap1).toBe(5);
    expect(manifest.meta.prizeEmittedTotals.ap2).toBe(3);
  });

  it("no active prizes", async () => {
    const res = await mkRequest({ expirationDays: 7 });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe("NO_ACTIVE_PRIZES");
  });

  it("invalid stock null (treated as no active prize, but we simulate by inserting null + active)", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('apn','akn','Premio Null',NULL,1);`
    );
    const res = await mkRequest({ expirationDays: 7 });
    // Prize with NULL stock should be ignored => no active prizes with stock>0
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe("NO_ACTIVE_PRIZES");
  });

  it("invalid stock zero", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('apz','akz','Premio Zero',0,1);`
    );
    const res = await mkRequest({ expirationDays: 7 });
    expect(res.status).toBe(400);
    const j = await res.json();
    // Filter eliminates it -> no active prizes
    expect(j.error).toBe("NO_ACTIVE_PRIZES");
  });

  it("limit exceeded", async () => {
    process.env.BATCH_MAX_TOKENS_AUTO = "5";
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('apl','akl','Premio L',6,1);`
    );
    const res = await mkRequest({ expirationDays: 7 });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe("LIMIT_EXCEEDED");
  });

  it("lazyQr meta present", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('aplq','aklq','Premio Lazy',2,1);`
    );
    const res = await mkRequest({ expirationDays: 7, includeQr: true, lazyQr: true });
    expect(res.status).toBe(200);
    const { manifest } = await parseBatchZip(await res.arrayBuffer());
    expect(manifest.meta.qrMode).toBe("lazy");
    expect(manifest.meta.mode).toBe("auto");
    expect(manifest.meta.aggregatedPrizeCount).toBe(1);
    expect(manifest.meta.prizeEmittedTotals).toBeDefined();
    expect(manifest.meta.prizeEmittedTotals.aplq).toBe(2);
  });
});
