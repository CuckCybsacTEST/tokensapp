# Add Shows (Flyers) Model

Created manually before running `prisma migrate dev`.

After Prisma generates the baseline migration SQL for the `Show` model and `ShowStatus` enum, append the following raw SQL statements (PostgreSQL) to enforce partial constraints:

```sql
-- Unicidad de slot sólo para publicados
CREATE UNIQUE INDEX IF NOT EXISTS shows_slot_published_unique ON "Show" (slot) WHERE status = 'PUBLISHED';

-- Rango válido de slot (1..4) cuando no es NULL
ALTER TABLE "Show" ADD CONSTRAINT show_slot_range CHECK (slot IS NULL OR (slot BETWEEN 1 AND 4));

-- endsAt > startsAt cuando endsAt no es NULL
ALTER TABLE "Show" ADD CONSTRAINT show_time_range CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");

-- (Opcional) índice más compacto sólo para publicados por startsAt desc
CREATE INDEX IF NOT EXISTS shows_published_order ON "Show" ("startsAt" DESC) WHERE status = 'PUBLISHED';
```

Business rules no expresables en SQL directo:
- Máximo 4 filas con status = 'PUBLISHED' simultáneas.
- Validación de solapamientos (intervalos) entre shows sin slot (permite excepciones si alguno tiene slot asignado).
- publishedAt requerido sólo en transición a PUBLISHED.

Implementar esas reglas en la capa de servicio transaccional al publicar.
