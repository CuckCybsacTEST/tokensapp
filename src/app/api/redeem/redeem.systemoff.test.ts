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
  // System OFF: actualiza config
  await prisma.systemConfig.update({ where: { id: 1 }, data: { tokensEnabled: false } }).catch(async () => {
    await prisma.systemConfig.create({ data: { id: 1, tokensEnabled: false } });
  });
  await prisma.prize.create({ data: { id: 'pr1', key: 'premio1', label: 'Prize 1', active: true, emittedTotal: 0 } });
  await prisma.batch.create({ data: { id: 'bOff', description: 'off batch' } });
  const expiresAt = new Date(Date.now() + 300_000); // +5m
  const signature = signToken(secret, tokenId, 'pr1', expiresAt, CURRENT_SIGNATURE_VERSION);
  await prisma.token.create({ data: { id: tokenId, prizeId: 'pr1', batchId: 'bOff', expiresAt, signature, signatureVersion: CURRENT_SIGNATURE_VERSION, disabled: false } });
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
