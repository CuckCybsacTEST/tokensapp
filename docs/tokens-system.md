# Sistema de Tokens - Documentación Completa

Este documento describe el sistema completo de tokens de Go Lounge, incluyendo control, scheduling, métricas, pruebas y mantenimiento.

## 📋 Resumen del Sistema

El sistema de tokens de Go Lounge proporciona:
- **Control ON/OFF**: Gestión programada y manual del estado de canje
- **Scheduling**: Automatización de habilitación/deshabilitación por horarios
- **Métricas**: Reportes detallados de generación, redención y expiración
- **Mantenimiento**: Herramientas administrativas para gestión de batches
- **Pruebas**: Validación completa del comportamiento del sistema

### Estados del Sistema
- `tokensEnabled`: Estado efectivo de canje (persistido en DB)
- `scheduledEnabled`: Cálculo informativo del scheduler
- `tokensTestMode`: Modo de pruebas (ignora scheduling)
- `tokensAdminDisabled`: Deshabilitación administrativa forzada

---

## 🎛️ Control de Tokens

### Política de Permisos (versión actual)

- `ADMIN` (admin_session): puede ver y alternar
- `STAFF` (admin_session): puede ver y alternar (ya no es solo lectura)
- `STAFF` (user_session BYOD): puede ver y alternar desde `/u/tokens`
- `COLLAB` (user_session): no puede ver ni alternar (403 en capabilities y toggle)

Auditoría registra el tipo de actor: `admin` o `staff` (se retiró `staff:caja`).

### Endpoints Principales

**GET** `/api/system/tokens/status`
- Devuelve `{ tokensEnabled, scheduledEnabled, lastChangeIso, nextSchedule, serverTimeIso, timezone }`
- Autorización: `ADMIN` o `STAFF` (admin_session) o `STAFF` (user_session BYOD)

**GET** `/api/system/tokens/capabilities`
- Devuelve `{ canView: true, canToggle: true }` para cualquier STAFF / ADMIN

**POST** `/api/system/tokens/toggle`
- Body: `{ enabled: boolean }`
- Efecto: alterna el estado global, invalida caché y registra auditoría

### UI y Acceso
- Panel admin: `/admin/tokens` (control habilitado para ADMIN y STAFF)
- BYOD: `/u/tokens` disponible para cualquier STAFF
- Encabezado BYOD muestra colaborador activo (nombre y DNI) + botón de logout

### Consideraciones de Seguridad
- Middleware: `/api/system/*` accesible con `admin_session` (ADMIN/STAFF) o `user_session` (STAFF)
- Auditoría: registra `actor.kind` = `admin` | `staff`
- No se requiere doble sesión; una sola sesión STAFF basta

### Ejemplos de Uso

PowerShell (Windows), servidor local `http://localhost:3000`:

```powershell
# Ver estado
Invoke-RestMethod -UseBasicParsing -Uri 'http://localhost:3000/api/system/tokens/status'

# Ver capacidades
Invoke-RestMethod -UseBasicParsing -Uri 'http://localhost:3000/api/system/tokens/capabilities'

# Alternar ON
Invoke-RestMethod -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/system/tokens/toggle' -Headers @{ Cookie = $cookie; 'Content-Type' = 'application/json' } -Body '{"enabled":true}'
```

---

## ⏰ Scheduler (Boundary Enforcement)

Controla `tokensEnabled` aplicando flips solo en límites horarios y respetando overrides manuales.

### Ventana Programada
| Hora (local TZ `TOKENS_TIMEZONE`, default `America/Lima`) | Acción programada |
|-----------------------------------------------------------|--------------------|
| 18:00 (inclusive) → 02:59 | Forzar ON (si estaba OFF) |
| 03:00 | Forzar OFF |

Entre límites NO se altera el valor manualmente establecido.

### Overrides Manuales
| Escenario | Resultado |
|-----------|-----------|
| Admin enciende 04:00 | Permanece ON hasta 03:00 siguiente |
| Admin apaga 20:30 | Permanece OFF hasta 03:00 |

### Estados Expuestos
- `tokensEnabled`: estado efectivo persistido (aplica gating real)
- `scheduledEnabled`: cálculo informativo para UI/métricas

### Ventanas Horarias por Lote (singleHour)

Soporte para generación automática con ventana específica:
- `Token.validFrom`: inicio de ventana (nullable)
- `Token.expiresAt`: fin de ventana
- Si ventana futura: tokens quedan `disabled=true`
- Scheduler habilita automáticamente cuando llega la hora

Endpoint auxiliar: `POST /api/system/tokens/enable-hourly` (ADMIN/STAFF)

### Integración
```ts
import { startScheduler } from '@/lib/scheduler';
startScheduler(); // Una vez en bootstrap del servidor
```

---

## 📊 Métricas de Tokens

### Resumen del Sistema de Métricas

Proporciona insights sobre:
- **Generación**: Tokens creados por lote y período
- **Redención**: Tokens canjeados por usuarios
- **Expiración**: Tokens que vencieron sin uso
- **Entrega**: Tokens distribuidos a staff
- **Revelación**: Tokens mostrados a clientes
- **Estados**: Activos, deshabilitados, agotados

### Endpoint Principal
```
GET /api/system/tokens/period-metrics?period=today&batchId=optional
```

### Períodos Disponibles
- **`today`**: Día actual (cierra 03:00 Lima)
- **`yesterday`**: Día anterior
- **`this_week`**: Semana actual (lunes-domingo)
- **`last_week`**: Semana anterior
- **`this_month`**: Mes actual
- **`last_month`**: Mes anterior
- **Custom**: `?period=custom&start=2025-01-01&end=2025-01-31`

### Sistema functionalDate
Campo `Batch.functionalDate` mapea tokens al día operativo real, considerando cierre a las 03:00 Lima.

### Tipos de Métricas
| Métrica | Descripción | Cálculo |
|---------|-------------|---------|
| **total** | Tokens creados | `COUNT(*)` |
| **redeemed** | Tokens canjeados | `COUNT(redeemed_at)` |
| **expired** | Tokens expirados | `COUNT(expires_at < NOW())` |
| **active** | Tokens disponibles | `total - redeemed - expired` |
| **delivered** | Tokens entregados | `COUNT(delivered_at)` |
| **revealed** | Tokens revelados | `COUNT(revealed_at)` |
| **disabled** | Tokens deshabilitados | `COUNT(disabled = true)` |

### Consultas de Troubleshooting

#### Tokens Sin Premio
```sql
SELECT COUNT(*) as tokens_sin_premio
FROM "Token" t
WHERE t.prize_id IS NULL
  AND t.created_at >= CURRENT_DATE - INTERVAL '7 days';
```

#### Tokens Expirados Activos
```sql
SELECT t.id, t.signature, t.expires_at, b.description
FROM "Token" t
JOIN "Batch" b ON t.batch_id = b.id
WHERE t.expires_at < NOW()
  AND t.redeemed_at IS NULL
  AND t.disabled = false
ORDER BY t.expires_at DESC
LIMIT 10;
```

### APIs de Métricas

#### Endpoint de Métricas por Período
```javascript
GET /api/system/tokens/period-metrics

// Respuesta
{
  ok: true,
  period: "Hoy",
  startDay: "2025-10-11",
  endDay: "2025-10-12",
  totals: {
    total: 150,
    redeemed: 45,
    expired: 10,
    active: 95,
    delivered: 40,
    revealed: 38,
    disabled: 2
  },
  spins: 120,
  batchId: null
}
```

#### Endpoint de Spins
```javascript
GET /api/system/tokens/spins?period=today

// Respuesta
{
  ok: true,
  period: "today",
  totalSpins: 120,
  spinsByPrize: [...]
}
```

### Dashboards y KPIs
1. **Tasa de redención**: `redimidos / total * 100`
2. **Tokens activos**: `total - redimidos - expirados`
3. **Tiempo promedio de uso**: `AVG(redeemed_at - created_at)`
4. **Conversión por premio**: `redimidos_por_premio / total_por_premio`

---

## 🧪 Pruebas y Validación

### Precondiciones
- Server desarrollo: `http://localhost:3001`
- Cookie admin: `session=staff`
- Instalar `ts-node` para simulaciones

### Checklist de Validación

#### 1. Ver Estado Inicial
```powershell
Invoke-RestMethod -Method Get -Uri 'http://localhost:3001/api/system/tokens/status'
```

#### 2. Activar Modo Pruebas
```powershell
$hdr = @{ Cookie = 'session=staff'; 'Content-Type' = 'application/json' }
$body = '{"enabled":true}'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/system/tokens/test-mode' -Headers $hdr -Body $body
```

#### 3. Simular Scheduler
```powershell
# Simular 18:00 (forzar ON)
npx ts-node -e "import('./src/lib/prisma').then(({prisma})=>prisma.$executeRawUnsafe('UPDATE SystemConfig SET tokensEnabled = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = 1'))"

# Simular 03:00 (forzar OFF)
npx ts-node -e "import('./src/lib/prisma').then(({prisma})=>prisma.$executeRawUnsafe('UPDATE SystemConfig SET tokensEnabled = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = 1'))"
```

#### 4. Admin Disable
```powershell
$body = '{"disable":true}'
Invoke-RestMethod -Method Post -Uri 'http://localhost:3001/api/system/tokens/admin-disable' -Headers $hdr -Body $body
```

### Script de Cron Externo
```powershell
# scripts/run-reconcile.ps1
cd 'D:\APPLOUNGE_TOKEN_FINAL_NOV\tokensapp'
npx ts-node -e "import('./src/lib/scheduler').then(m=>m.reconcileOnce())"
```

---

## 🔧 Mantenimiento de Batches

### Purgar Batches de Prueba
`POST /api/system/tokens/purge-batches`

Requiere sesión ADMIN.

#### Body
```json
{
  "batchIds": ["<batchId1>", "<batchId2>"],
  "options": {
    "dryRun": true,
    "deleteUnusedPrizes": true
  }
}
```

#### Respuesta (dryRun)
```json
{
  "ok": true,
  "dryRun": true,
  "batchIds": ["..."],
  "summary": {
    "tokenCounts": [...],
    "rouletteSessions": 2,
    "spins": 35,
    "redeemed": [...]
  }
}
```

### Renombrar Batch
`PATCH /api/batch/[id]`

#### Body
```json
{ "description": "Nuevo texto" }
```

#### Respuesta
```json
{ "ok": true, "batch": { "id": "...", "description": "Nuevo texto" } }
```

### Orden de Eliminación
1. `RouletteSpin` asociados
2. `RouletteSession`
3. `Token`
4. `Batch`
5. (Opcional) `Prize` huérfanos

---

## 🚀 Próximas Mejoras

- Métricas Prometheus para scheduler
- UI inline para rename de batches
- Confirm modal para purge con preview
- Flag de protección contra borrado si hay canjes
- Auditoría dedicada para operaciones de mantenimiento