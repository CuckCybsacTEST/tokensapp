# Pruebas y validación — Tokens Scheduler y Modo Pruebas

Breve: pasos reproducibles para validar el comportamiento de `Modo pruebas`, `admin-disable` y el scheduler (interno o externo).

Precondiciones
- Server de desarrollo corriendo en http://localhost:3001 (ajusta la URL si es distinta).
- Para las llamadas de admin usa la cookie: `session=staff` (el proyecto usa esta cookie en los ejemplos admin).
- Tener instalado `ts-node` para las simulaciones (opcional): `npm install --save-dev ts-node typescript`.

Checklist de validación

1) Ver estado inicial

PowerShell:

```powershell
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Observa las claves: `tokensTestMode`, `tokensAdminDisabled`, `tokensEnabled`.

2) Activar 'Modo pruebas' y verificar `tokensEnabled` -> true

PowerShell:

```powershell
$hdr = @{ Cookie = 'session=staff'; 'Content-Type' = 'application/json' }
$body = '{"enabled":true}'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/system/tokens/test-mode' -Headers $hdr -Body $body | ConvertTo-Json -Depth 5

# Verifica el status
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Resultado esperado:
- `tokensTestMode` = true
- `tokensEnabled` = true

3) Desactivar 'Modo pruebas' y verificar el resultado (según horario)

PowerShell:

```powershell
$body = '{"enabled":false}'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/system/tokens/test-mode' -Headers $hdr -Body $body | ConvertTo-Json -Depth 5

# Verifica el status
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Resultado esperado:
- `tokensTestMode` = false
- `tokensEnabled` reflejará la regla programada (si son horas entre 18:00-23:59 esperado = true; en otro caso false), salvo que admin haya forzado apagado.

4) Llamar `admin-disable` y verificar que el toggle queda desactivado y no se puede volver a encender desde UI

PowerShell:

```powershell
$body = '{"disable":true}'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/system/tokens/admin-disable' -Headers $hdr -Body $body | ConvertTo-Json -Depth 5

# Verifica el status
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Resultado esperado:
- `tokensAdminDisabled` = true
- `tokensEnabled` = false
- Intentar activar `Modo pruebas` (POST test-mode enabled=true) debería seguir permitiendo la llamada, pero el sistema **debe** respetar `tokensAdminDisabled` y permanecer apagado. Si tu UI evita enviar enabled=true cuando admin-disabled es true, también valida esa protección.

5) Scheduler A — Simular llamadas a scheduler (18:00 / 00:00) y verificar `tokensEnabled`

Opciones para simular:

a) Ejecutar `reconcileOnce()` directamente (recomendado para pruebas manuales). Requiere `ts-node` instalado.

PowerShell (instala ts-node si hace falta):

```powershell
npm install --save-dev ts-node typescript
npx ts-node -e "import('./src/lib/scheduler').then(m => m.reconcileOnce().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exit(1); }))"

# Luego comprobar status
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Nota: `reconcileOnce()` usa la hora actual del servidor para decidir el estado. Para probar el efecto de 18:00 o 00:00 puedes:
- ejecutar el comando a la hora real (p. ej. a las 18:00) o
- crear un script temporal que llame directamente a las funciones internas (esto implica tocar código) o
- modificar temporalmente el reloj del servidor (no recomendado en entornos compartidos).

b) Simular las acciones del cron manualmente (acción equivalente):

- Para simular la tarea de las 18:00 (forzar ON) ejecuta:

```powershell
# (ejemplo usando prisma raw via ts-node)
npx ts-node -e "import('./src/lib/prisma').then(({prisma})=>prisma.$executeRawUnsafe('UPDATE SystemConfig SET tokensEnabled = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = 1').then(()=>console.log('set tokensEnabled=1')).catch(e=>console.error(e)))"

Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

- Para simular la tarea de las 00:00 (forzar OFF) ejecuta:

```powershell
npx ts-node -e "import('./src/lib/prisma').then(({prisma})=>prisma.$executeRawUnsafe('UPDATE SystemConfig SET tokensEnabled = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = 1').then(()=>console.log('set tokensEnabled=0')).catch(e=>console.error(e)))"

Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Estos comandos realizan la misma operación que haría el job del cron; así podrás validar el flujo de verificación/consumo en la aplicación.

6) Scheduler B — Programar cron externo y verificar endpoints

Recomendación: crea un pequeño script PowerShell reutilizable `scripts/run-reconcile.ps1` con este contenido:

```powershell
cd 'D:\QRAPPRELOAD'
npx ts-node -e "import('./src/lib/scheduler').then(m=>m.reconcileOnce()).then(r=>Write-Output((ConvertTo-Json r -Depth 5))).catch(e=>Write-Error(e))"
```

Luego programa ese script en Windows Task Scheduler a las 18:00 y 00:00, o usa un cron en Linux:

Ejemplo crontab (Linux):

```
# 18:00 daily
0 18 * * * cd /path/to/QRAPPRELOAD && npx ts-node -e "import('./src/lib/scheduler').then(m=>m.reconcileOnce())"
# 00:00 daily
0 0 * * * cd /path/to/QRAPPRELOAD && npx ts-node -e "import('./src/lib/scheduler').then(m=>m.reconcileOnce())"
```

Después de programar, verifica con:

```powershell
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status' | ConvertTo-Json -Depth 5
```

Validaciones finales

- Repite las llamadas de test-mode y admin-disable y confirma que el estado devuelto por `/api/system/tokens/status` coincide con lo esperado.
- Revisa `EventLog` (o `prisma studio`) para comprobar que se registran entradas de auditoría para las acciones (`tokens.test-mode`, `tokens.admin-disable`).

Pruebas adicionales y notas

- Si ves discrepancias por tipos/Prisma client: asegúrate de ejecutar `npx prisma migrate dev` y `npx prisma generate` después de cambiar el schema.
- En despliegues con múltiples instancias, evita arrancar el scheduler en todas las réplicas; usa leader election o un cron externo.
- Si quieres, puedo generar un pequeño script `scripts/simulate-scheduler.ts` para permitir pasar una hora simulada y ejecutar la reconciliación (útil para pruebas automatizadas).

Fin del checklist.
