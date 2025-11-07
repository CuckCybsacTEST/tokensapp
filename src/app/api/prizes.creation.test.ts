import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initTestDb } from "@/lib/setupTestDb";

// Isolated Prisma for this suite; ensure route libs (if any) reuse same instance
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = await initTestDb("test_prizes.db");
  await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createPrize(label: string) {
  const count = await prisma.prize.count();
  const key = `premio${count + 1}`;
  return prisma.prize.create({ data: { key, label } });
}

describe("Prize sequential key generation", () => {
  it("assigns premio1 then premio2 etc.", async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM Prize;`);
    const p1 = await createPrize("Test A");
    const p2 = await createPrize("Test B");
    const p3 = await createPrize("Test C");
    expect(p1.key).toBe("premio1");
    expect(p2.key).toBe("premio2");
    expect(p3.key).toBe("premio3");
  });
});
