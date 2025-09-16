import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { initTestDb } from "@/test/setupTestDb";

let autoGenerate: any;
let prisma: PrismaClient;
let invalidatePrizeCache: any;

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
  prisma = await initTestDb("test_no_active_prizes_consume.db");
  (global as any)._prisma = prisma;
  ({ POST: autoGenerate } = await import("./generate-all/route"));
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

describe("generate-all with all active prizes stock=0", () => {
  it("returns 400 NO_ACTIVE_PRIZES when all active prizes have stock 0", async () => {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('zpa','zka','Zero Prize A',0,1);`
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO Prize (id,key,label,stock,active) VALUES ('zpb','zkb','Zero Prize B',0,1);`
    );
    const res = await mkRequest({ expirationDays: 7, includeQr: false });
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe("NO_ACTIVE_PRIZES");
  });
});
