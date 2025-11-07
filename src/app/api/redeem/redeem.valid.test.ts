import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken } from "@/lib/signing";
import { initTestDb } from "@/lib/setupTestDb";
let redeemHandler: any;

let prisma: PrismaClient;
let tokenId: string;
const secret = "redeem_test_secret";

beforeAll(async () => {
  process.env.TOKEN_SECRET = secret;
  prisma = await initTestDb("test_redeem_valid.db");
  (global as any)._prisma = prisma;
  // Seed usando Prisma API
  await prisma.prize.create({ data: { id: 'pr1', key: 'premio1', label: 'Prize 1', active: true, emittedTotal: 0 } });
  await prisma.batch.create({ data: { id: 'b1', description: 'test batch' } });
  tokenId = "tok_valid_1";
  const expiresAt = new Date(Date.now() + 60_000); // +1 min
  const signature = signToken(secret, tokenId, 'pr1', expiresAt, CURRENT_SIGNATURE_VERSION);
  await prisma.token.create({ data: { id: tokenId, prizeId: 'pr1', batchId: 'b1', expiresAt, signature, signatureVersion: CURRENT_SIGNATURE_VERSION, disabled: false } });
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
