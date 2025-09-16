import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken } from "@/lib/signing";
import { initTestDb } from "@/test/setupTestDb";

let redeemHandler: any;
let prisma: PrismaClient;
let tokenId: string;
const secret = "redeem_test_secret_exp";

beforeAll(async () => {
  process.env.TOKEN_SECRET = secret;
  prisma = await initTestDb("test_redeem_expired.db");
  (global as any)._prisma = prisma; // set before importing route
  await prisma.$executeRawUnsafe(`DELETE FROM SystemConfig;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Batch;`);
  await prisma.$executeRawUnsafe(`DELETE FROM Token;`);
  await prisma.$executeRawUnsafe(`INSERT INTO SystemConfig (id,tokensEnabled) VALUES (1,1);`);
  await prisma.$executeRawUnsafe(
    `INSERT INTO Prize (id,key,label,active) VALUES ('pr1','premio1','Prize 1',1);`
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO Batch (id,description) VALUES ('bexp','expired batch');`
  );
  tokenId = "tok_expired_1";
  const expiresAt = new Date(Date.now() - 60_000); // expired 1 min ago
  const signature = signToken(secret, tokenId, "pr1", expiresAt, CURRENT_SIGNATURE_VERSION);
  await prisma.$executeRawUnsafe(
    `INSERT INTO Token (id,prizeId,batchId,expiresAt,signature,signatureVersion,disabled) VALUES (?,?,?,?,?,?,0);`,
    tokenId,
    "pr1",
    "bexp",
    expiresAt.toISOString(),
    signature,
    CURRENT_SIGNATURE_VERSION
  );
  ({ POST: redeemHandler } = await import("./[tokenId]/route"));
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/redeem/[tokenId] expired", () => {
  it("returns 410 for expired token", async () => {
    const req = new Request(`http://localhost/api/redeem/${tokenId}`, { method: "POST" });
    const res = await redeemHandler(req as any, { params: { tokenId } });
    expect(res.status).toBe(410);
    const json: any = await res.json();
    expect(json.code).toBe("EXPIRED");
  });
});
