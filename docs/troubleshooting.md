# Guía de Troubleshooting - Go Lounge

Esta guía completa cubre problemas comunes y soluciones para el sistema Go Lounge, organizada por componentes y niveles de criticidad.

## 🚨 Problemas Críticos

### Sistema Completamente Inoperativo

#### Base de Datos No Disponible
**Síntomas:**
- Error 500 en todas las páginas
- `PrismaClientInitializationError`
- App no inicia

**Solución:**
```bash
# Verificar conexión a DB
npm run db:push

# Si es PostgreSQL remoto
psql $DATABASE_URL -c "SELECT 1"

# Reiniciar servicios
npm run dev
```

#### Servidor No Responde
**Síntomas:**
- 502 Bad Gateway
- Timeout en requests
- App no carga

**Solución:**
```bash
# Verificar procesos
ps aux | grep node

# Reiniciar aplicación
npm run dev

# Verificar logs
tail -f logs/app.log
```

### Autenticación Rota
**Síntomas:**
- No se puede hacer login
- Sesiones expiran inmediatamente
- Error 401/403 en todas las rutas

**Solución:**
```sql
-- Verificar usuarios en DB
SELECT id, username, role FROM "User" WHERE active = true;

-- Resetear contraseña admin (desarrollo)
UPDATE "User" SET password_hash = '$2b$10$...' WHERE username = 'admin';
```

## 🎫 Problemas de Tokens

### Tokens No se Generan
**Síntomas:**
- Lotes aparecen vacíos
- Error al crear batch
- QR codes no se muestran

**Diagnóstico:**
```sql
-- Verificar lote
SELECT id, description, functional_date, created_at FROM "Batch" WHERE id = 'batch_id';

-- Verificar tokens generados
SELECT COUNT(*) FROM "Token" WHERE batch_id = 'batch_id';

-- Verificar premios disponibles
SELECT id, name, stock FROM "Prize" WHERE active = true;
```

**Soluciones:**
```bash
# Regenerar lote
npm run ts-node scripts/regenerate-batch.ts batch_id

# Verificar stock de premios
SELECT prize_id, COUNT(*) FROM "Token" GROUP BY prize_id;
```

### Tokens Expiran Prematuramente
**Síntomas:**
- Tokens válidos marcan como expirados
- functionalDate incorrecto

**Solución:**
```sql
-- Corregir functionalDate
UPDATE "Batch"
SET functional_date = '2025-10-11 03:00:00'::timestamptz
WHERE id = 'batch_id';

-- Recalcular expiraciones
UPDATE "Token"
SET expires_at = functional_date + INTERVAL '24 hours'
FROM "Batch" b
WHERE "Token".batch_id = b.id;
```

### QR No Escanea
**Síntomas:**
- App móvil no lee QR
- Error "Token inválido"

**Diagnóstico:**
```sql
-- Verificar signature
SELECT signature, status, expires_at FROM "Token" WHERE signature = 'ABC123';

-- Verificar formato QR
-- El QR debe contener: signature + prize_id + expires_at
```

**Solución:**
- Regenerar QR con datos correctos
- Verificar que la signature sea única

## 🎂 Problemas de Cumpleaños

### Reservas No se Crean
**Síntomas:**
- Error al crear reserva
- "DNI ya usado este año"

**Diagnóstico:**
```sql
-- Verificar reservas existentes
SELECT documento, date, status FROM "BirthdayReservation"
WHERE documento = '12345678'
  AND EXTRACT(YEAR FROM date) = 2025;

-- Verificar paquetes activos
SELECT id, name, active FROM "BirthdayPack";
```

**Solución:**
```sql
-- Cancelar reserva anterior si aplica
UPDATE "BirthdayReservation"
SET status = 'cancelled'
WHERE documento = '12345678' AND status = 'pending';
```

### Tokens de Invitación No se Generan
**Síntomas:**
- Reserva creada pero sin QR codes
- Error en generación de tokens

**Solución:**
```sql
-- Forzar generación
UPDATE "BirthdayReservation"
SET tokens_generated_at = NULL
WHERE id = 'reservation_id';

-- Llamar API manualmente
curl -X POST /api/birthdays/reservations/reservation_id/tokens \
  -H "Content-Type: application/json" \
  -d '{"clientSecret": "secret"}'
```

### Invitados No Pueden Entrar
**Síntomas:**
- QR válido pero no registra llegada
- Error "Token expirado"

**Diagnóstico:**
```sql
-- Verificar token
SELECT code, status, expires_at, used_count, max_uses
FROM "InviteToken"
WHERE code = 'ABC123';

-- Verificar reserva activa
SELECT status, date, time_slot FROM "BirthdayReservation"
WHERE id = (SELECT reservation_id FROM "InviteToken" WHERE code = 'ABC123');
```

**Solución:**
```sql
-- Extender expiración si es necesario
UPDATE "InviteToken"
SET expires_at = NOW() + INTERVAL '2 hours'
WHERE code = 'ABC123';
```

## 📊 Problemas de Métricas

### Métricas No Coinciden
**Síntomas:**
- Números diferentes entre API y DB
- Métricas de días anteriores incorrectas

**Diagnóstico:**
```sql
-- Verificar cálculo manual
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN redeemed_at IS NOT NULL THEN 1 END) as redeemed
FROM "Token" t
JOIN "Batch" b ON t.batch_id = b.id
WHERE b.functional_date >= '2025-10-11 03:00:00'
  AND b.functional_date < '2025-10-12 03:00:00';
```

**Solución:**
```sql
-- Recalcular functionalDate para lotes legacy
UPDATE "Batch"
SET functional_date = created_at::date
WHERE functional_date IS NULL;
```

### functionalDate Incorrecto
**Síntomas:**
- Métricas muestran datos de días equivocados
- Tokens aparecen en días incorrectos

**Solución:**
```sql
-- Corregir functionalDate masivamente
UPDATE "Batch"
SET functional_date = DATE_TRUNC('day', created_at AT TIME ZONE 'America/Lima')
WHERE functional_date IS NULL;
```

## 🔐 Problemas de Autenticación

### No Puede Hacer Login
**Síntomas:**
- Credenciales correctas pero login falla
- Sesión no se mantiene

**Diagnóstico:**
```sql
-- Verificar usuario
SELECT id, username, role, active FROM "User" WHERE username = 'admin';

-- Verificar contraseña (hash)
SELECT password_hash FROM "User" WHERE username = 'admin';
```

**Solución:**
```bash
# Resetear contraseña (desarrollo)
npm run ts-node scripts/reset-admin-password.ts
```

### Permisos Incorrectos
**Síntomas:**
- Usuario puede acceder a secciones que no debería
- Error 403 en secciones permitidas

**Diagnóstico:**
```sql
-- Verificar roles
SELECT username, role FROM "User" WHERE username = 'usuario';

-- Verificar permisos por rol
-- ADMIN: acceso completo
-- STAFF: acceso limitado
-- COLLABORATOR: solo BYOD
```

### Sesiones Expiran
**Síntomas:**
- Logout automático frecuente
- Cookies no se guardan

**Solución:**
- Verificar configuración de cookies
- Revisar middleware de sesión
- Verificar expiración de tokens JWT

## 🌐 Problemas de APIs

### Endpoint Retorna 500
**Síntomas:**
- API falla internamente
- Error no específico

**Diagnóstico:**
```bash
# Verificar logs
tail -f logs/app.log | grep "ERROR"

# Test endpoint manual
curl -v http://localhost:3000/api/system/tokens/status
```

**Solución:**
- Revisar parámetros de entrada
- Verificar permisos de autenticación
- Revisar conexión a base de datos

### Rate Limiting Activado
**Síntomas:**
- Error 429 Too Many Requests
- Requests bloqueadas

**Diagnóstico:**
```sql
-- Verificar límites por IP
SELECT ip, requests, window_start FROM "RateLimit"
WHERE ip = '192.168.1.1';
```

**Solución:**
```sql
-- Resetear límites (desarrollo)
DELETE FROM "RateLimit" WHERE ip = '192.168.1.1';
```

### CORS Errors
**Síntomas:**
- Error de origen cruzado en navegador
- API funciona en Postman pero no en app

**Solución:**
- Verificar configuración CORS en `src/lib/cors.ts`
- Agregar origen permitido
- Verificar headers de preflight

## 💾 Problemas de Base de Datos

### Conexión Perdida
**Síntomas:**
- Queries lentas o fallidas
- Error "connection timeout"

**Diagnóstico:**
```bash
# Test conexión
psql $DATABASE_URL -c "SELECT version();"

# Verificar pool de conexiones
SELECT count(*) FROM pg_stat_activity WHERE datname = 'database_name';
```

**Solución:**
- Reiniciar pool de conexiones
- Verificar configuración de PostgreSQL
- Revisar límites de conexión

### Datos Corruptos
**Síntomas:**
- Inconsistencias en datos
- Foreign keys rotas

**Diagnóstico:**
```sql
-- Verificar integridad referencial
SELECT * FROM "Token" t
LEFT JOIN "Batch" b ON t.batch_id = b.id
WHERE b.id IS NULL;
```

**Solución:**
```sql
-- Limpiar datos huérfanos
DELETE FROM "Token" WHERE batch_id NOT IN (SELECT id FROM "Batch");
```

### Migraciones Pendientes
**Síntomas:**
- Schema desactualizado
- Nuevos campos no existen

**Solución:**
```bash
# Aplicar migraciones
npm run db:migrate

# Resetear si es necesario (desarrollo)
npm run db:reset
```

## 🚀 Problemas de Despliegue

### Build Falla
**Síntomas:**
- Error en `npm run build`
- TypeScript errors

**Solución:**
```bash
# Limpiar cache
rm -rf .next node_modules/.cache

# Reinstalar dependencias
npm ci

# Build
npm run build
```

### Variables de Entorno Faltan
**Síntomas:**
- Error "Environment variable not found"
- Funcionalidades deshabilitadas

**Solución:**
- Verificar archivo `.env`
- Configurar variables en plataforma de hosting
- Documentar variables requeridas

### Memoria Insuficiente
**Síntomas:**
- App se reinicia sola
- Error "JavaScript heap out of memory"

**Solución:**
```bash
# Aumentar límite de memoria
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Optimizar queries
# Revisar memory leaks
```

## 📱 Problemas de UI/UX

### Página No Carga
**Síntomas:**
- Blanco o error de JavaScript
- Componentes no renderizan

**Diagnóstico:**
```bash
# Verificar consola del navegador
# Revisar Network tab
# Verificar hydration errors
```

**Solución:**
- Verificar imports de componentes
- Revisar errores de TypeScript
- Verificar dependencias faltantes

### Estilos Rotos
**Síntomas:**
- CSS no aplica
- Layout desordenado

**Solución:**
```bash
# Rebuild CSS
npm run build:css

# Limpiar cache del navegador
# Verificar Tailwind config
```

### Funcionalidades No Responden
**Síntomas:**
- Botones no funcionan
- Forms no envían

**Diagnóstico:**
- Verificar event handlers
- Revisar state management
- Verificar API calls

## 🔧 Problemas de Desarrollo Local

### Prisma Client No Genera
**Síntomas:**
- Error `PrismaClientInitializationError`
- `DATABASE_URL` not found

**Solución:**
```bash
# Crear .env
cp .env.example .env

# Matar procesos node
pkill -f node

# Regenerar client
npm run prisma:generate

# Push schema
npm run db:push
```

### Hot Reload No Funciona
**Síntomas:**
- Cambios no se reflejan
- Necesita restart manual

**Solución:**
```bash
# Verificar file watching
# Revisar configuración de Next.js
# Limpiar .next cache
rm -rf .next
```

### Tests Fallan
**Síntomas:**
- Tests no pasan
- Errores de configuración

**Solución:**
```bash
# Instalar dependencias de test
npm ci

# Resetear DB de test
npm run test:reset

# Ejecutar tests
npm test
```

## 🔒 Problemas de Seguridad

### Datos Sensibles Expuestos
**Síntomas:**
- Información privada visible
- Logs contienen passwords

**Solución:**
- Revisar configuración de logging
- Verificar sanitización de datos
- Implementar rate limiting

### Acceso No Autorizado
**Síntomas:**
- Usuarios acceden a recursos prohibidos
- Bypass de autenticación

**Diagnóstico:**
```sql
-- Verificar permisos
SELECT username, role FROM "User" WHERE id = 'user_id';

-- Revisar middleware
```

**Solución:**
- Fortalecer middleware de autorización
- Implementar RBAC correcto
- Auditar accesos

## 📊 Monitoreo y Alertas

### Logs No se Generan
**Síntomas:**
- Falta información de debugging
- Errores no registrados

**Solución:**
```bash
# Verificar configuración de logging
# Revisar permisos de archivos
# Verificar espacio en disco
```

### Métricas No se Actualizan
**Síntomas:**
- Dashboards muestran datos viejos
- Alertas no se disparan

**Solución:**
- Verificar cron jobs
- Revisar configuración de métricas
- Verificar conectividad con servicios externos

### Alertas Falsas Positivas
**Síntomas:**
- Notificaciones innecesarias
- Umbrales incorrectos

**Solución:**
- Ajustar thresholds
- Revisar lógica de alertas
- Implementar hysteresis

## 🚑 Recuperación de Desastres

### Backup y Restore
```bash
# Crear backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backup_20251011.sql
```

### Rollback de Código
```bash
# Revertir commit
git revert HEAD

# Redeploy
npm run deploy
```

### Recuperación de Datos
```sql
-- Recuperar desde backup
-- Usar PITR si está configurado
-- Recuperar datos específicos si es posible
```

## 📞 Contactos y Escalamiento

### Niveles de Escalamiento
1. **Nivel 1**: Desarrollador local - Problemas de desarrollo
2. **Nivel 2**: SysAdmin - Problemas de infraestructura
3. **Nivel 3**: Equipo completo - Issues críticos

### Documentación Relacionada
- `docs/apis.md` - Referencia de APIs
- `docs/roles.md` - Permisos y autenticación
- `docs/birthdays-maintenance.md` - Mantenimiento de cumpleaños
- `docs/tokens-metrics.md` - Sistema de métricas

### Checklist de Resolución
- [ ] Identificar síntomas exactos
- [ ] Reproducir el problema
- [ ] Revisar logs relevantes
- [ ] Verificar configuración
- [ ] Aplicar solución conocida
- [ ] Testear fix
- [ ] Documentar resolución
- [ ] Prevenir recurrencia

---

*Última actualización: Noviembre 2025*
*Guía mantenida por el equipo de desarrollo*
