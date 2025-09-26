# Mantenimiento de Batches

Endpoints añadidos para tareas administrativas puntuales: purgar batches de prueba y renombrar descripciones.

## 1. Purgar batches de prueba
`POST /api/system/tokens/purge-batches`

Requiere sesión ADMIN (el middleware lo valida). No tiene bypass por cron.

### Body
```jsonc
{
  "batchIds": ["<batchId1>", "<batchId2>"],
  "options": {
    "dryRun": true,              // true = sólo muestra conteos, no borra
    "deleteUnusedPrizes": true   // opcional, borra premios que quedaron sin tokens
  }
}
```

### Respuesta (dryRun)
```jsonc
{
  "ok": true,
  "dryRun": true,
  "batchIds": ["..."],
  "summary": {
    "tokenCounts": [ { "batchId": "...", "_count": { "_all": 100 } } ],
    "rouletteSessions": 2,
    "spins": 35,
    "redeemed": [ { "batchId": "...", "_count": { "_all": 4 } } ]
  }
}
```

### Respuesta (real)
```jsonc
{
  "ok": true,
  "batchIds": ["..."],
  "deleted": {
    "tokenCounts": [...],       // conteos previos eliminados
    "rouletteSessions": 2,
    "spins": 35,
    "redeemed": [...],          // tokens que estaban redimidos / entregados (solo informativo)
    "prizes": ["<prizeId1>"]   // premios eliminados por quedar sin tokens
  }
}
```

### Orden interno de eliminación
1. `RouletteSpin` asociados a sesiones del batch
2. `RouletteSession`
3. `Token`
4. `Batch`
5. (Opcional) `Prize` huérfanos (sin tokens ni assignedTokens)

### Consideraciones
- Idempotente: correr de nuevo sobre los mismos `batchIds` devuelve conteos vacíos.
- No revierte canjes; sólo borra el registro si forma parte del batch y no se hace distinción entre tokens redimidos o no (se reportan en `redeemed` para que el operador decida antes de ejecutar).
- Usar siempre `dryRun` primero.

### Ejemplo rápido en consola navegador
```javascript
await fetch('/api/system/tokens/purge-batches', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    batchIds: ['abcd123','efgh456'],
    options: { dryRun: true }
  })
}).then(r=>r.json()).then(console.log);
```

## 2. Renombrar descripción de un batch
`PATCH /api/batch/[id]` (alias: `/api/batches/[id]`)

### Body
```jsonc
{ "description": "Nuevo texto" }
```
- Máx ~180 caracteres (validación ligera).
- Requiere ADMIN.
- No afecta tokens ni premios.

### Respuesta
```jsonc
{ "ok": true, "batch": { "id": "...", "description": "Nuevo texto" } }
```

### Ejemplo
```javascript
const batchId = 'cmg0....';
fetch(`/api/batch/${batchId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ description: 'SHOW 27.06.2025 // PIRATA RAVE' })
}).then(r=>r.json()).then(console.log);
```

## 3. Seguridad / Permisos
- Ambos endpoints están en zonas protegidas (`/api/system` y `/api/batch`). Middleware exige rol ADMIN.
- No existe endpoint público para estas operaciones.
- `purge-batches` no tiene bypass por `x-cron-secret` (solo se aplica a `enable-scheduled`).

## 4. Futuras mejoras sugeridas
- Botón UI en `/admin/batches` para rename inline (edición in-place).
- Confirm modal para purge con vista previa de conteos.
- Flag de protección contra borrado si existen canjes (`redeemed`) salvo parámetro explícito `force=true`.
- Auditoría dedicada (`EventLog`) para cada purge y rename.

---
Última actualización: (añadir fecha al commit)
