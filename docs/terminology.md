Terminología interna vs visible

Resumen

- Este documento explica cómo se mapean los campos internos de la base de datos a las etiquetas visibles en la UI, y por qué no se renombra el campo `redeemedAt` en la base de datos.

Campos internos (DB/API)

- revealedAt (DateTime?) — Fecha en que el sistema reveló el premio en la ruleta (REVEAL). Es el estado canónico de "revelado" en el flujo de dos fases.
- deliveredAt (DateTime?) — Fecha en que el staff confirmó la entrega (DELIVER). Marca que el premio fue entregado físicamente.
- redeemedAt (DateTime?) — Campo legacy usado históricamente para marcar tokens canjeados en el flujo single-step. En el modo TWO_PHASE_REDEMPTION se mantiene como "espejo": al marcar deliveredAt el servidor copia deliveredAt a redeemedAt para compatibilidad con reportes y scripts existentes.

Reglas y motivos

- No renombrar `redeemedAt` en la DB: muchos informes, migraciones y queries (prisma, scripts, tests) dependen del campo `redeemedAt`. Cambiarlo en la DB requiere migraciones y ajustes amplios. En vez de eso, actualizamos solo las etiquetas visibles en la UI para evitar confusión a usuarios finales.

- Flujo TWO_PHASE_REDEMPTION (REVEAL -> DELIVER):
  - Al girar la ruleta el servidor crea/actualiza `revealedAt` y asigna `assignedPrizeId`.
  - El staff debe luego llamar al endpoint de entrega para fijar `deliveredAt`.
  - En la entrega, para compatibilidad legacy, el servidor copia `deliveredAt` a `redeemedAt`.

UI (etiquetas visibles)

- Se recomienda usar las siguientes etiquetas visibles para usuarios y staff:
  - "Revelado" para cuando `revealedAt` está presente.
  - "Entregado" para cuando `deliveredAt` está presente.
  - "Canjeado" en la UI cuando se muestra el valor histórico de `redeemedAt` (etiqueta amigable en lugar de "Redimido").

Notas para desarrolladores

- Busque y ajuste solo las cadenas visibles (JSX/TSX). No modifique nombres de columnas, rutas de la API ni la lógica de backend que dependa de `redeemedAt`.
- Si se desea una migración futura para eliminar `redeemedAt`, planificar:
  - Actualizar consultas en `src/lib/batchStats.ts` y en todas las páginas admin que hagan groupBy/filters por `redeemedAt`.
  - Escribir migración SQL y script de backfill consistente con `scripts/backfill-two-phase.ts`.

Ejemplos rápidos

- Usuario ve: "Premio ya canjeado" y "Canjeado a las 12:03" (en vez de "Redimido").
- Internamente: `deliveredAt` se sigue copiando a `redeemedAt` para informes.

Contacto

- Si quieres que cambie otras etiquetas (por ejemplo usar "Entregados" en lugar de "Canjeados"), indícalo y aplicaré un patch consistente en todos los archivos UI.
