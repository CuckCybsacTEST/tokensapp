import { describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken, verifyTokenSignature, signPersonPayload, verifyPersonPayload } from "./signing";

describe("signing", () => {
  it("signs and verifies a token", () => {
    const secret = "test_secret";
    const tokenId = "tok123";
    const prizeId = "prz456";
    const expiresAt = new Date(Date.now() + 60_000);
    const sig = signToken(secret, tokenId, prizeId, expiresAt, CURRENT_SIGNATURE_VERSION);
    expect(sig).toBeTypeOf("string");
    expect(
      verifyTokenSignature(secret, tokenId, prizeId, expiresAt, sig, CURRENT_SIGNATURE_VERSION)
    ).toBe(true);
  });

  it("fails verification if altered", () => {
    const secret = "test_secret";
    const tokenId = "tok123";
    const prizeId = "prz456";
    const expiresAt = new Date(Date.now() + 60_000);
    const sig = signToken(secret, tokenId, prizeId, expiresAt, CURRENT_SIGNATURE_VERSION);
    const bad = sig.slice(0, -2) + "aa";
    expect(
      verifyTokenSignature(secret, tokenId, prizeId, expiresAt, bad, CURRENT_SIGNATURE_VERSION)
    ).toBe(false);
  });
});

describe("person QR signing", () => {
  const secret = "test_secret_person";
  const personId = "person-123";

  it("firma y verifica payload de persona", () => {
    const ts = new Date("2025-09-12T12:00:00.000Z").toISOString();
    const sig = signPersonPayload(secret, personId, ts, CURRENT_SIGNATURE_VERSION);
    const payload = { pid: personId, ts, v: CURRENT_SIGNATURE_VERSION, sig };
    const r = verifyPersonPayload(secret, payload);
    expect(r.ok).toBe(true);
  });

  it("falla si se altera la firma", () => {
    const ts = new Date("2025-09-12T12:00:00.000Z").toISOString();
    const sig = signPersonPayload(secret, personId, ts, CURRENT_SIGNATURE_VERSION);
    const bad = sig.slice(0, -2) + "aa";
    const payload = { pid: personId, ts, v: CURRENT_SIGNATURE_VERSION, sig: bad };
    const r = verifyPersonPayload(secret, payload);
    expect(r.ok).toBe(false);
  });

  it("ventana anti-replay: STALE cuando excede maxSkewSec", () => {
    const now = new Date("2025-09-12T12:00:10.000Z");
    const ts = new Date("2025-09-12T11:59:00.000Z").toISOString(); // 70s antes
    const sig = signPersonPayload(secret, personId, ts);
    const payload = { pid: personId, ts, v: CURRENT_SIGNATURE_VERSION, sig };
    const r = verifyPersonPayload(secret, payload, { maxSkewSec: 60, now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("STALE");
  });

  it("ventana anti-replay: FUTURE_TS cuando ts está en el futuro (con tolerancia)", () => {
    const now = new Date("2025-09-12T12:00:00.000Z");
    const futureTs = new Date("2025-09-12T12:01:30.000Z").toISOString(); // +90s
    const sig = signPersonPayload(secret, personId, futureTs);
    const payload = { pid: personId, ts: futureTs, v: CURRENT_SIGNATURE_VERSION, sig };
    const r = verifyPersonPayload(secret, payload, { maxSkewSec: 300, now });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("FUTURE_TS");
  });
});
