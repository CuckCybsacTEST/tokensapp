import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken } from "@/lib/signing";
import { initTestDb } from "@/lib/setupTestDb";

let redeemHandler: any;
let prisma: PrismaClient;
let tokenId: string;
const secret = "redeem_test_secret_exp";

beforeAll(async () => {
  process.env.TOKEN_SECRET = secret;
  prisma = await initTestDb("test_redeem_expired.db");
  (global as any)._prisma = prisma; // set before importing route
  await prisma.prize.create({ data: { id: 'pr1', key: 'premio1', label: 'Prize 1', active: true, emittedTotal: 0 } });
  await prisma.batch.create({ data: { id: 'bexp', description: 'expired batch' } });
  tokenId = "tok_expired_1";
  const expiresAt = new Date(Date.now() - 60_000); // expired 1 min ago
  const signature = signToken(secret, tokenId, 'pr1', expiresAt, CURRENT_SIGNATURE_VERSION);
  await prisma.token.create({ data: { id: tokenId, prizeId: 'pr1', batchId: 'bexp', expiresAt, signature, signatureVersion: CURRENT_SIGNATURE_VERSION, disabled: false } });
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
