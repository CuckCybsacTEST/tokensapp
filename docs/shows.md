# Shows / Flyers

Documentación funcional y técnica del subsistema de shows (flyers programados con imagen optimizada y feed público cacheado).

## Modelo de Datos

`Show` (tabla Prisma)
- `id` (string, cuid)
- `title` (string) – editable mientras DRAFT
- `slug` (string, único) – derivado del título al crear; inmutable tras publicar (R12)
- `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`)
- `slot` (int? 1..4) – opcional, define posiciones destacadas con orden estable (R8)
- `startsAt` (DateTime) – instante de inicio de vigencia lógica (R3)
- `endsAt` (DateTime?) – opcional; no se permite solapamiento conflictivo en ventana activa (R4)
- `imageOriginalPath` (string?) – path imagen subida (archivo fuente)
- `imageWebpPath` (string?) – path optimizada principal WebP
- `imageBlurData` (string?) – base64 blur placeholder (LQIP)
- `imageWidth`, `imageHeight` (int?) – dimensiones post‑proceso (R18)
- `imageBytesOriginal`, `imageBytesOptimized` (int?) – métricas de ahorro (R19)
- `publishedAt` (DateTime?) – sellado al publicar (R11)
- `createdAt`, `updatedAt` (DateTime)

## Estados
- `DRAFT`: creado, editable (slot, fechas, título, imagen). No visible en feed público.
- `PUBLISHED`: visible si dentro de ventana (entre `startsAt` y `endsAt`/actual). Inmutable salvo archivo imagen (sólo reemplazo) y archivado.
- `ARCHIVED`: retirado; no se reactiva ni modifica (R14).

## Reglas de Negocio (R1..R30)
Resumen numerado (solo las definidas / relevantes; se reservan IDs libres para futuras extensiones):
1. (R1) Crear show inicia en estado `DRAFT`.
2. (R2) Se puede crear sin imagen inicial.
3. (R3) `startsAt` requerido; debe estar dentro de ventana rel. ±365 días desde now (evita fechas absurdas) → errores `START_TOO_FAR` / `START_TOO_OLD`.
4. (R4) Validación de solapamiento: shows no sloteados en publicación no pueden solaparse si excede límite activo permitido (intersección conflictiva); la verificación se hace antes de commit (re‑check transaccional) para evitar condiciones de carrera básicas.
5. (R5) `endsAt` opcional; si existe debe ser ≥ `startsAt` (`INVALID_DATE_RANGE`).
6. (R6) Imagen obligatoria para publicar (error `IMAGE_REQUIRED`).
7. (R7) Máximo 4 shows `PUBLISHED` activos simultáneamente (error `MAX_PUBLISHED_REACHED`).
8. (R8) Slots (1..4) son mutuamente exclusivos entre shows publicados o en intento de publicar (error `SLOT_CONFLICT`).
9. (R9) Cambiar `slot` en `DRAFT` siempre permitido si libre; en `PUBLISHED` solo se permite si no rompe exclusividad (optamos por bloquear para simplificar – `ARCHIVED_IMMUTABLE` / camino: archive + recreate).
10. (R10) Re-publicar mismo show ya publicado es idempotente (no duplica efectos).
11. (R11) `publishedAt` se fija una única vez; se conserva al archivar.
12. (R12) `slug` no editable tras publicar (`SLUG_LOCKED`). Mientras `DRAFT` se puede editar siempre que respete patrón válido.
13. (R13) Slug sólo caracteres `[a-zA-Z0-9-]` (`INVALID_SLUG`).
14. (R14) `ARCHIVED` es inmutable: cambios de campos o imagen rechazados (`ARCHIVED_IMMUTABLE`).
15. (R15) `archive` no requiere validaciones adicionales (idempotente si ya archivado).
16. (R16) Publicar re‑valida todas las invariantes con SELECT FOR UPDATE lógico (re‑consulta) para minimizar carreras.
17. (R17) Duplicate image uploads con mismo hash re‑usan optimización (dedupe lógica, flag interno `reused`).
18. (R18) Se registran dimensiones finales de la imagen optimizada (`imageWidth/Height`).
19. (R19) Se guardan bytes original vs optimizado para métricas de ahorro.
20. (R20) Tamaño máximo archivo 8MB (`FILE_TOO_LARGE`).
21. (R21) Formatos soportados: jpeg, png, webp (`UNSUPPORTED_FORMAT`).
22. (R22) Replace de imagen permitido en `DRAFT` y `PUBLISHED` (misma semántica de proceso) – cache pública invalidada.
23. (R23) Feed público orden: primero shows con `slot` asc (1..4), luego resto por `startsAt` desc.
24. (R24) Cache público in‑memory SWR (fresh 60s / stale 180s) con invalidación manual via versión interna.
25. (R25) Al mutar (crear, publicar, archivar, subir imagen) se invalida versión de cache para refresco posterior.
26. (R26) Auditoría: eventos `show.create_draft`, `show.publish`, `show.archive`, `show.image.process` con metadatos (bytesOptimized, contentHash, durationMs, actorRole).
27. (R27) No se permite modificar `startsAt` a un valor fuera de la ventana de ±365 días durante `updatePartial` ni justo antes de publicar (revalidación). Errores `START_TOO_FAR` `START_TOO_OLD`.
28. (R28) Slug no puede quedar vacío ni solo guiones; normalización colapsa múltiples guiones (aplicado en capa de servicio).
29. (R29) Expiración lógica: un show `PUBLISHED` con `endsAt` pasada se considera no activo para recuento de límite y puede ser reemplazado.
30. (R30) Respuestas de error estructuradas `{ ok:false, code, message }` para todas las rutas admin/public relacionadas.

## Endpoints Admin
Base: `/api/admin/shows`
Feature flag global: `SHOWS_ENABLED` (env). Si se define y es falsy (`0`, `false`, `off`...) las rutas admin devuelven `503 { ok:false, code:"FEATURE_DISABLED" }` y el feed público retorna `{ ok:true, shows:[] }`.
- `POST /api/admin/shows` → crear draft. Body: `{ title, startsAt, endsAt?, slot? }` Respuestas: `201 { ok:true, show }` / errores validación.
- `GET /api/admin/shows` → listar (paginación simple). Query soportada: `page?`, `pageSize?`, `order?`.
- `GET /api/admin/shows/:id` → detalle.
- `PATCH /api/admin/shows/:id` → actualizar campos permitidos en `DRAFT` (title, startsAt, endsAt, slot, slug). Respeta reglas R12/R13/R27.
- `POST /api/admin/shows/:id/image` → subir/reemplazar imagen.
- `POST /api/admin/shows/:id/publish` → publicar (aplica R6,R7,R8,R16,R27 etc.).
- `POST /api/admin/shows/:id/archive` → archivar (R14/R15).

Roles:
- `ADMIN`: acceso total a todas las rutas anteriores.
- `STAFF`: sólo `GET` list y detalle (403 en mutaciones) – reforzado en handlers.

## Endpoint Público
- `GET /api/shows/public` → feed para render cliente. Respuesta `{ ok:true, updatedAt, shows:[...] }` orden ya normalizado (R23). Cache SWR interno (R24,R25).

## Pipeline de Imagen
1. Validación tamaño (≤8MB) y MIME whitelist (jpeg/png/webp) (R20,R21).
2. Lectura buffer → hash SHA256 (dedupe R17).
3. Si hash ya existe para el show (o global) se reutiliza evitando reprocesar.
4. Procesado con `sharp` → resize (máx lado 1600px), conversión a WebP calidad equilibrada.
5. Generación blur placeholder (pequeño resize + base64) (R18,R19 contexto LQIP).
6. Escritura a `public/shows/<hash>-<WxH>.webp` y original `public/shows/<hash>.<ext>` (hash SHA256). El sufijo de dimensiones evita colisiones tras resize y habilita cache immutable.
7. Update transaccional del registro `Show` con metadatos; emisión de evento auditoría.
8. Invalidación versión de cache pública (R25).

### Cache HTTP de imágenes
Servir `public/shows/*` con:
```
Cache-Control: public, max-age=31536000, immutable
```
Al cambiar la imagen se genera un nuevo hash → nuevo path → invalidación natural en CDN/navegador.

## Caché Público (SWR in-memory)
Estructura snapshot:
```
{ data: { items, maxUpdatedAt }, version, freshUntil, staleUntil, cacheVersion }
```
- `freshUntil`: dentro de 60s → sirve directo.
- `staleUntil`: hasta 180s → sirve stale y refresca en background.
- `cacheVersion`: entero derivado de invalidaciones manuales (mutaciones lo incrementan).
- Estrategia: si `cacheVersion` cambió → descarta snapshot y recarga inmediata.
- No se expone endpoint de invalidación directa; la lógica vive en servicio + mutaciones.

## Garbage Collector (GC) de Imágenes
Script `scripts/gc-shows-images.ts`:
- Escanea carpeta `public/shows` (o equivalente) y construye set de paths referenciados en DB.
- Archivos no referenciados (`orphans`) → mover a `.trash/` con timestamp si su `mtime` > 10m (gracia para cargas concurrentes).
- En `.trash/` se purgan ficheros >24h definitivos.
- Modo por defecto dry-run imprime resumen; flag `--apply` para ejecutar acciones.
- Logs: cuenta total, referenciados, movidos, purgados; errores individuales no detienen el proceso.

## Límites y Validaciones Clave
- Número máximo de shows activos publicados simultáneamente: 4 (R7).
- Slots disponibles: 1..4 únicos (R8).
- Ventana permitida `startsAt`: ±365 días (R3,R27) → `START_TOO_FAR` / `START_TOO_OLD`.
- Peso imagen: ≤ 8MB (R20) → `FILE_TOO_LARGE`.
- Formatos: jpeg/png/webp (R21) → `UNSUPPORTED_FORMAT`.
- Slug pattern: regex `^[a-zA-Z0-9-]+$` (R13) → `INVALID_SLUG`.
- Slug inmutable tras publicar (R12) → `SLUG_LOCKED`.
- Imagen requerida para publicar (R6) → `IMAGE_REQUIRED`.
- Fechas: `endsAt >= startsAt` (`INVALID_DATE_RANGE`).

## Auditoría
Eventos JSON estructurados (logger interno) con `type`:
- `show.create_draft` `{ showId, actorRole }`
- `show.publish` `{ showId, actorRole }`
- `show.archive` `{ showId, actorRole }`
- `show.image.process` `{ showId, actorRole, bytesOriginal, bytesOptimized, durationMs, contentHash, reused }`

## Troubleshooting
Problema → Posible causa / acción:
- No aparece en feed público tras publicar: verificar que `startsAt` ≤ ahora y límite de 4 no bloqueó; revisar logs de publish (código `MAX_PUBLISHED_REACHED` o `SLOT_CONFLICT`).
- Botón Publish deshabilitado en UI: el show está sin imagen (`hasImage=false`) o no está en estado `DRAFT`.
- Error `START_TOO_FAR` / `START_TOO_OLD`: ajustar fecha dentro de rango ±365 días.
- Error `INVALID_SLUG`: normalizar manualmente (solo al estar en DRAFT) quitando caracteres especiales.
- Imagen subida pero peso >8MB: recomprimir localmente (ej. exportar a 80% calidad) y reintentar.
- Conflicto slot (`SLOT_CONFLICT`): liberar slot archivando otro show o cambiando a slot distinto mientras esté en DRAFT.
- `MAX_PUBLISHED_REACHED`: archivar un show existente o esperar expiración (`endsAt` pasada) y reintentar.
- Publicar falla con `IMAGE_REQUIRED`: subir imagen válida antes de intentar publicar.
- Cache no refleja cambio inmediato: dentro de ventana stale (≤180s); forzar cualquier mutación (subir imagen) o esperar renovación; confirmar que versión de cache incrementó en logs.
- Imagen no se optimiza / no genera blur: revisar logs `show.image.process` por errores de Sharp o MIME no soportado.
- Reemplazo de imagen no cambia orden: normal (orden definido por slot y `startsAt`), reemplazo no muta fechas.
- Archivar no reduce shows visibles: show con `endsAt` pasada ya no contaba; refrescar feed para limpiar snapshot stale.

## Extensiones Futuras (Ideas)
- Persistir eventos de auditoría en tabla `ShowEvent` para exploración histórica.
- Cache distribuida (Redis) con invalidación cross‑process.
- Variantes de imagen (thumbnail) y soporte AVIF progresivo.
- Programar auto‑archive al alcanzar `endsAt` (job periódico) para limpieza semántica.
- Búsqueda / filtrado admin (por estado, rango fechas, slot).
- Webhook on publish/archive para integraciones externas.

---
Última actualización: ${new Date().toISOString().slice(0,10)}
