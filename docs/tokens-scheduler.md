Tokens scheduler

Resumen

Este proyecto soporta un scheduler interno (node-cron) que establece `tokensEnabled` según reglas:
- Modo pruebas (`tokensTestMode`) = true -> tokensEnabled = true
- Si admin forzó apagado (`tokensAdminDisabled`) -> tokensEnabled = false
- Si no, comportamiento programado: ON a las 18:00, OFF a las 00:00 (server local time)

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
- Tras aplicar la migración y generar el cliente Prisma, considera reemplazar las consultas raw en `src/lib/scheduler.ts` y endpoints por llamadas tipadas a `prisma.systemConfig`.
