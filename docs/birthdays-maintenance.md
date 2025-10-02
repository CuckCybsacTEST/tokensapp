# Mantenimiento de Tarjetas de Cumpleaños

Este documento describe tareas operativas para las tarjetas generadas y persistidas de invitaciones (host/guest).

## Generación
- Endpoint Admin: `POST /api/admin/birthdays/:id/cards/generate`.
- Idempotente: si ya existen ambas tarjetas (host y guest) devuelve `already: true`.
- Usa templates base en `public/birthdays/templates/celebrant-base.webp` y `guest-base.webp`.
- Archivos almacenados en `public/birthday-cards/<reservationId>/{host|guest}.png`.

## Listado
- Endpoint Admin: `GET /api/admin/birthdays/:id/cards` retorna `{ paths: { host?: string, guest?: string } }`.

## Purga
- Script: `scripts/purgeBirthdayCards.ts` elimina tarjetas cuyos tokens expiraron hace más de 30 días.
- Ejecutar diario (cron) o vía job programado.

## Regeneración
- Para regenerar (cambio de template), borrar carpeta `public/birthday-cards/<reservationId>` y eliminar filas `InviteTokenCard` asociadas; luego reejecutar generate.

## Seguridad
- Las imágenes no contienen PII adicional; solo QR (claim firmado) y estética.
- Admin puede acceder a la página de QRs con `?mode=admin` sin `clientSecret`.

## Posibles Futuras Mejores
- Endpoint público de cards (con `clientSecret`) para servir metadata sin recomponer.
- Cache headers largos (immutable) si se versionan nombres con hash.
- Soporte WebP adicional junto a PNG.
