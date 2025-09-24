/**
 * ID helper for manual raw inserts.
 *
 * Prisma models in this project mostly declare `id String @id @default(cuid())`.
 * When we perform raw SQL inserts (e.g. during specialized scripts, backfills
 * or bulk operations) we want an easy, dependency‑free way to generate unique
 * identifiers without relying on Postgres-specific extensions like
 * `gen_random_uuid()` (requires the pgcrypto extension) or database functions.
 *
 * We deliberately use the Node.js built-in `crypto.randomUUID()` so that:
 * 1. No database extension needs to be enabled.
 * 2. Generation happens entirely at the application layer (portable across
 *    dev / test / prod, and also works in environments where only a
 *    DATABASE_URL is provided with minimal privileges).
 * 3. Collisions are practically negligible (UUID v4 strength is sufficient
 *    for our expected insert volumes).
 *
 * NOTE: Mixing cuid() (from Prisma default) and UUIDv4 in the same table is
 * acceptable because the column type is TEXT. Existing records keep their
 * cuid values; new raw inserted records will have UUIDs. This slight
 * heterogeneity is fine for our operational needs. If later we prefer a
 * single format everywhere, we can switch model defaults to `@default(uuid())`
 * and run a data migration.
 */
export function newId(): string {
  return crypto.randomUUID();
}

// Example usage in a raw insert (pseudo-code):
// const id = newId();
// await prisma.$executeRaw`INSERT INTO "Scan" (id, personId, scannedAt, type, businessDay) VALUES (${id}, ${personId}, ${scannedAt}, ${type}, ${businessDay})`;
