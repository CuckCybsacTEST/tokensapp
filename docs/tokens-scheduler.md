Tokens scheduler

Resumen (Option B – boundary enforcement)

Scheduler interno que aplica “enforcement” solo en los límites horarios y respeta overrides entre ellos:
- Ventana programada: ON desde las 18:00 (inclusive) hasta las 00:00 (exclusiva) hora servidor (`TOKENS_TIMEZONE`, default `America/Lima`).
- A las 18:00 se fuerza ON.
- A las 00:00 se fuerza OFF.
- Entre 00:00 y 17:59: si un admin enciende manualmente, permanece ON hasta las 18:00.
- Entre 18:00 y 23:59: si un admin apaga manualmente, permanece OFF hasta la medianoche.
- `computeTokensEnabled` sigue calculando el estado “programado” (scheduled) para propósitos informativos.

### Overrides tempranos (ej. 02:00 AM)

Si un admin enciende el sistema fuera de la ventana (por ejemplo a las 02:00 AM):
1. `tokensEnabled` pasa a `true` inmediatamente y la capa de gating permite canjes / ruleta aunque `scheduledEnabled=false`.
2. El estado se mantiene ON todo el resto del día (hasta 00:00) salvo que un admin lo apague manualmente.
3. A las 18:00 el enforcement de boundary vuelve a forzar ON (sin efecto si ya estaba ON).
4. A la medianoche siguiente (00:00) se fuerza OFF y termina el override.

Riesgos del override temprano:
- Ventana operativa más larga de lo planificado (posibles métricas infladas, consumo de stock anticipado).
- Activación accidental nocturna puede pasar desapercibida si no hay alertas.

Mitigaciones opcionales (no implementadas por defecto):
- Doble confirmación si `hour < 16`.
- Auto-revert configurable (ej. apagar tras N horas fuera de ventana hasta nuevo confirm).
- Banner UI: “Override manual activo fuera de horario” mientras `tokensEnabled=true` y `scheduledEnabled=false`.
- Auditoría específica (`EVENT: TOKENS_OVERRIDE_OUT_OF_WINDOW`).

Estado actual: sólo enforcement duro en 18:00/00:00 y gating permite override fuera de horario mientras el switch esté en ON.

Instalación de dependencias

En PowerShell:

```powershell
# instalar luxon y node-cron
npm install luxon node-cron
# instalar dependencias de test (opcional)
npm install --save-dev jest ts-jest @types/jest
```

Integración del scheduler

En tu entrypoint de servidor (por ejemplo un `server.ts` custom, o el archivo donde inicializas servicios), importa y arranca el scheduler:

```ts
import { startScheduler } from '@/lib/scheduler';
# Tokens scheduler (README corto)

Resumen

Este proyecto incluye un scheduler interno (opcional) que controla `tokensEnabled` según estas reglas:
- `tokensTestMode = true` -> siempre ON
- `tokensAdminDisabled = true` -> siempre OFF
- Si ninguno de los anteriores aplica: ON a las 18:00 y OFF a las 00:00 (hora del servidor)

Prerrequisitos

- Node.js y npm
- Prisma configurado (archivo `schema.prisma`) y acceso a la base de datos
- PM2 (opcional, para ejecutar en background)

Comandos PowerShell

1) Crear y aplicar la migración de Prisma (dev):

```powershell
# crea la migración y la aplica en el entorno de desarrollo
npx prisma migrate dev --name add_tokens_flags
# (opcional) regenerar Prisma Client
npx prisma generate
```

2) Instalar runtime libs necesarias (node-cron + luxon):

```powershell
npm install node-cron luxon
```

3) Instalar PM2 globalmente (si aún no lo tienes):

```powershell
npm install -g pm2
```

4) Ejecutar el scheduler con PM2 — opción desarrollo (ejecuta el TS directamente usando ts-node):

```powershell
# instala ts-node si lo necesitas
npm install --save-dev ts-node typescript
# iniciar con pm2 usando ts-node (desarrollo)
npx pm2 start --name tokens-scheduler --node-args "-r ts-node/register" src/server/start.ts
```

5) Ejecutar el scheduler con PM2 — opción producción (compilar y ejecutar JS):

```powershell
# compilar (usa tu tsconfig; este ejemplo compila el archivo de arranque)
npx tsc src/server/start.ts --outDir dist --module commonjs --target ES2020 --esModuleInterop
# arrancar con pm2
pm2 start dist/server/start.js --name tokens-scheduler
```

Comandos útiles de PM2

```powershell
pm2 status
pm2 logs tokens-scheduler
pm2 stop tokens-scheduler
pm2 restart tokens-scheduler
pm2 save  # persiste la lista de procesos
```

Notas

- Si ejecutas en entornos serverless, no uses el scheduler interno; en su lugar expón un endpoint que realice la reconciliación y dispara ese endpoint con Cloud Scheduler / cron externo.
- Tras aplicar la migración y regenerar Prisma Client, se puede reemplazar el uso de SQL raw por llamadas tipadas.
- `heartbeat` cada minuto emite log comparando estado actual vs programado (sin forzar cambios fuera de los límites 18:00/00:00).
