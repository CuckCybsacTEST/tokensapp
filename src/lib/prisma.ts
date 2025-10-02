import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

// Ensure DATABASE_URL is present early.
// Histórico: antes el provider era SQLite y se aplicaba fallback a `file:./prisma/dev.db`.
// Ahora el schema usa PostgreSQL, así que ese fallback provoca el error de validación:
//   "the URL must start with the protocol postgresql:// or postgres://".
// Comportamiento actualizado:
//   - Dev: si falta DATABASE_URL, se inyecta un DSN de Postgres local (docker-compose expone 5433).
//           Si ese Postgres no existe simplemente fallarán las conexiones (mensaje claro) y el
//           developer sabrá que debe levantar `docker-compose up -d` o editar `.env`.
//   - Prod (o FORCE_PRISMA_PROD=1): se exige DATABASE_URL explícito → throw.
//   - Nunca volvemos a un DSN SQLite porque el provider actual es `postgresql`.
const ensureDatabaseUrl = () => {
  const isProdLike = process.env.NODE_ENV === "production" || process.env.FORCE_PRISMA_PROD === "1";
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
    if (isProdLike) {
      throw new Error("Missing DATABASE_URL environment variable. Set it in your production environment.");
    }
    const fallback = "postgresql://postgres:postgres@localhost:5433/qrprizes?schema=public"; // coincide docker-compose
    process.env.DATABASE_URL = fallback;
    if (!process.env.__PRISMA_FALLBACK_LOGGED) {
      // eslint-disable-next-line no-console
      console.info(`[prisma] Dev fallback DATABASE_URL=${fallback} (define your own in .env to silence this message)`);
      process.env.__PRISMA_FALLBACK_LOGGED = "1";
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
