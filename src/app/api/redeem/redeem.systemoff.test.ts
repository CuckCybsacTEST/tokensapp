import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken } from "@/lib/signing";
import { initTestDb } from "@/test/setupTestDb";
let redeemHandler: any;

let prisma: PrismaClient;
const secret = "redeem_off_secret";
const tokenId = "tok_off_1";

beforeAll(async () => {
  process.env.TOKEN_SECRET = secret;
  prisma = await initTestDb("test_redeem_off.db");
  (global as any)._prisma = prisma; // set before dynamic import
  // System OFF
  await prisma.$executeRawUnsafe(`DELETE FROM SystemConfig;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id,tokensEnabled) VALUES (1,0);`);
  await prisma.$executeRawUnsafe(
    `INSERT INTO Prize (id,key,label,active) VALUES ('pr1','premio1','Prize 1',1);`
  );
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id,description) VALUES ('bOff','off batch');`);
  const expiresAt = new Date(Date.now() + 300_000); // +5m
  const signature = signToken(secret, tokenId, "pr1", expiresAt, CURRENT_SIGNATURE_VERSION);
  await prisma.$executeRawUnsafe(
    `INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`,
    tokenId,
    "pr1",
    "bOff",
    expiresAt.toISOString(),
    signature,
    CURRENT_SIGNATURE_VERSION
  );
  ({ POST: redeemHandler } = await import("./[tokenId]/route"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Redeem when system OFF", () => {
  it("returns 423 SYSTEM_OFF", async () => {
    const req = new Request(`http://localhost/api/redeem/${tokenId}`, { method: "POST" });
    const res = await redeemHandler(req as any, { params: { tokenId } });
    expect(res.status).toBe(423);
    const body: any = await res.json();
    expect(body.code).toBe("SYSTEM_OFF");
  });
});
