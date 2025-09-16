import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken } from "@/lib/signing";
import { initTestDb } from "@/test/setupTestDb";
let redeemHandler: any;

let prisma: PrismaClient;
let tokenId: string;
const secret = "redeem_test_secret";

beforeAll(async () => {
  process.env.TOKEN_SECRET = secret;
  prisma = await initTestDb("test_redeem_valid.db");
  // Ensure API route modules reuse this Prisma instance (must set before importing route)
  (global as any)._prisma = prisma;
  // Seed system config + prize + batch + token
  await prisma.$executeRawUnsafe(`DELETE FROM SystemConfig;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id,tokensEnabled) VALUES (1,1);`);
  await prisma.$executeRawUnsafe(
    `INSERT INTO Prize (id,key,label,active) VALUES ('pr1','premio1','Prize 1',1);`
  );
  await prisma.$executeRawUnsafe(`INSERT INTO Batch (id,description) VALUES ('b1','test batch');`);
  tokenId = "tok_valid_1";
  const expiresAt = new Date(Date.now() + 60_000); // +1 min
  const signature = signToken(secret, tokenId, "pr1", expiresAt, CURRENT_SIGNATURE_VERSION);
  await prisma.$executeRawUnsafe(
    `INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`,
    tokenId,
    "pr1",
    "b1",
    expiresAt.toISOString(),
    signature,
    CURRENT_SIGNATURE_VERSION
  );
  ({ POST: redeemHandler } = await import("./[tokenId]/route"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/redeem/[tokenId]", () => {
  it("redeems a valid token", async () => {
    const req = new Request(`http://localhost/api/redeem/${tokenId}`, {
      method: "POST",
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    const res = await redeemHandler(req as any, { params: { tokenId } });
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.ok).toBe(true);
    expect(json.redeemedAt).toBeTruthy();
    const dbToken = await prisma.token.findUnique({ where: { id: tokenId } });
    expect(dbToken?.redeemedAt).not.toBeNull();
  });

  it("returns 409 on second redemption attempt", async () => {
    const req = new Request(`http://localhost/api/redeem/${tokenId}`, {
      method: "POST",
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    const res = await redeemHandler(req as any, { params: { tokenId } });
    expect(res.status).toBe(409);
    const json: any = await res.json();
    expect(json.code).toBe("ALREADY_REDEEMED");
  });
});
