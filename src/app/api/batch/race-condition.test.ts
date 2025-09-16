import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { initTestDb } from "@/test/setupTestDb";

let autoGenerate: any;
let parseBatchZip: any;
let invalidatePrizeCache: any;
let __resetRaceTestState: any;
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
  prisma = await initTestDb("test_race_cond.db");
  (global as any)._prisma = prisma;
  ({ POST: autoGenerate } = await import("./generate-all/route"));
  ({ parseBatchZip } = await import("@/test/zipTestUtils"));
  ({ invalidatePrizeCache } = await import("@/lib/prizeCache"));
  ({ __resetRaceTestState } = await import("@/lib/batch/generateBatchCore"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  invalidatePrizeCache();
  try { __resetRaceTestState(); } catch {}
});

describe("race condition generate-all", () => {
  it("two concurrent POST: one 200 and one 409 RACE_CONDITION", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active,emittedTotal) VALUES ('race1','rkey1','Race Prize',50,1,0);`
    );
    process.env.FORCE_RACE_TEST = "1";

    // Launch both without awaiting in between
    const [resA, resB] = await Promise.all([
      mkRequest({ expirationDays: 7, includeQr: false }),
      mkRequest({ expirationDays: 7, includeQr: false }),
    ]);
    delete process.env.FORCE_RACE_TEST;

    const statuses = [resA.status, resB.status];
    expect(statuses.filter((s) => s === 200).length).toBe(1);
    expect(statuses.filter((s) => s === 409).length).toBe(1);

    const raceRes = resA.status === 409 ? resA : resB;
    const okRes = resA.status === 200 ? resA : resB;

    // Validate 409 payload
    const j = await raceRes.json();
    expect(j.code || j.error).toBe("RACE_CONDITION");

    // Validate successful ZIP
    const ct = okRes.headers.get("Content-Type") || "";
    expect(ct).toContain("application/zip");
    const { manifest } = await parseBatchZip(await okRes.arrayBuffer());
    expect(manifest.meta.totalTokens).toBe(50);

    const prize: any = await prisma.prize.findUnique({ where: { id: "race1" } });
    expect(prize.stock).toBe(0);
    expect(prize.emittedTotal).toBe(50);
  });
});
