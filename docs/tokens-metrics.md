# Métricas de Tokens

Este documento describe el sistema completo de métricas de tokens de Go Lounge, incluyendo cálculo, reportes, análisis y troubleshooting.

## 📊 Resumen del Sistema de Métricas

El sistema de métricas de tokens proporciona insights detallados sobre:
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

### Autenticación
- **ADMIN** o **STAFF** (admin_session)
- **STAFF** (user_session)

---

## 📅 Períodos Disponibles

### Períodos Diarios
- **`today`**: Día actual (cierra a las 03:00 AM Lima)
- **`yesterday`**: Día anterior (finaliza a las 03:00 AM del día actual)
- **`day_before_yesterday`**: Anteayer

### Períodos Semanales
- **`this_week`**: Semana actual (lunes-domingo)
- **`last_week`**: Semana anterior

### Períodos Mensuales
- **`this_month`**: Mes actual
- **`last_month`**: Mes anterior

### Períodos Custom
```javascript
?period=custom&start=2025-10-01&end=2025-10-31
```

---

## 🔢 Tipos de Métricas

### Métricas Principales
| Métrica | Descripción | Cálculo |
|---------|-------------|---------|
| **total** | Tokens creados | `COUNT(*)` en período |
| **redeemed** | Tokens canjeados | `COUNT(redeemed_at)` en período |
| **expired** | Tokens expirados | `COUNT(expires_at)` en período |
| **active** | Tokens disponibles | `total - redeemed - expired` |
| **delivered** | Tokens entregados | `COUNT(delivered_at)` en período |
| **revealed** | Tokens revelados | `COUNT(revealed_at)` en período |
| **disabled** | Tokens deshabilitados | `COUNT(disabled = true)` |

### Métricas Adicionales
- **spins**: Vueltas de ruleta en el período
- **batchId**: Filtro opcional por lote específico

---

## 🗓️ Sistema functionalDate

### ¿Qué es functionalDate?
Campo `Batch.functionalDate` que mapea tokens al día operativo real, considerando el cierre a las **03:00 AM Lima**.

### Reglas de Cálculo para Períodos Diarios
1. **Tokens del día** = tokens cuyo `batch.functionalDate` cae dentro del rango del día Lima. Un lote generado a la 1 AM del lunes se mapea al domingo.
2. **Lotes legacy** (sin functionalDate) se contabilizan por `token.createdAt` si cae en rango.
3. **Ventana de negocio**: 18:00 del día anterior a 03:00 AM del día actual (hora Lima).

### Ejemplo de Cálculo
```sql
-- Para period=today (11 Oct 2025)
-- Rango: 2025-10-10 18:00:00 - 2025-10-11 03:00:00 (Lima)

SELECT COUNT(*) as tokens_hoy
FROM "Token" t
JOIN "Batch" b ON t.batch_id = b.id
WHERE (
  -- Lotes con functionalDate
  (b.functional_date >= '2025-10-10 18:00:00' AND
   b.functional_date < '2025-10-11 03:00:00')
  OR
  -- Lotes legacy
  (t.created_at >= '2025-10-10 18:00:00' AND
   t.created_at < '2025-10-11 03:00:00' AND
   b.functional_date IS NULL)
)
```

---

## 📈 Reportes y Análisis

### Reporte Diario de Tokens
```sql
SELECT
  DATE(b.functional_date) as fecha_operativa,
  COUNT(t.id) as total_tokens,
  COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END) as redimidos,
  COUNT(CASE WHEN t.expires_at < NOW() THEN 1 END) as expirados,
  COUNT(CASE WHEN t.delivered_at IS NOT NULL THEN 1 END) as entregados,
  ROUND(
    COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END)::decimal /
    NULLIF(COUNT(t.id), 0) * 100, 2
  ) as tasa_redencion
FROM "Token" t
JOIN "Batch" b ON t.batch_id = b.id
WHERE b.functional_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(b.functional_date)
ORDER BY fecha_operativa DESC;
```

### Análisis por Lote
```sql
SELECT
  b.id as batch_id,
  b.description,
  b.functional_date,
  COUNT(t.id) as total_tokens,
  COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END) as redimidos,
  COUNT(CASE WHEN t.prize_id IS NOT NULL THEN 1 END) as con_premio,
  AVG(EXTRACT(EPOCH FROM (t.redeemed_at - t.created_at))/3600) as horas_promedio_uso
FROM "Batch" b
LEFT JOIN "Token" t ON b.id = t.batch_id
WHERE b.functional_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY b.id, b.description, b.functional_date
ORDER BY b.functional_date DESC, redimidos DESC;
```

### Tasa de Conversión por Premio
```sql
SELECT
  p.name as premio,
  COUNT(t.id) as tokens_generados,
  COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END) as tokens_redimidos,
  ROUND(
    COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END)::decimal /
    NULLIF(COUNT(t.id), 0) * 100, 2
  ) as tasa_conversion
FROM "Prize" p
JOIN "Token" t ON p.id = t.prize_id
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.name
ORDER BY tasa_conversion DESC;
```

### Tokens por Estado Actual
```sql
SELECT
  CASE
    WHEN t.redeemed_at IS NOT NULL THEN 'redimido'
    WHEN t.expires_at < NOW() THEN 'expirado'
    WHEN t.disabled = true THEN 'deshabilitado'
    ELSE 'activo'
  END as estado,
  COUNT(*) as cantidad,
  ROUND(COUNT(*)::decimal / SUM(COUNT(*)) OVER() * 100, 2) as porcentaje
FROM "Token" t
WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY CASE
  WHEN t.redeemed_at IS NOT NULL THEN 'redimido'
  WHEN t.expires_at < NOW() THEN 'expirado'
  WHEN t.disabled = true THEN 'deshabilitado'
  ELSE 'activo'
END
ORDER BY cantidad DESC;
```

---

## 🔍 Consultas de Troubleshooting

### Tokens Sin Premio Asignado
```sql
SELECT COUNT(*) as tokens_sin_premio
FROM "Token" t
WHERE t.prize_id IS NULL
  AND t.created_at >= CURRENT_DATE - INTERVAL '7 days';
```

### Tokens Expirados Pero Activos
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

### Lotes Sin functionalDate
```sql
SELECT COUNT(*) as lotes_sin_functional_date
FROM "Batch" b
WHERE b.functional_date IS NULL
  AND b.created_at >= CURRENT_DATE - INTERVAL '90 days';
```

### Redenciones por Día/Hora
```sql
SELECT
  DATE_TRUNC('hour', t.redeemed_at) as hora,
  COUNT(*) as redenciones
FROM "Token" t
WHERE t.redeemed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', t.redeemed_at)
ORDER BY hora DESC;
```

---

## 🛠️ Mantenimiento y Utilidades

### Backfill de functionalDate
```bash
# Ejecutar una sola vez para lotes legacy
npm run backfill:functional-date
```

### Verificar Integridad de Datos
```sql
-- Tokens con fechas inconsistentes
SELECT COUNT(*) as tokens_inconsistentes
FROM "Token" t
JOIN "Batch" b ON t.batch_id = b.id
WHERE t.created_at > b.functional_date + INTERVAL '1 day'
   OR t.expires_at < b.functional_date;
```

### Limpiar Tokens Expirados Antiguos
```sql
-- Solo ejecutar con backup previo
DELETE FROM "Token"
WHERE expires_at < NOW() - INTERVAL '90 days'
  AND redeemed_at IS NULL;
```

### Resetear Métricas de Test
```sql
-- Para entorno de desarrollo
UPDATE "Token"
SET redeemed_at = NULL,
    delivered_at = NULL,
    revealed_at = NULL
WHERE batch_id IN (
  SELECT id FROM "Batch"
  WHERE description LIKE '%test%'
);
```

---

## 📊 APIs de Métricas

### Endpoint de Métricas por Período
```javascript
GET /api/system/tokens/period-metrics

// Parámetros
{
  period: "today|yesterday|this_week|last_week|this_month|last_month|custom",
  batchId: "opcional_batch_id", // filtro por lote
  start: "2025-01-01", // solo para custom
  end: "2025-01-31"   // solo para custom
}

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

### Endpoint de Spins de Ruleta
```javascript
GET /api/system/tokens/spins?period=today

// Respuesta
{
  ok: true,
  period: "today",
  totalSpins: 120,
  spinsByPrize: [
    { prizeId: "prize_1", count: 45 },
    { prizeId: "prize_2", count: 35 }
  ]
}
```

---

## 📈 Dashboards y Visualizaciones

### KPIs Principales a Monitorear
1. **Tasa de redención diaria**: `redimidos / total * 100`
2. **Tokens activos**: `total - redimidos - expirados`
3. **Tiempo promedio de uso**: `AVG(redeemed_at - created_at)`
4. **Conversión por premio**: `redimidos_por_premio / total_por_premio`

### Alertas Automáticas
```sql
-- Tokens con baja redención (< 10%)
SELECT b.description, COUNT(t.id) as total,
       COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END) as redimidos
FROM "Batch" b
JOIN "Token" t ON b.id = t.batch_id
WHERE b.functional_date = CURRENT_DATE - INTERVAL '1 day'
GROUP BY b.id, b.description
HAVING COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END)::decimal /
       NULLIF(COUNT(t.id), 0) < 0.1;
```

### Reporte Semanal Automático
```sql
SELECT
  DATE_TRUNC('week', b.functional_date) as semana,
  COUNT(DISTINCT b.id) as lotes,
  COUNT(t.id) as tokens_totales,
  COUNT(CASE WHEN t.redeemed_at IS NOT NULL THEN 1 END) as tokens_redimidos,
  ROUND(AVG(EXTRACT(EPOCH FROM (t.redeemed_at - t.created_at))/86400), 1) as dias_promedio_uso
FROM "Batch" b
LEFT JOIN "Token" t ON b.id = t.batch_id
WHERE b.functional_date >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', b.functional_date)
ORDER BY semana DESC;
```

---

## 🔧 Configuración y Tuning

### Parámetros de Rendimiento
```javascript
// En lib/date.ts
export const BUSINESS_DAY_CONFIG = {
  cutoffHour: 18, // Hora de corte para día anterior
  timezone: 'America/Lima',
  weekStartsOn: 1 // Lunes
};
```

### Optimización de Queries
```sql
-- Crear índices para métricas
CREATE INDEX CONCURRENTLY idx_token_redeemed_at ON "Token"(redeemed_at) WHERE redeemed_at IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_token_expires_at ON "Token"(expires_at);
CREATE INDEX CONCURRENTLY idx_batch_functional_date ON "Batch"(functional_date);
```

### Cache de Métricas
```javascript
// Implementar cache Redis para métricas frecuentes
const CACHE_TTL = 300; // 5 minutos

async function getCachedMetrics(period, batchId) {
  const key = `metrics:${period}:${batchId || 'all'}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const metrics = await calculateMetrics(period, batchId);
  await redis.setex(key, CACHE_TTL, JSON.stringify(metrics));
  return metrics;
}
```

---

## 🚨 Troubleshooting de Métricas

### Problemas Comunes

#### Métricas No Coinciden
```sql
-- Verificar cálculo manual vs API
SELECT
  COUNT(*) as total_manual,
  COUNT(CASE WHEN redeemed_at IS NOT NULL THEN 1 END) as redeemed_manual
FROM "Token" t
JOIN "Batch" b ON t.batch_id = b.id
WHERE b.functional_date >= '2025-10-11 03:00:00'
  AND b.functional_date < '2025-10-12 03:00:00';
```

#### functionalDate Incorrecto
```sql
-- Corregir functionalDate de lote
UPDATE "Batch"
SET functional_date = '2025-10-11 03:00:00'::timestamptz
WHERE id = 'batch_id';
```

#### Tokens Duplicados en Cálculos
```sql
-- Verificar tokens con múltiples redenciones
SELECT t.id, COUNT(tr.id) as redenciones
FROM "Token" t
LEFT JOIN "TokenRedemption" tr ON t.id = tr.token_id
GROUP BY t.id
HAVING COUNT(tr.id) > 1;
```

### Logs de Debugging
```bash
# Ver logs de cálculo de métricas
grep "period-metrics" logs/app.log | tail -20

# Ver errores de functionalDate
grep "functionalDate" logs/app.log | grep -i error
```

### Health Check de Métricas
```bash
# Verificar que las métricas se calculan correctamente
curl -H "Cookie: admin_session=..." \
  "http://localhost:3000/api/system/tokens/period-metrics?period=today"
```
