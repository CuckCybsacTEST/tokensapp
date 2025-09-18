import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

// Ensure DATABASE_URL is present early. In dev we fallback to local sqlite to avoid
// noisy PrismaClientInitializationError loops when the developer forgets the .env.
// In production we fail fast with a clear message.
const ensureDatabaseUrl = () => {
  const isProdLike = process.env.NODE_ENV === "production" || process.env.FORCE_PRISMA_PROD === "1";
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
    if (!isProdLike) {
      process.env.DATABASE_URL = "file:./prisma/dev.db"; // safe dev fallback
      if (!process.env.__PRISMA_FALLBACK_LOGGED) {
        // one‑time console info (avoid spamming on hot reloads)
        // eslint-disable-next-line no-console
        console.info("[prisma] Using fallback dev DATABASE_URL=file:./prisma/dev.db (define it in .env to silence this message)");
        process.env.__PRISMA_FALLBACK_LOGGED = "1";
      }
    } else {
      throw new Error("Missing DATABASE_URL environment variable. Set it in your production environment.");
    }
  }
};

ensureDatabaseUrl();


const datasourceUrl = process.env.DATABASE_URL!; // garantizado por ensureDatabaseUrl

export const prisma = global._prisma || new PrismaClient({
  datasources: { db: { url: datasourceUrl } },
});

if (process.env.NODE_ENV !== "production") {
  global._prisma = prisma;
}
