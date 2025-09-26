# QR Prizes App

![CI](https://github.com/deivipluss/tokensapp/actions/workflows/ci.yml/badge.svg)

Aplicación Next.js para generación de tokens con premios preasignados, QRs y canje con expiración.

## Stack
- Next.js (App Router)
- Prisma + SQLite
- Zod, date-fns
- QRCode, Archiver
- Sistema de ruleta interactivo
- Scheduler de tokens (ventana operativa 18:00–00:00 con overrides manuales fuera de horario)

## Configuración
1. Copiar `.env.example` a `.env` y ajustar `TOKEN_SECRET`.
2. Instalar dependencias: `npm install`.
3. Crear tablas: `npm run db:push`.
4. Seed inicial (opcional y seguro):
	 - Por defecto el seed está deshabilitado y NO modifica una base existente.
	 - Para ejecutarlo solo en una DB vacía, corre en una línea:
		 - En PowerShell (Windows): `setx ALLOW_SEED 1; $env:ALLOW_SEED='1'; npm run seed`
		 - En bash: `ALLOW_SEED=1 npm run seed`
	 - El seed es idempotente y, en modo por defecto, se salta si detecta filas existentes (no borra datos).
5. Levantar dev: `npm run dev`.
6. (Opcional) Activar flujo 2 fases reveal->deliver: en `.env` añadir `TWO_PHASE_REDEMPTION=true`. Usa `/src/lib/featureFlags.ts` para leerlo.
7. (Marketing Cumpleaños) Habilitar endpoints públicos en dev: añade en `.env` una de estas variables (alias):
	- `BIRTHDAYS_PUBLIC=1` (servidor)
	- `NEXT_PUBLIC_BIRTHDAYS_ENABLED=1` (cliente/servidor)

	Por defecto, en desarrollo los endpoints públicos están habilitados si no configuras nada. En producción, configura explícitamente una de las variables anteriores según tu despliegue.

8. (Seguridad) clientSecret usa el mismo secreto que tokens (`TOKEN_SECRET`)
### Política de activación (Scheduler Tokens)

El sistema aplica una ventana programada: operativo entre 18:00 (inclusive) y 00:00 (exclusive) en la zona `America/Lima` (configurable vía `TOKENS_TIMEZONE`).

Option B (boundary enforcement):
- A las 18:00 se fuerza ON.
- A las 00:00 se fuerza OFF.
- Si un admin enciende manualmente fuera de la ventana (ej. 02:00) queda ON hasta la medianoche siguiente (override temporal).
- Si un admin apaga dentro de la ventana (ej. 20:30) queda OFF hasta la medianoche (cuando se fuerza OFF igualmente).

Los endpoints internos diferencian:
- `tokensEnabled` (estado efectivo persistido en DB)
- `scheduledEnabled` (cálculo informativo – no bloquea si hay override manual ON)

Más detalle y escenarios en [`docs/tokens-scheduler.md`](./docs/tokens-scheduler.md).
	- El `clientSecret` que autoriza la generación/listado de QRs se firma con `TOKEN_SECRET`.
	- Debes definir `TOKEN_SECRET` en producción con un valor fuerte (32+ bytes aleatorios).
	- En desarrollo ya existe un valor por defecto para facilitar pruebas locales.

### Nota rápida `DATABASE_URL`
En desarrollo, si olvidas definir `DATABASE_URL`, el archivo `src/lib/prisma.ts` aplica un fallback automático a `file:./prisma/dev.db` para evitar errores ruidosos. En producción este fallback NO se aplica: la variable es obligatoria y el arranque fallará explícitamente si falta. Define siempre la variable en entornos CI/CD y staging.

#### Flag de test: `FORCE_PRISMA_PROD`
Esta variable de entorno NO debe usarse en entornos reales. Su propósito es únicamente forzar el comportamiento "como producción" dentro de los tests sin necesidad de cambiar `NODE_ENV`. Así validamos que la app falla rápidamente si falta `DATABASE_URL`.

- Cómo se usa en tests: el test `tests/env.production.test.ts` establece `FORCE_PRISMA_PROD=1` y deja `DATABASE_URL` vacío para asegurar que se lanza el error esperado.
- Qué hace: hace que `src/lib/prisma.ts` trate el entorno como productivo aunque `NODE_ENV !== 'production'`.
- Nunca establecer en CI/CD normal ni en despliegues; en un entorno real siempre debe bastar con `NODE_ENV=production` y una `DATABASE_URL` válida.
- Si accidentalmente se define y falta `DATABASE_URL`, la app fallará al arrancar (comportamiento correcto pero diagnóstico más confuso). Simplemente elimina la variable.

Resumen: `FORCE_PRISMA_PROD` existe sólo para pruebas automatizadas y depuración puntual; no documentarlo en `.env.example` para desalentar su uso cotidiano.

## Requisitos

- Node.js 20.x (LTS) (`node -v` para verificar)
- npm 10.x (usa `npm ci` para instalaciones reproducibles)
- SQLite incluido (no requiere servicio externo para dev)

Agregado en `package.json` el campo `engines` para facilitar validación en plataformas que lo soporten.

## Documentación
La documentación técnica completa está disponible en la carpeta `docs/`:

- [Sistema de Layouts](./docs/layout-system.md) - Arquitectura de layouts y mejoras implementadas
- [Sistema de Ruleta](./docs/roulette-system-technical.md) - Documentación técnica del sistema de ruleta
- [Mejoras en SpinButton](./docs/spin-button-improvements.md) - Detalles de las mejoras en la interacción del botón de giro
- [Terminología](./docs/terminology.md) - Glosario de términos utilizados en el proyecto
- [Checklist de tareas](./docs/checklist.md) - Modelo, APIs, flujo BYOD y operación
- [Registro de colaboradores](./docs/collaborators.md) - Alta de personas/usuarios, seguridad y ejemplos curl/PowerShell
- [Roles y permisos](./docs/roles.md) - Diferencias entre `COLLAB`/`STAFF` (BYOD) y `ADMIN`/`STAFF` (panel), rutas habilitadas y buenas prácticas
- [Troubleshooting local](./docs/troubleshooting.md) - Errores comunes (`DATABASE_URL`, EPERM Windows, regeneración Prisma)

> Nota importante (colaboradores): desde ahora, el “código” de Persona es el DNI normalizado (solo dígitos) y ya no se ingresa manualmente. El formulario usa un select de `Área` con opciones fijas. Ver detalles y ejemplos en [Registro de colaboradores](./docs/collaborators.md).

## Tareas medibles (resumen)

Soporte end-to-end para tareas con metas numéricas por persona/día. Detalle completo en [Checklist de tareas](./docs/checklist.md).

- Configuración en Admin: cada tarjeta tiene controles para marcar "Tarea medible", fijar `Objetivo` y `Unidad`. La tarjeta "Nueva tarea" también permite configurarlo al crear.
- Checklist BYOD (colaborador): el stepper numérico se habilita tras registrar `IN` y hace autosave con debounce; cuando `valor >= objetivo` la tarea se considera hecha para esa persona/día.
- Agregados en Admin: por tarea se muestran `completedToday` (personas que llegaron al objetivo hoy) y `sumValueToday` (suma de valores reportados). La UI se actualiza por SSE sin recargar toda la lista.
- Día en UTC: todas las operaciones de checklist y agregados usan corte diario UTC para consistencia (admin y usuario ven los mismos totales).
- Estilos: el input numérico tiene estilos legibles en dark mode.
- Endpoints clave: `/api/tasks/list`, `/api/tasks/save`, `/api/admin/tasks` (GET/POST/PUT/DELETE), `/api/events/tasks` (SSE).
- Autenticación: cookies separadas para admin (`admin_session`) y colaboradores (`user_session`). En desarrollo existen helpers documentados en `docs/`.

## Endpoints

| Método | Path | Descripción | Body (JSON clave) | Códigos éxito | Códigos error más comunes |
|--------|------|-------------|-------------------|---------------|---------------------------|
| GET | `/api/prizes` | Lista premios | - | 200 | 500 |
| POST | `/api/prizes` | Crea premio nuevo (key secuencial auto) | `label`, `color?`, `description?`, `stock?` | 201 | 400 (VALIDATION_ERROR / INVALID_COLOR) |
| PATCH | `/api/prizes/:id` | Actualiza premio | `label?`, `color?`, `description?`, `stock?`, `active?` | 200 | 400 (VALIDATION_ERROR/INVALID_COLOR), 404 (NOT_FOUND) |
| POST | `/api/batch/generate-all` | Emite tokens para TODOS los premios activos con stock > 0 consumiendo todo el stock | `expirationDays`, `description?`, `includeQr?`, `lazyQr?` | 200 | 400 (NO_ACTIVE_PRIZES / INVALID_STOCK / LIMIT_EXCEEDED / INVALID_EXPIRATION), 409 (RACE_CONDITION), 429 (RATE_LIMIT), 500 |
| POST | `/api/batch/generate` | DEPRECATED: usar `/api/batch/generate-all` | - | - | 410 (MANUAL_MODE_DISABLED) |
| GET | `/api/batch/:id/download` | Descarga ZIP de batch existente | query `qr=1` para PNGs | 200 | 404 (NOT_FOUND) |
| POST | `/api/redeem/:tokenId` | Canjea token si válido | - | 200 | 400 (INVALID_SIGNATURE), 404 (TOKEN_NOT_FOUND), 409 (ALREADY_REDEEMED), 410 (EXPIRED), 423 (SYSTEM_OFF), 429 (RATE_LIMIT) |
| GET | `/api/system/tokens/status` | Estado global y scheduler informativo | - | 200 | 401/403 |
| POST | `/api/system/tokens/toggle` | Activa/desactiva canje global (con auditoría) | `enabled:boolean` | 200 | 401/403/400 |
| GET | `/api/system/tokens/capabilities` | Capacidades del usuario actual `{ canView, canToggle }` | - | 200 | 401/403 |
| GET | `/api/admin/health` | Health check autenticado | Header `Authorization` (Bearer o Basic) | 200 / 503 | 401 (UNAUTHORIZED) |

Notas:
- `lazyQr=true` en generación: no se incluyen PNG en el ZIP inicial; se generan al descargar con `qr=1`.
- En CSV: columnas `token_id, batch_id, prize_id, prize_key, prize_label, prize_color, expires_at_iso, expires_at_unix, signature, redeem_url, redeemed_at, disabled`.
- `signatureVersion` se almacena por token (futuro soporte rotación clave).
- Errores siguen formato `{ code, message, ... }` (los legados se están unificando).

Control de tokens por Caja y permisos detallados en: [`docs/tokens-control.md`](./docs/tokens-control.md).

## Flujo de Emisión de Tokens (`/api/batch/generate-all`)

Único flujo soportado: emite en un lote todos los tokens pendientes (stock numérico > 0) de cada premio activo y pone su stock a 0. Simplifica operaciones periódicas y evita configuraciones manuales por premio.

Resumen
- Endpoint: `POST /api/batch/generate-all`.
- Body mínimo: `{ "expirationDays": <preset> }` con preset en `1,3,5,7,15,30` → caso contrario `INVALID_EXPIRATION`.
- Opcionales: `description?`, `includeQr?` (default true), `lazyQr?` (solo válido si `includeQr=true`).
- Límite de tokens: `BATCH_MAX_TOKENS_AUTO` (default 10000) → exceso `LIMIT_EXCEEDED`.
- Si ningún premio elegible: `NO_ACTIVE_PRIZES`.
- Concurrencia: segundo intento simultáneo puede recibir `409 RACE_CONDITION`.
- Respuesta: ZIP (200) con `manifest.json`, `tokens.csv` y PNGs según modo QR.

`manifest.meta` incluye:
```jsonc
{
	"mode": "auto",
	"expirationDays": 7,
	"aggregatedPrizeCount": 5,
	"totalTokens": 1340,
	"qrMode": "none|eager|lazy",
	"prizeEmittedTotals": { "<prizeId>": <incrementoConsumido> }
}
```

QR Modes
- `includeQr=false` → `qrMode="none"` (sin PNGs; se pueden generar luego descargando con `qr=1`).
- `includeQr=true & !lazyQr` → `qrMode="eager"` (PNGs inmediatos).
- `includeQr=true & lazyQr` → `qrMode="lazy"` (PNGs diferidos en descarga con `qr=1`).

Errores (400 salvo indicado): `NO_ACTIVE_PRIZES`, `INVALID_STOCK`, `LIMIT_EXCEEDED`, `INVALID_EXPIRATION`, `RACE_CONDITION` (409), `RATE_LIMIT` (429).

Logging principal
- `PRIZE_STOCK_CONSUMED` (por premio, post-transacción).
- `BATCH_AUTO_OK`, `BATCH_AUTO_FAIL`, `BATCH_AUTO_ERROR`.

Buenas prácticas
- Revisar stocks y límite antes de ejecutar.
- Usar `lazyQr` para cargas grandes con PNG.
- Monitorizar eventos `RACE_CONDITION`; si son frecuentes, introducir locking externo.

Ejemplo
```bash
curl -X POST https://tu-dominio/api/batch/generate-all \
	-H "Authorization: Bearer <token>" \
	-H "Content-Type: application/json" \
	-d '{"expirationDays":7,"includeQr":false}' \
	-o batch_auto.zip
```

Performance
- Complejidad O(nTokens) (firma + inserts). PNGs incrementan CPU/memoria; preferir modo lazy para >5k tokens.

Limitaciones
- No exclusiones selectivas salvo desactivar premio o poner stock 0.
- Rate limit in-memory (para multi-nodo usar backend compartido / Redis).

### Reporting de Emisión
Campos clave en `Prize` para auditoría y métricas:

| Campo | Descripción | Notas |
|-------|-------------|-------|
| `emittedTotal` | Acumulado histórico de tokens emitidos para el premio. Se incrementa exactamente por la cantidad de stock consumido en cada batch automático. | No se reduce al canjear ni al resetear stock. Útil para comparar contra canjes y estimar tasa de utilización. |
| `lastEmittedAt` | Marca temporal (UTC) de la última emisión (consumo de stock > 0). | `NULL` si nunca se ha emitido. |

Relación con badges en UI (`/admin/prizes`):
- Badge "Pendiente (N)" se muestra cuando `stock > 0` (tokens aún no emitidos, listos para el próximo batch).
- Badge "Emitido" cuando `stock = 0`; el tooltip muestra `emittedTotal` (total histórico emitido), diferenciando premios que ya agotaron su último lote.

Evento vs campos persistidos:
- Cada lote genera eventos `PRIZE_STOCK_CONSUMED { prizeId, count }` después de la transacción; estos permiten reconstruir series temporales de emisión sin depender de snapshots de `emittedTotal`.
- `emittedTotal` es conveniente para lecturas rápidas y evitar agregaciones frecuentes sobre `EventLog`.

Consultas útiles (SQLite):
```sql
-- Últimos premios emitidos
SELECT id, label, emittedTotal, lastEmittedAt
FROM Prize
WHERE lastEmittedAt IS NOT NULL
ORDER BY lastEmittedAt DESC
LIMIT 20;

-- Reconstruir tokens emitidos por día usando EventLog
SELECT substr(createdAt, 1, 10) AS day, SUM(json_extract(metadata,'$.count')) AS tokens
FROM EventLog
WHERE type = 'PRIZE_STOCK_CONSUMED'
GROUP BY day
ORDER BY day DESC
LIMIT 14;
```

Buenas prácticas de reporting:
- Para métricas diarias fiables usa `EventLog` (evita doble conteo si se reajusta manualmente `emittedTotal`).
- No reinicies `emittedTotal` salvo migración excepcional: romperías series históricas. Si necesitas slicing por periodo, deriva acumulados desde eventos filtrados por fecha.
- Correlaciona `emittedTotal` con canjes (tokens redimidos) para extraer % de utilización y planificar nuevos stocks.

### Ciclo Operativo de Emisión
1. Ajustar stock: establece en cada premio el número de tokens que quieres emitir (o deja 0 si no deseas emitir ahora).
2. Generar lote: ejecuta el flujo automático (UI botón "Generar Automático" o `POST /api/batch/generate-all`).
3. Consumo: todo el stock positivo se convierte en tokens y el stock de esos premios pasa a 0 inmediatamente (se registra `PRIZE_STOCK_CONSUMED`).
4. Reabastecer: cuando necesites nuevos tokens para un premio, vuelve a asignar un valor de stock > 0 y repite el paso 2. El total histórico emitido queda reflejado en `emittedTotal` y en la UI como badge "Emitido" vs "Pendiente".

Notas ciclo:
- No es necesario eliminar tokens antiguos; diferenciación se hace por batch y expiración.
- Si se asigna stock simultáneamente por varios operadores y se dispara la generación, puede aparecer `RACE_CONDITION` en uno de los intentos concurrentes (reintentar tras refrescar estados).

## Flujo 2 Fases (Reveal → Deliver)

Separa el instante de sorteo/asignación del premio (reveal) del momento de confirmación operativa (deliver). Permite mostrar al usuario qué ganó mientras el staff controla entregas físicas y métricas de backlog.

Estados Token (flag `TWO_PHASE_REDEMPTION=true`):
```
 NEW (emitido)
	 │ spin / sorteo (ruleta u otro mecanismo)
	 ▼
 REVEALED  -- seteados: revealedAt, assignedPrizeId
	 │ confirmación de entrega (staff)
	 ▼
 DELIVERED -- seteados: deliveredAt (+ redeemedAt espejo), deliveredByUserId?, deliveryNote?
	 │ revert opcional (admin)
	 └──────────────┐
									▼
						REVEALED (mantiene revealedAt & assignedPrizeId; limpia deliveredAt, redeemedAt, deliveredByUserId, deliveryNote)
```

Campos / Semántica:
- `revealedAt`: timestamp de revelación (spin). No implica entrega.
- `assignedPrizeId`: premio adjudicado en el reveal.
- `deliveredAt`: momento de entrega física; al setearse copia también a `redeemedAt` para compatibilidad.
- `redeemedAt`: campo legacy; en dos fases actúa como espejo sólo al entregar.
- `deliveredByUserId`: quién confirmó (placeholder actual para futura auth real).
- `deliveryNote`: nota opcional (observaciones de entrega / incidencias).

Transiciones válidas:
- NEW → REVEALED (spin). Registra evento `TOKEN_REVEALED`.
- REVEALED → DELIVERED (confirmar entrega). Evento `TOKEN_DELIVERED`.
- DELIVERED → REVEALED (revert-delivery). Evento `TOKEN_DELIVERY_REVERTED`.

Invariantes aplicadas en tests:
- No se puede entregar si no está REVEALED.
- Idempotencia: doble entrega bloqueada.
- Revert sólo si estaba DELIVERED.
- Spin en modo dos fases nunca setea `redeemedAt`.

Compatibilidad legacy (flag off):
- Spin salta NEW → DELIVERED escribiendo únicamente `redeemedAt` (sin `revealedAt`).
- Reportes antiguos que miran `redeemedAt` siguen funcionando porque en flujo dos fases se llena al entregar.

Revert delivery:
- Endpoint: `POST /api/token/:tokenId/revert-delivery`.
- Limpia: deliveredAt, redeemedAt, deliveredByUserId, deliveryNote.
- Conserva: revealedAt, assignedPrizeId (el premio asignado no cambia).

Métricas añadidas:
- `revealed`, `delivered`, `revealedPending = revealed - delivered`.
- Lead time reveal→deliver: avg y p95 global y por premio.

Auditoría (`EventLog.type`): `TOKEN_REVEALED`, `TOKEN_DELIVERED`, `TOKEN_DELIVERY_REVERTED`.

Flujo operativo resumido:
1. Spin revela y fija premio → estado REVEALED.
2. Staff escanea/busca token y confirma → DELIVERED (se completa canje legacy).
3. Dashboard muestra backlog (revealedPending) y tiempos de entrega.
4. Si hubo error se revierte y vuelve a REVEALED sin perder trazabilidad (logs conservan historia).

Desactivar (rollback funcional): poner `TWO_PHASE_REDEMPTION=false` devuelve comportamiento original sin necesidad de migraciones adicionales.

## Pendiente / Próximos pasos
- Unificar formato de error en todos los endpoints restantes.
- Métricas y dashboard de canjes en UI.
- Rotación de secreto de firma (`signatureVersion` > 1) y endpoint de verificación de firmas.
- Cache distribuida para rate limit (actual in-memory).
- Mejoras de seguridad (CSRF para endpoints admin, auth robusta).

## Guía: Rotación de TOKEN_SECRET sin invalidar tokens antiguos

El modelo de datos ya guarda `signatureVersion` en cada token. Para rotar la clave de firma sin romper tokens existentes:

1. Preparación
	- Genera un nuevo secreto seguro (ej. 32+ bytes aleatorios base64).
	- Añade al entorno (sin quitar el actual):
	  - `TOKEN_SECRET_V1` (actual, opcionalmente renombra el viejo `TOKEN_SECRET`).
	  - `TOKEN_SECRET_V2` (nuevo secreto).
	- Mantén `CURRENT_SIGNATURE_VERSION = 1` de momento.

2. Código de verificación multi‑versión
	- Ajusta donde se verifica la firma (endpoint de canje) para seleccionar secreto según `token.signatureVersion`.
	- Ejemplo rápido:
	  ```ts
	  const secretMap: Record<number,string> = {
		 1: process.env.TOKEN_SECRET_V1!,
		 2: process.env.TOKEN_SECRET_V2!,
	  };
	  const secret = secretMap[token.signatureVersion];
	  if (!secret) return apiError('UNKNOWN_SIGNATURE_VERSION','Versión no soportada',{},400);
	  const ok = verifyTokenSignature(secret, token.id, token.prizeId, token.expiresAt, token.signature, token.signatureVersion);
	  ```
	- Despliega este cambio primero (aún generando tokens v1) para asegurar que ambos secretos están cargados en todos los nodos.

3. Activar nueva versión
	- Cambia `CURRENT_SIGNATURE_VERSION = 2` en `signing.ts`.
	- Cambia la lógica de generación para usar el secreto nuevo (al pasar `version`=2 ya se firmará con `TOKEN_SECRET_V2`).
	- Despliega. Desde ahora, todos los tokens nuevos se crean como versión 2.

4. Fase de coexistencia
	- Mantén ambos secretos hasta que todos los tokens v1 hayan expirado (máximo = mayor valor de `expirationDays` usado en generación + margen de seguridad, p.ej. 7 días extra).
	- Monitorea métricas: canjes de `signatureVersion=1` deberían ir a cero tras el periodo.

5. Retiro del secreto antiguo
	- Elimina `TOKEN_SECRET_V1` del entorno.
	- (Opcional) Limpia tokens antiguos expirados (`DELETE FROM Token WHERE signatureVersion=1 AND expiresAt < now();`).
	- (Opcional) Incrementa nuevamente para versión 3 cuando se necesite otra rotación repitiendo el proceso.

6. Emergencia / rollback
	- Si tras activar v2 surge un problema, vuelve temporalmente `CURRENT_SIGNATURE_VERSION` a 1 para seguir emitiendo tokens con el secreto estable mientras investigas (no elimines nunca el secreto viejo antes de confirmar la salud del sistema).

7. Buenas prácticas
	- No reutilices secretos previos.
	- Almacena secretos en un manager seguro (Vault, Parameter Store, etc.).
	- Evita exponer versiones soportadas públicamente; responde con código genérico si llega una versión futura desconocida.

Resumen rápido
Preparar secretos -> desplegar verificación multi‑secreto -> subir versión activa -> esperar expiración -> retirar secreto anterior.

## Despliegue: VPS (SQLite local) vs Turso (libSQL)

### 1. Opción A: VPS con SQLite local
Uso: instalaciones simples, bajo volumen (≤ decenas de miles de canjes/día), un solo nodo o réplica de sólo lectura warm.

- Infraestructura: 1 VM (Ubuntu/Debian). Instala Node.js LTS y un reverse proxy (Nginx / Caddy).
- Persistencia: archivo `prisma/dev.db` (ajusta ruta en producción, p.ej. `/var/app/data/app.db`).
- Variables clave:
	- `DATABASE_URL="file:./data/app.db"` (o ruta absoluta `file:/var/app/data/app.db`).
	- `TOKEN_SECRET=...`
	- `PUBLIC_BASE_URL=https://tu-dominio`
- Pasos:
	1. `git pull` / copiar artefactos.
	2. `npm ci`
	3. `npm run db:push` (o `prisma migrate deploy` si gestionas migraciones versionadas).
	4. `npm run build`
	5. Ejecutar con `node .next/standalone/server.js` (o `pm2`, `systemd`).
- Backups: snapshot periódico del archivo `.db` (fs freeze opcional) + copia off‑site; consistencia suficiente si app parada unos ms o usando `sqlite3 .backup`.
- Ventajas: simplicidad, latencia mínima local, costo muy bajo.
- Riesgos: escalado vertical limitado; un solo punto de fallo; rate limit y cache in‑memory no se comparten entre instancias.

Hardening rápido VPS:
- Montar disco con `noatime` para reducir I/O.
- Habilitar backups automáticos (cron `sqlite3 /path/app.db ".backup '/backups/app_$(date +%F).db'"`).
- Supervisar file size y PRAGMA autovacuum (configurable vía script si crece mucho).

### 2. Opción B: Turso (libSQL remoto)
Uso: necesidad de múltiples réplicas geográficas, escalado de lectura y sesiones sin estado.

- Variables adicionales:
	- `DATABASE_URL="libsql://<db-name>-<org>.turso.io"`
	- `TURSO_AUTH_TOKEN=...` (export; Prisma lo usa vía extensión HTTP header).
- Cambios en `schema.prisma` datasource (ejemplo):
	```prisma
	datasource db {
		provider = "sqlite"
		url      = env("DATABASE_URL")
	}
	```
	(Se mantiene provider sqlite; libSQL es compatible.)
- Migraciones: usar `prisma migrate deploy` contra Turso; para inicializar: `prisma db push` sólo en entornos de stage/dev.
- Despliegue app: múltiples instancias (Vercel, Fly.io, Docker en varias regiones) leyendo la misma base.
- Backups: usar snapshots de Turso / exportación periódica (`.dump`); almacenar en objeto (S3, etc.).
- Latencia: preferir réplicas cercanas a usuarios; Turso enruta a réplica; escrituras van al primary -> eventual propagation (verifica si la app requiere lectura inmediata tras escritura crítica; canje transaccional podría necesitar targeting primary si se observa lag).
- Ajustes de canje: si detectas retraso de replicación afectando lecturas post canje, añadir opción para forzar lectura primaria (flag env) o fallback a verificación secundaria + reintento.

Ventajas Turso:
- Escalado horizontal sencillo, replicación global, TLS integrado.
Inconvenientes:
- Latencia de escritura ligeramente mayor vs archivo local.
- Posible lag de replicación para operaciones inmediatamente leídas en otra región.

### 3. Consideraciones comunes
- `TOKEN_SECRET` y futuros `TOKEN_SECRET_V*` sólo en backend; nunca en cliente.
- Rate limiting actual en memoria: con >1 instancia se requiere backend compartido (Redis) o mover lógica a gateway (pendiente).
- Logging: centralizar stdout JSON en agregador (Vector, Loki, ELK).
- Health: `/api/admin/health` debe protegerse (ya soporta Bearer/Basic). Automatizar chequeo en monitor.

### 4. Migración de SQLite local a Turso
1. Congelar escrituras (modo mantenimiento breve).
2. `sqlite3 app.db ".backup export.db"`.
3. Importar a Turso (`turso db shell <db> < export.db` o usar herramienta oficial). 

## Persistencia en despliegues (evitar que se borre todo en cada deploy)

Para que no se reinicialicen los seeds ni se pierdan archivos generados (pósters, plantillas), configura una carpeta de datos persistente y variables de entorno adecuadas:

- Monta un volumen en el contenedor en `/data` (Railway/Render/Fly/Kubernetes).
- Define `DATABASE_URL` de forma persistente:
	- SQLite: `DATABASE_URL=file:/data/db/prod.db`.
	- Postgres: `DATABASE_URL=postgres://user:pass@host:5432/db`.
- Seed en producción: por seguridad, NO se ejecuta automáticamente. Si necesitás datos base iniciales en un entorno vacío, conectate al contenedor/instancia y ejecuta manualmente: `ALLOW_SEED=1 npm run seed`. No lo uses en entornos con datos.
- Dominios públicos:
	- `PUBLIC_BASE_URL` y `NEXT_PUBLIC_BASE_URL` deben apuntar a tu dominio (ej. `https://tokensapp-production.up.railway.app`).

Qué hace el entrypoint (`scripts/docker-start.sh`):
- Detecta `/data` y crea subcarpetas `/data/db`, `/data/public/posters`, `/data/public/templates`.
- Si `DATABASE_URL` es SQLite con ruta relativa, la cambia a `file:/data/db/prod.db` para persistencia.
- Migra una sola vez los archivos existentes en `public/posters` y `public/templates` hacia `/data/public/...` y crea symlinks de vuelta para que Next los sirva.
- Ejecuta `prisma migrate deploy` (o `db push` en SQLite si aplica), sin ejecutar seed.

Ejemplo en Railway:
- Añade un Volume y móntalo en `/data`.
- Variables:
	- `DATABASE_URL=file:/data/db/prod.db`
	- `PUBLIC_BASE_URL=https://tokensapp-production.up.railway.app`
	- `NEXT_PUBLIC_BASE_URL=https://tokensapp-production.up.railway.app`
	- `SEED_ON_START` vacío (colócalo en `1` solo la primera vez si necesitas poblar datos base; luego elimínalo).
4. Actualizar `DATABASE_URL` y añadir `TURSO_AUTH_TOKEN`.
5. Desplegar versión con variables nuevas.
6. Verificar canje y generación de batch; luego reabrir tráfico.

### 5. Estrategia de rollback
- Mantén el archivo SQLite original sin cambios post corte.
- Para revertir, restablece `DATABASE_URL` a `file:` y redeploy; sincroniza canjes intermedios manualmente si hubo divergencia.

Resumen selección:
- Pocas operaciones / simplicidad -> VPS.
- Necesidad multi región / escalado lectura -> Turso.

## Asistencia

La vista de asistencia ahora se limita a una tabla por persona/día (IN, OUT, duración y progreso de tareas). Se retiraron las métricas agregadas históricas para reducir complejidad y evitar datos confusos mientras el modelo de jornadas evoluciona.

Endpoint activo:
`GET /api/admin/attendance/table` (ADMIN y STAFF; STAFF también vía `user_session`).

Parámetros principales: `period` (today|yesterday|this_week|...), filtros opcionales `area`, `person`, paginación `page`, `pageSize`.

Respuesta: filas con `day`, `personCode`, `personName`, `firstIn`, `lastOut`, `durationMin`, conteo de tareas hechas y total.

Razonamiento del cambio: las métricas previas (heatmap, series, KPIs) mostraban ceros inconsistentes; se decidió eliminarlas completamente hasta definir requisitos estables.


## Checklist previo a producción

1. Configuración de entorno
	- `TOKEN_SECRET` (y futuros `TOKEN_SECRET_V*`) definidos con entropía suficiente (≥32 bytes).
	- `PUBLIC_BASE_URL` apunta al dominio final HTTPS.
	- `DATABASE_URL` correcta (archivo local o Turso) y migraciones aplicadas (`prisma migrate deploy`).
	- Variables sensibles sólo en backend; no exponer en cliente.

2. Base de datos
	- Ejecutar migraciones en entorno staging idéntico previamente.
	- Verificar índices críticos (Token.prizeId, Token.batchId, Token.expiresAt si se harán limpiezas).
	- Plan de backup inicial + tarea programada (snapshot / dump) validado restaurando en entorno aislado.

3. Seguridad
	- Revisar dependencia de `rateLimit` (decidir si mover a Redis en despliegue multi‑instancia).
	- Asegurar cabeceras en reverse proxy: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`.
	- Protección de `/api/admin/health` (Bearer/Basic) verificada.
	- Validar no logs sensibles (token signatures OK; jamás loggear el secreto).

4. Firma y rotación
	- Confirmar `CURRENT_SIGNATURE_VERSION` deseada.
	- Documentar fecha límite de expiración de tokens previos antes de rotar.

5. Performance / Recursos
	- Prueba de generación de batch grande (≥10k tokens) midiendo tiempo y memoria.
	- Ajustar `PRIZE_CACHE_TTL_MS` si se observa carga alta en premios inmutables.
	- Verificar que streaming ZIP no se bufferiza completo (inspeccionar uso de memoria en test).

6. Observabilidad
	- Agregador de logs listo (stdout JSON parseado).
	- Métricas básicas: conteo de canjes, errores por código, tasa de expirados (scripts existentes programados vía cron / scheduler).
	- Alertas: error rate anómalo (>5% en 5m), tiempo de respuesta canje > X ms.

7. Seguridad de datos
	- Política de retención: limpiar tokens expirados (cron diario opcional) y logs antiguos (>90d) si aplica.
	- Asegurar backups cifrados en repositorio externo.

8. Frontend / UI
	- Comprobar build `npm run build` sin warnings críticos.
	- Smoke test manual: crear premio, generar batch (lazy y eager), descargar ZIP, canjear token (válido, repetido, expirado simulado).

9. Pruebas automáticas
	- `npm test` verde (unit + integración).
	- Añadir test de regresión para cualquier bug encontrado último sprint.

10. Seguridad adicional (opcional antes GA)
	- CSRF para endpoints mutadores admin si se usa cookies en UI.
	- Autenticación robusta (OIDC / JWT) en panel administración.

11. Rollback
	- Plan documentado: revertir a imagen anterior / commit previo + restaurar backup base datos si migración destructiva.
	- Scripts de migración reversibles o snapshot previo.

12. Post‑release
	- Monitorear primeros 15 minutos (latencia, errores, canjes).
	- Revisar tamaño de archivos ZIP generados reales para validar supuestos.

Checklist rápido (TL;DR):
`env OK` → `migraciones` → `tests` → `build` → `backup` → `deploy` → `smoke tests` → `monitor` → `documentar rotación`.

## Ruleta

Módulo opcional para realizar un sorteo interactivo ("rueda") sobre los premios emitidos en un batch, consumiéndolos con probabilidad proporcional a la cantidad restante de cada premio (modo `BY_PRIZE`). Evita tener que enumerar todos los tokens y mantiene exactitud estadística: es equivalente a elegir un token uniforme al azar del conjunto de tokens aún no sorteados.

### Elegibilidad de un Batch
Un batch es elegible para iniciar una ruleta si cumple:
1. Contiene entre 2 y 12 premios distintos (inclusive). (UX: límite superior evita una rueda ilegible.)
2. Cada premio participante tiene al menos 1 token emitido (conteo > 0) en el batch.
3. No existe ya una ruleta ACTIVA para ese batch.
4. El batch no está vacío ni completamente agotado (si todos los tokens ya fueron canjeados no se puede iniciar).

Si el batch no cumple se responde `400 NOT_ELIGIBLE` (o `409 ALREADY_EXISTS` si ya hay sesión) al crear.

### Estados de la Sesión
- `ACTIVA`: abierta y con tokens restantes.
- `FINISHED`: se consumieron todos los tokens (sumatoria restante = 0). No admite más spins.
- `CANCELLED`: cancelada manualmente; se detiene antes de agotar. No se reanuda.

### Endpoints
| Método | Path | Descripción | Códigos éxito | Errores clave |
|--------|------|-------------|---------------|---------------|
| POST | `/api/roulette` | Crea sesión para un batch elegible (`{ batchId }`) | 201 | 400 (NOT_ELIGIBLE), 404 (BATCH_NOT_FOUND), 409 (ALREADY_EXISTS) |
| GET | `/api/roulette/:id` | Lee estado (snapshot, spins, remaining, status) | 200 | 404 (NOT_FOUND) |
| POST | `/api/roulette/:id` | Realiza un spin (selección ponderada) | 200 | 404 (NOT_FOUND), 409 (FINISHED|CANCELLED), 429 (RATE_LIMIT) |
| POST | `/api/roulette/:id/cancel` | Cancela sesión activa | 200 | 404 (NOT_FOUND), 409 (NOT_ACTIVE) |

Respuestas (simplificadas):
```jsonc
// POST /api/roulette
{
	"id": "sess_123",
	"batchId": 42,
	"mode": "BY_PRIZE",
	"status": "ACTIVA",
	"snapshot": { "prizes": [ { "prizeId": 1, "count": 5, "label": "A", "color": "#ff0" }, ... ], "total": 17 },
	"spins": [],
	"remaining": { "total": 17, "prizes": [ { "prizeId": 1, "remaining": 5 }, ... ] }
}

// POST /api/roulette/:id (spin)
{
	"spin": { "order": 3, "prizeId": 1, "remainingAfter": 13 },
	"remaining": { "total": 13, "prizes": [ { "prizeId": 1, "remaining": 4 }, ... ] },
	"finished": false
}
```

### Modo `BY_PRIZE` (Ponderación por premio)
Sea el vector de cantidades restantes R = (r1, r2, ..., rn) y T = Σ ri.
Probabilidad de que el próximo spin elija el premio i: ri / T.
Tras seleccionar premio k: rk := rk - 1 y T := T - 1. Se recalculan probabilidades en O(n) sin enumerar tokens.

Ejemplo: Premios {A:5, B:3, C:2} → Prob inicial: A 50%, B 30%, C 20%. Si sale A: {A:4, B:3, C:2} → A 40%, B 30%, C 20%.

Ventajas:
- Exactitud: idéntico a muestrear un token uniforme restante.
- Performance: O(nPremios) por spin (n ≤ 12) en lugar de O(nTokens).
- Distribución naturalmente ajustada tras cada extracción (sin sesgo acumulado).

### Concurrencia y Atomicidad
Cada spin se ejecuta en una transacción: se lee el vector de remanentes, se aplica la selección ponderada y se persiste el decremento y el registro del spin. El último decremento marca la sesión como `FINISHED`. Se evita logging dentro de la transacción para reducir bloqueos (el log se emite después de commit). Pruebas de carrera (dos o más spins simultáneos) garantizan que el último token sólo se adjudica una vez (la segunda petición recibe 409 `FINISHED`).

### Rate Limiting
Se aplica un límite básico por IP para el spin para evitar pulsado excesivo. Para despliegues multi‑nodo considerar backend compartido (Redis) ya que la implementación actual es in‑memory.

### Cancelación
`POST /api/roulette/:id/cancel` cambia estado a `CANCELLED` si estaba `ACTIVA`. No altera el snapshot original; simplemente detiene nuevos spins con 409 `CANCELLED`.

### Métricas y Observabilidad
- Dashboard admin muestra: "Ruletas activas hoy" y "Spins hoy".
- Eventos ciclo de vida: `CREATE`, `SPIN`, `FINISH`, `CANCEL` (posibles extensiones futuras para auditoría más granular).

### Casos Límite
- Si sólo queda 1 premio con 1 unidad, el spin es determinista (prob=1) y la sesión pasa a `FINISHED`.
- Intentar spin tras `FINISHED` o `CANCELLED` → 409.
- Crear segunda ruleta para el mismo batch mientras hay una `ACTIVA` → 409 `ALREADY_EXISTS`.

### Buenas Prácticas
- Mantener número de premios ≤12 para claridad visual (enforced por backend).
- Evitar cancelar sesiones a mitad salvo necesidad operativa (pierdes granularidad estadística completa de extracción total).
- Para análisis de justicia: comparar frecuencia observada vs esperada (ri/T) acumulada; con pocos tokens las desviaciones son normales.

### Futuras Extensiones (no implementadas aún)
- Modo `BY_TOKEN` real (enumeración explícita de cada token) – no necesario por equivalencia estadística actual.
- Reanudación tras cancelación (recrear sesión reutilizando remanentes).
- Métricas de varianza y fairness post‑finalización.

## Testing

Los tests de integración (Vitest) usan SQLite en archivos separados para aislar el estado. Patrón clave para evitar que las rutas importen un `PrismaClient` apuntando a una base antigua:

```ts
// En cada suite antes de importar la ruta:
prisma = await initTestDb("test_algo.db");
(global as any)._prisma = prisma; // debe ir ANTES de: await import("./ruta");
({ POST: handler } = await import("./route"));
```

Motivo: `src/lib/prisma.ts` crea (o reutiliza) un singleton global. Si la ruta se importa antes de fijar `DATABASE_URL` y `_prisma`, quedará enlazada a otra DB y los tests verán `NO_ACTIVE_PRIZES` u otros estados inconsistentes.

Restablecer caches: cada test invalida manualmente caches donde procede (ej. `invalidatePrizeCache()`). Se evitó un `afterEach` global que borraba la cache porque rompía preparaciones de algunos casos.

Timeout global: configurado `testTimeout=20000` en `vitest.config.ts` para acomodar generación de ZIPs y pruebas de carrera.

### Inyección futura (DI) de Prisma / Helpers

Para simplificar y reducir necesidad de `global._prisma`, se puede introducir un contenedor ligero:

```ts
// lib/context.ts
export interface AppContext { prisma: PrismaClient }
let ctx: AppContext | null = null;
export function setContext(c: AppContext) { ctx = c; }
export function getContext(): AppContext { return ctx || { prisma } as any; }
```

Luego en helpers/rutas:
```ts
import { getContext } from '@/lib/context';
const { prisma } = getContext();
```

En tests:
```ts
const prisma = await initTestDb('test.db');
setContext({ prisma });
({ POST: handler } = await import('./route'));
```

Esto elimina dependencia de un símbolo global específico y permite mocking más fino (p.ej. reemplazar `logEvent`). No implementado aún para mantener cambios mínimos; recomendado si la base de rutas crece.

### Ejecución rápida
`npm test -- --run` ejecuta todos los tests (unit + integración). Asegúrate de no dejar `FORCE_RACE_TEST=1` en entorno fuera de test.

## Notas
Proyecto en estado inicial, no listo para producción.

## Migración a Postgres 2025-09-24

Esta fecha marcó la transición oficial de SQLite a PostgreSQL para soportar:
- Cálculo consistente de jornada de asistencia (`businessDay`) con reglas de corte.
- Índices parciales (unicidad condicional IN/OUT por persona y día) no generables todavía vía Prisma.
- Consultas de métricas usando `EXTRACT`, `to_char` y aritmética de epoch en lugar de funciones específicas de SQLite.

### Enfoque adoptado
1. Baseline limpio: Se eliminaron migraciones históricas de SQLite y se creó una migración baseline única que refleja el estado final del esquema. Se aceptó descartar datos previos (dataset efímero / demo).
2. Cambio de provider: En `schema.prisma` `provider = "sqlite"` → `provider = "postgresql"`.
3. Índices parciales añadidos manualmente (no soportados por Prisma todavía):
	```sql
	CREATE UNIQUE INDEX "Scan_person_businessDay_in_unique" ON "Scan"("personId","businessDay","type") WHERE type='IN';
	CREATE UNIQUE INDEX "Scan_person_businessDay_out_unique" ON "Scan"("personId","businessDay","type") WHERE type='OUT';
	```
4. Eliminación de dependencias SQLite en código activo: fuera quedaron `strftime`, `substr(scannedAt,1,10)`, `randomblob`. Los scripts o migraciones antiguos quedaron marcados como LEGACY únicamente informativos.
5. Generación de IDs: se confía en defaults del modelo (cuid/UUID) o en helper `newId()` (Node `crypto.randomUUID`) si se necesita explícito.
6. Lógica `businessDay`: centralizada en `computeBusinessDayFromUtc` (TS) en vez de expresiones SQL específicas del motor.
7. Seed y rutas: reescritos para omitir IDs manuales y usar `RETURNING` donde aplica.

### Scripts Legacy
`scripts/backfill-business-day-bulk.ts` quedó como referencia (abortará si detecta Postgres). No debe ejecutarse en el nuevo entorno.

### Tests
- Eliminado el uso de `PRAGMA foreign_keys = OFF/ON` (específico de SQLite).
- Limpieza actual: `deleteMany()` secuencial en lugar de truncados.
- TODO: implementar helper de truncado para Postgres (ejemplo futuro):
  ```sql
  TRUNCATE TABLE "Scan","PersonTaskStatus","Task","Token","Prize","Batch" RESTART IDENTITY CASCADE;
  ```

### Verificación post-migración sugerida
1. `prisma migrate deploy` sobre una base vacía.
2. Validar índices parciales:
	```sql
	SELECT indexdef FROM pg_indexes WHERE tablename='Scan' AND indexname LIKE 'Scan_person_businessDay_%';
	```
3. Probar inserción duplicada de IN para mismo (persona,businessDay) → debe fallar.
4. Revisar consultas de métricas: no deben contener funciones SQLite.

### Consideraciones futuras
- Añadir truncates para acelerar tests y garantizar integridad referencial limpia por suite.
- Si se agregan nuevos tipos de scan, reevaluar los índices parciales o introducir constraint CHECK.
- Documentar proceso de ampliación de baseline (crear migraciones incrementales a partir de aquí; ya no recrear baseline salvo reset total).

### Resumen
Migración completada con baseline limpio, índices parciales manuales, eliminación de dependencias SQLite en código productivo y plan pendiente para optimizar limpieza de tests vía truncates.

## Despliegue (GitHub + Railway + Docker)

Sigue estos pasos para publicar la app usando un contenedor Docker en Railway.

1) Subir el código a GitHub

- Crea un repo vacío en GitHub (sin README inicial para evitar conflictos).
- En tu terminal PowerShell:

```powershell
git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
git push -u origin main
```

2) Preparar variables de entorno (Railway)

- En el panel de Railway, crea un nuevo proyecto y elige "Deploy from GitHub" seleccionando tu repo.
- Define variables (Settings → Variables):
	- `TOKEN_SECRET` = un secreto fuerte (32+ bytes aleatorios)
	- `PUBLIC_BASE_URL` = la URL pública que te asigna Railway (actualízala luego si usas dominio propio)
	- `DATABASE_URL` = `file:./prisma/dev.db` (SQLite dentro del contenedor) o una URL de Postgres si prefieres gestionado
	- `TWO_PHASE_REDEMPTION` = `false` (o `true` si lo usas)
	- Opcional marketing dev: `BIRTHDAYS_PUBLIC=0`, `NEXT_PUBLIC_BIRTHDAYS_ENABLED=0`
	- Si usas serverless multi‑instancia: `REDIS_URL` (no requerido para una sola instancia)

3) Build & Run (Docker)

- Este repo incluye `Dockerfile` multi‑stage y `.dockerignore`.
- Railway detectará y construirá con Docker automáticamente si activas "Deploy with Dockerfile" o usas Nixpacks deshabilitado.
- Puerto: la app expone `PORT=3000`. Railway inyecta `PORT` automáticamente.
- Comando de inicio: `npm start` (sirve el build de Next.js).

4) Base de datos

- Opción simple (recomendada al inicio): SQLite en el contenedor con `DATABASE_URL=file:./prisma/dev.db`.
	- Para persistencia entre despliegues, considera un volumen o migrar a Postgres.
- Opción gestionada (recomendada a medio plazo): Postgres de Railway.
	- Cambia `DATABASE_URL` a la cadena de Postgres.
	- Ejecuta migraciones en Deploy Hooks o manualmente:

```bash
npx prisma migrate deploy
npx prisma db seed # si necesitas datos demo
```

5) Post‑deploy

- Verifica logs en Railway.
- Abre la URL pública: comprueba `/admin` (según tu auth), `/u` (checklist BYOD) y endpoints clave.
- Ajusta `PUBLIC_BASE_URL` a tu dominio propio si haces un custom domain.

6) Dev local con Docker (opcional)

```bash
docker build -t qr-prizes-app:local .
docker run --rm -p 3000:3000 -e TOKEN_SECRET=dev_only_change_me -e PUBLIC_BASE_URL=http://localhost:3000 -e DATABASE_URL="file:./prisma/dev.db" qr-prizes-app:local
```

o con Compose:

```bash
docker compose up --build
```

Notas
- Para multi‑instancia y SSE, usa Redis (pub/sub) y reemplaza el EventEmitter in‑memory.
- Asegura rotación de secretos según tu política.
