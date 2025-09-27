# QA Checklist Shows / Flyers

Revisión final (fecha ejecución: 2025-09-26)

Formato: ✓ cumplido / ✗ pendiente o hallazgo.

| Ítem | Resultado | Observaciones |
|------|-----------|---------------|
| Índices adecuados (status+startsAt) y nota sobre slot parcial | ✓ | Prisma `@@index([status, startsAt(sort: Desc)])`. Slot exclusividad manejada en lógica; no se requiere índice parcial adicional dado bajo cardinal. |
| Límite de 4 publicados concurrentes | ✓ | Regla R7 implementada en `publish` (error `MAX_PUBLISHED_REACHED`). Tests cubren caso límite. |
| Slug bloqueado tras publicar | ✓ | Regla R12: `updatePartial` omite cambios si `status !== DRAFT` (error `SLUG_LOCKED`). Ver servicio líneas cercanas a validación slug. |
| `publishedAt` inmutable | ✓ | Al publicar se usa `publishedAt ?? new Date()`. `updatePartial` nunca toca campo. Al archivar se preserva. |
| Feed público máximo 4 activos visibles | ✓ | Límite de publicación (R7) más filtro de expirados asegura <=4. Orden slots y luego restantes. |
| Show expirado (endsAt pasada) no visible/contado | ✓ | Expirados no afectan conteo (R29) y no se incluyen en feed (lógica en `listPublic`). |
| Re-upload imagen reutiliza hash (dedupe) | ✓ | `imagePipeline.ts` calcula hash y setea `reused=true` si ya existe; evento auditoría incluye flag. Test de dedupe existente. |
| Invalidaciones de caché tras mutaciones | ✓ | Mutaciones llaman `invalidateShowsCache()` (create, publish, archive, image). `getShowsCacheVersion()` usado por feed para descartar snapshot. |
| GC no borra imágenes activas | ✓ | Script mueve sólo huérfanas no referenciadas; paths activos listados al construir set. Grace 10m + purge >24h. Dry-run previo mostró 0 orphans eliminados. |

## Notas Adicionales
- Escenario de carrera publish simultáneo: revalidación transaccional minimiza condición (select + comprobaciones). En conflicto retorna código específico (`SLOT_CONFLICT` / `MAX_PUBLISHED_REACHED`).
- Observabilidad: eventos de auditoría cubren create/publish/archive/image con métricas de optimización (bytesOriginal vs bytesOptimized).
- Cache SWR: ventana fresh 60s / stale 180s; invalidación fuerza recarga inmediata la próxima solicitud.
- Reemplazo de imagen en show publicado mantiene orden (no altera fechas / slot).

## Recomendaciones Futuras
- Agregar índice opcional en `slot` filtrado por `status = PUBLISHED` si volumen crece (> cientos) para barridos más rápidos.
- Persistir eventos de auditoría en tabla dedicada para queries históricas.
- Añadir test explícito para expiración (endsAt en pasado) en feed público.
- Instrumentar métrica de tasa de reutilización de imágenes (porcentaje `reused=true`).

-- Fin de checklist.
