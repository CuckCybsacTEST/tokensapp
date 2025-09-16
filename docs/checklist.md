# Checklist de tareas

Documentación funcional y técnica del checklist asociado a la asistencia BYOD (colaborador).

## Modelo de datos

Tablas principales (SQLite vía Prisma):
- `Task`
  - `id` (TEXT, PK)
  - `label` (TEXT)
  - `active` (INTEGER 0/1)
  - `sortOrder` (INTEGER)
  - `createdAt`, `updatedAt`
- `PersonTaskStatus`
  - `id` (TEXT, PK)
  - `personId` (TEXT, FK a `Person`)
  - `taskId` (TEXT, FK a `Task`)
  - `day` (TEXT YYYY-MM-DD)
  - `done` (INTEGER 0/1)
  - `updatedBy` (TEXT, FK a `User.id`)
  - `updatedAt` (DATETIME)
  - Índice único: `(personId, taskId, day)` para upsert idempotente

Relaciones relevantes:
- Un `User` (colaborador) está vinculado a un `Person` mediante `User.personId`.
- `PersonTaskStatus.updatedBy` referencia el `User` que guardó el cambio.

## Contratos de API

### GET `/api/tasks/list?day=YYYY-MM-DD`
- Auth: `user_session` válida (o `admin_session` ADMIN, por middleware), solo para BYOD (`/u/**`).
- Query:
  - `day` requerido en formato `YYYY-MM-DD` (validación estricta).
- Respuesta 200:
  ```json
  {
    "tasks": [
      { "id": "t1", "label": "Vestuario OK", "sortOrder": 10, "active": true },
      { "id": "t2", "label": "Elementos de seguridad", "sortOrder": 20, "active": true }
    ],
    "statuses": [
      { "taskId": "t1", "done": true, "updatedAt": "2025-09-12T22:15:30.123Z", "updatedByUsername": "ana" }
    ]
  }
  ```
- Errores:
  - 401 `{ "error": "unauthorized" }` sin sesión
  - 400 `{ "error": "invalid_day" }` si el día es inválido
  - 400 `{ "error": "user_without_person" }` si el usuario no tiene `personId`

### POST `/api/tasks/save`
- Auth: `user_session` válida (BYOD).
- Body JSON:
  ```json
  {
    "day": "YYYY-MM-DD",
    "items": [ { "taskId": "t1", "done": true }, { "taskId": "t2", "done": false } ]
  }
  ```
- Comportamiento:
  - Valida `day` y que `items.length <= 100`.
  - Filtra por tareas activas.
  - Upsert por `(personId, taskId, day)`; actualiza `done`, `updatedBy`, `updatedAt`.
  - Limita 10 req / 10s por usuario (rate limit suave en memoria).
  - Auditoría: `TASKS_SAVE` con `{ personId, day, count }` (sin contenido sensible).
- Respuestas:
  - 200 `{ "ok": true, "saved": N }` (incluye `saved: 0` si `items` está vacío)
  - 401 `{ "error": "unauthorized" }` sin sesión
  - 400 `{ "error": "invalid_day" }` formato de día inválido
  - 400 `{ "error": "invalid_items_length" }` si `items.length > 100`
  - 400 `{ "error": "user_without_person" }` si el usuario no tiene `personId`
  - 429 `{ "error": "rate_limited" }` si excede el rate limit

## Flujo BYOD

- Escaneo en `/u/scanner` con póster GLOBAL:
  - IN → marca asistencia y redirige a `/u/checklist?day=<local YYYY-MM-DD>&mode=IN`.
    - Checklist en modo IN es solo lectura (no editable).
  - OUT → marca asistencia y redirige a `/u/checklist?day=<local YYYY-MM-DD>&mode=OUT`.
    - Checklist en modo OUT es editable; permite guardar múltiples veces en el día.
- Repetición OUT el mismo día:
  - Asistencia devuelve alerta `already_marked` pero la checklist sigue editable.
  - Guardar nuevamente actualiza `updatedAt`/`updatedBy`.
- Importante: la redirección a checklist solo existe en BYOD (`/u/scanner`). El kiosco/admin (`/scanner`) no redirige.

## Seguridad y límites

- Acceso restringido a `/u/**` por middleware: requiere `user_session` válida o `admin_session` con rol ADMIN.
- `/u/checklist` está protegido igual que el resto de `/u/**`.
- Rate limit en `POST /api/tasks/save`: 10 solicitudes cada 10s por usuario (in-memory).
- Límite de items por save: 100.
- No se loguea contenido sensible de `items`; solo metadata mínima en auditoría.

## Seed y operación de tareas

- Seed inicial añade un set de tareas por defecto (7 aprox.).
  - Comando seed:
    ```bash
    npm run seed
    ```
- Activar/Desactivar tareas:
  - Las APIs `list/save` consideran solo tareas con `active = 1`.
  - Para desactivar temporalmente una tarea, setear `active = 0` (vía consola/DB o UI si existe).
- Orden de despliegue en UI:
  - `sortOrder` (asc) y luego `label`.

## Notas técnicas

- Implementación de `list/save` basada en SQL crudo para hot path y evitar N+1.
- Unicidad `(personId, taskId, day)` garantiza idempotencia por día.
- `updatedByUsername` se resuelve con `LEFT JOIN User` en el `list`.
- El día se interpreta en formato de calendario (YYYY-MM-DD); la redirección BYOD usa fecha local del dispositivo.
