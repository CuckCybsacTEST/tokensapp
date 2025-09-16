import { describe, expect, it } from "vitest";

import { CURRENT_SIGNATURE_VERSION, signToken } from "./signing";

describe("signToken additional cases", () => {
  const secret = "s3cret";
  const tokenId = "tok-xyz";
  const prizeId = "prz-abc";

  it("produces different signatures when expiration second changes", () => {
    const base = new Date(Date.now() + 10_000); // +10s
    const later = new Date(base.getTime() + 1000); // +1s
    const a = signToken(secret, tokenId, prizeId, base, CURRENT_SIGNATURE_VERSION);
    const b = signToken(secret, tokenId, prizeId, later, CURRENT_SIGNATURE_VERSION);
    expect(a).not.toEqual(b);
  });

  it("same second (ms differ) yields same signature (seconds precision)", () => {
    const base = new Date(Date.now() + 60_000);
    base.setMilliseconds(0);
    const sameSecond = new Date(base.getTime() + 500); // still within same second
    const a = signToken(secret, tokenId, prizeId, base, CURRENT_SIGNATURE_VERSION);
    const b = signToken(secret, tokenId, prizeId, sameSecond, CURRENT_SIGNATURE_VERSION);
    expect(a).toEqual(b);
  });

  it("different version yields different signature", () => {
    const exp = new Date(Date.now() + 5 * 60_000);
    const v1 = signToken(secret, tokenId, prizeId, exp, 1);
    const v2 = signToken(secret, tokenId, prizeId, exp, 2); // hypothetical future version
    expect(v1).not.toEqual(v2);
  });
});

describe("expiration days arithmetic", () => {
  function addDays(base: Date, days: number) {
    return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  }

  it("adds exact 1 day in ms", () => {
    const base = new Date("2025-01-01T00:00:00.000Z");
    const target = addDays(base, 1);
    expect(target.getTime() - base.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("adds 7 and 30 days correctly", () => {
    const base = new Date("2025-02-10T12:34:56.789Z");
    const d7 = addDays(base, 7);
    const d30 = addDays(base, 30);
    expect(d7.getTime() - base.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(d30.getTime() - base.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("signatures reflect different expiration days", () => {
    const base = new Date();
    const exp1 = addDays(base, 1);
    const exp7 = addDays(base, 7);
    const s1 = signToken("x", "t", "p", exp1, CURRENT_SIGNATURE_VERSION);
    const s7 = signToken("x", "t", "p", exp7, CURRENT_SIGNATURE_VERSION);
    expect(s1).not.toEqual(s7);
  });
});
