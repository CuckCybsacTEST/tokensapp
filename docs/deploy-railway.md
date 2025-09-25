# Guía de despliegue estable en Railway (Next.js + Prisma)

Este documento resume la solución definitiva aplicada para construir y desplegar el proyecto de forma estable en Railway, evitando timeouts y errores de build relacionados con dependencias nativas (sharp) y tamaño de imagen.

## Objetivos
- Builds predecibles sin cuelgues.
- Imagen final pequeña y rápida de subir al registry de Railway.
- Evitar que módulos pesados (sharp) rompan el build.
- Confirmar uso de PostgreSQL en producción (sin confusión con SQLite).

## Cambios clave

1) Next.js en modo "standalone"
- `next.config.mjs` ahora define `output: 'standalone'`.
- En el Dockerfile se copia sólo `.next/standalone` + `.next/static` + `public` (y `prisma` si aplica), no `node_modules` completo.
- Arranque con `node server.js` (servidor empaquetado por Next).

Beneficios: runtime más pequeño y menos archivos que subir; menor probabilidad de timeout al hacer el push de la imagen.

2) sharp: importación perezosa (lazy-load)
- En `src/lib/print/{compose,layout,pdf}.ts` se reemplazó `import sharp from 'sharp'` por una función:

```ts
async function getSharp() {
  const m = await import('sharp');
  return m.default || (m as any);
}
```

- Dentro de cada función se hace `const sharp = await getSharp();` justo antes de usarlo.

Beneficios: Next no intenta cargar `sharp` en tiempo de build/analizador de rutas; evita errores cuando el binario aún no está disponible y reduce el trabajo del build.

3) Dockerfile optimizado
- Base y runner: `public.ecr.aws/docker/library/node:20-alpine` con `libc6-compat` y `openssl` instalados (compatibilidad con binarios nativos y Prisma).
- Etapas: `deps` → `prisma` (prisma generate) → `builder` (build Next) → `runner` (standalone).
- En `builder`:
  - `ENV DATABASE_URL="postgresql://build:build@localhost:5432/build_db"` (DSN ficticio Postgres para evitar cualquier referencia a SQLite durante el build). El valor real lo inyecta Railway en runtime.
  - Variables para estabilidad de memoria: `NODE_OPTIONS=--max_old_space_size=2048`, `NEXT_PRIVATE_BUILD_WORKERS=2`.
- En `runner`:
  - Copiar sólo `/.next/standalone`, `/.next/static`, `/public`, `/prisma` y `docker-start.sh`.
  - Sin `chown` recursivo a todo `/app`; sólo a directorios necesarios (si aplica). 

4) Script de arranque simplificado
- `scripts/docker-start.sh` ahora arranca con `node server.js` (Next standalone).
- Migraciones Prisma en runtime son opcionales: sólo se ejecutan si `ALLOW_MIGRATIONS=1`.
  - Para PostgreSQL: `prisma migrate deploy`.
  - Para SQLite (local/efímero): hay rama específica, pero no se usa en Railway.

Beneficios: arranque más rápido y menos trabajo en el contenedor productivo.

5) .dockerignore depurado
- Se limpió para reducir el contexto de build (excluye `.next`, `node_modules`, bases de datos locales, reports, etc.).

## PostgreSQL (confirmación)
- En `prisma/schema.prisma`: `provider = "postgresql"` y `url = env("DATABASE_URL")`.
- En runtime (Railway) se usa el `DATABASE_URL` de Postgres. La rama SQLite del script de arranque es sólo para entornos locales.
- El DSN SQLite que aparecía en logs de build fue reemplazado por un DSN Postgres sintético, evitando confusiones.

## Variables de entorno
- Requeridas en Railway:
  - `DATABASE_URL`: DSN de PostgreSQL.
  - `TOKEN_SECRET`: clave segura para firmar tokens de cliente.
  - `PORT`: Railway la define automáticamente (default 3000 por compatibilidad).
  - `PUBLIC_BASE_URL`: p. ej. `https://<tu-domino>`.
- Opcionales:
  - `ALLOW_MIGRATIONS=1`: si se quieren ejecutar migraciones en el arranque.

## Health y smoke
- Añadir si se desea un `HEALTHCHECK` en Dockerfile (opcional) que apunte a `/api/system/health`.
- Ya existen scripts de smoke en `scripts/` para verificar endpoints básicos.

## Flujo recomendado de despliegue
1. Configurar variables en Railway (DATABASE_URL, TOKEN_SECRET, PUBLIC_BASE_URL, etc.).
2. (Opcional) Para primera vez en una BD vacía: setear `ALLOW_MIGRATIONS=1` y desplegar.
3. Ver logs de arranque; desactivar `ALLOW_MIGRATIONS` después de aplicada la baseline.
4. Realizar smoke de `/api/system/tokens/status` y de las rutas críticas.

## Notas finales
- Si en algún momento Alpine + sharp vuelva a dar problemas de binarios, la alternativa es cambiar a `node:20-bullseye-slim` (Debian/GLIBC). Con "standalone" el tamaño final seguirá siendo razonable.
- Mantener los imports perezosos de `sharp` garantiza que el build de Next no se vea afectado por el estado de esa dependencia.

---

Última revisión: sustituido DSN de build por Postgres sintético, Next standalone activo, lazy-load de sharp aplicado y arranque por `node server.js`. Sin push automático a GitHub; pendiente a tu confirmación para publicar.
