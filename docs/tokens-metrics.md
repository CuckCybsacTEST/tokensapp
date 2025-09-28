# Tokens Metrics

## functionalDate (nueva fecha funcional de lotes)

Se introduce el campo `Batch.functionalDate` (UTC almacenado como 05:00 para representar 00:00 hora Lima) para mapear los tokens al día operativo real.

Reglas métricas diarias (today / yesterday / day_before_yesterday):
1. Tokens del día = tokens cuyo batch.functionalDate cae dentro del rango del día Lima.
2. Lotes legacy (sin functionalDate) se contabilizan por `token.createdAt` si éste cae en el rango y el batch no tiene functionalDate.
3. Se elimina la heurística de ventana de gracia y el parsing masivo de descripciones salvo para el backfill inicial.

Backfill: ver script `scripts/backfillFunctionalDate.ts`.

Migración: `prisma/migrations/*_add_functional_date/migration.sql`.
