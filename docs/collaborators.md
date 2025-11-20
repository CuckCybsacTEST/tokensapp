# Gestión de Colaboradores - Go Lounge

Esta guía completa describe el proceso de registro, gestión y mantenimiento de colaboradores en el sistema Go Lounge, incluyendo roles, permisos, flujos de trabajo y mejores prácticas.

## 👥 Tipos de Colaboradores

### COLLABORATOR (Colaborador Básico)
- **Acceso**: Área BYOD (`/u/*`)
- **Permisos**:
  - Scanner personal (`/u/scanner`)
  - Checklist diario (`/u/checklist`)
  - Registro de asistencia (IN/OUT)
  - Gestión de tareas asignadas
- **Uso**: Empleados generales que necesitan acceso básico al sistema

### STAFF (Colaborador Avanzado)
- **Acceso**: Área BYOD con permisos extendidos
- **Permisos adicionales**:
  - Control de tokens (`/u/tokens`)
  - Acceso a funcionalidades avanzadas
  - Puede alternar tokens independientemente del área
- **Uso**: Supervisores y empleados con responsabilidades adicionales

### Colaboradores con Áreas Específicas
- **Permisos extra**: Pueden validar invitaciones de cumpleaños
- **Mapeo**: Área → Rol staff equivalente (definido en `lib/staff-roles.ts`)
- **Ejemplos**:
  - `Barra` → Puede validar cumpleaños
  - `Mozos` → Puede validar cumpleaños
  - `Seguridad` → Acceso básico

## 📋 Campos del Colaborador

### Información de Usuario
- **`username`** (string, único, min 3 caracteres): Nombre de usuario para login
- **`password`** (string, min 8 caracteres): Contraseña (se almacena hasheada)
- **`role`** (enum): `COLLABORATOR` o `STAFF`

### Información Personal
- **`name`** (string): Nombre completo a mostrar
- **`dni`** (string, único): Documento de identidad (se normaliza a dígitos)
- **`area`** (enum): Área de trabajo permitida

### Campos Calculados
- **`code`**: DNI normalizado (solo dígitos) - usado como identificador único
- **`personCode`**: Código de persona vinculada

### Áreas Permitidas
```
Barra, Mozos, Seguridad, Animación, DJs, Multimedia, Caja, Otros
```

## 🔐 Seguridad y Políticas

### Hash de Contraseñas
- **Algoritmo**: bcrypt con salt
- **Almacenamiento**: Solo hash, nunca contraseña en claro
- **Política**: Mínimo 8 caracteres, combinar letras, números y símbolos

### Autenticación Dual
- **Admin Session**: Para panel administrativo (`admin_session`)
- **User Session**: Para área BYOD (`user_session`)

### Restricciones de Acceso
- Alta de colaboradores: Solo usuarios `ADMIN`
- Modificación: Solo `ADMIN` o el propio usuario (datos básicos)
- Eliminación: Solo `ADMIN` (soft delete recomendado)

## 🚀 Flujo de Alta de Colaborador

### Paso 1: Preparación
```bash
# Verificar que no existe el DNI
curl -H "Cookie: admin_session=..." \
  "http://localhost:3000/api/admin/users?search=12345678"
```

### Paso 2: Crear Colaborador
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<ADMIN_COOKIE>" \
  -d '{
    "username": "ana.garcia",
    "password": "AnaSecure2025!",
    "role": "COLLABORATOR",
    "person": {
      "name": "Ana García López",
      "dni": "12.345.678",
      "area": "Barra"
    }
  }'
```

**Respuesta Exitosa (201):**
```json
{
  "ok": true,
  "user": {
    "id": "user_123",
    "username": "ana.garcia",
    "role": "COLLABORATOR"
  },
  "person": {
    "id": "person_456",
    "code": "12345678",
    "name": "Ana García López",
    "dni": "12345678",
    "area": "Barra"
  }
}
```

### Paso 3: Verificar Creación
```sql
-- Verificar en base de datos
SELECT u.username, u.role, p.name, p.dni, p.area
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
WHERE u.username = 'ana.garcia';
```

### Paso 4: Probar Login BYOD
```bash
# Login por DNI (recomendado)
curl -X POST http://localhost:3000/api/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"dni":"12345678","password":"AnaSecure2025!"}' \
  -i
```

## 🛠️ Gestión de Colaboradores

### Listar Colaboradores
```bash
# Todos los colaboradores
curl -H "Cookie: admin_session=..." \
  "http://localhost:3000/api/admin/users"

# Buscar por DNI o nombre
curl -H "Cookie: admin_session=..." \
  "http://localhost:3000/api/admin/users?search=12345678"
```

**Respuesta:**
```json
{
  "users": [
    {
      "id": "user_123",
      "username": "ana.garcia",
      "role": "COLLABORATOR",
      "personCode": "12345678",
      "personName": "Ana García López",
      "dni": "12345678",
      "area": "Barra",
      "active": true,
      "createdAt": "2025-10-01T10:00:00.000Z"
    }
  ]
}
```

### Actualizar Información
```bash
curl -X PATCH http://localhost:3000/api/admin/users/user_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<ADMIN_COOKIE>" \
  -d '{
    "person": {
      "name": "Ana García López",
      "area": "Mozos"
    }
  }'
```

### Desactivar Colaborador
```bash
# Soft delete (recomendado)
curl -X PATCH http://localhost:3000/api/admin/users/user_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<ADMIN_COOKIE>" \
  -d '{"active": false}'
```

### Resetear Contraseña
```bash
curl -X POST http://localhost:3000/api/admin/users/user_123/reset-password \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<ADMIN_COOKIE>" \
  -d '{"newPassword": "NuevaPassword2025!"}'
```

## 📊 Reportes y Métricas

### Actividad de Colaboradores
```sql
-- Último login de colaboradores
SELECT u.username, p.name, u.last_login_at,
       CASE WHEN u.active THEN 'Activo' ELSE 'Inactivo' END as status
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
WHERE u.role IN ('COLLABORATOR', 'STAFF')
ORDER BY u.last_login_at DESC NULLS LAST;
```

### Asistencia por Área
```sql
-- Asistencia del día actual por área
SELECT p.area, COUNT(a.id) as presentes,
       COUNT(CASE WHEN a.check_out_at IS NULL THEN 1 END) as activos
FROM "Person" p
LEFT JOIN "Attendance" a ON p.id = a.person_id
  AND DATE(a.check_in_at) = CURRENT_DATE
WHERE p.id IN (SELECT person_id FROM "User" WHERE role IN ('COLLABORATOR', 'STAFF'))
GROUP BY p.area
ORDER BY presentes DESC;
```

### Tareas Completadas
```sql
-- Tareas completadas por colaborador (última semana)
SELECT u.username, p.name, COUNT(t.id) as tareas_completadas
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
LEFT JOIN "Task" t ON p.id = t.assigned_to
  AND t.completed_at >= CURRENT_DATE - INTERVAL '7 days'
WHERE u.role IN ('COLLABORATOR', 'STAFF')
GROUP BY u.id, u.username, p.name
ORDER BY tareas_completadas DESC;
```

## 🎂 Colaboradores y Cumpleaños

### Permisos por Área
Algunos colaboradores tienen permisos adicionales para cumpleaños basados en su área:

```sql
-- Ver colaboradores que pueden validar cumpleaños
SELECT u.username, p.name, p.area,
       CASE
         WHEN p.area IN ('Barra', 'Mozos', 'Seguridad') THEN 'Puede validar cumpleaños'
         ELSE 'Acceso básico'
       END as permisos_cumpleanos
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
WHERE u.role IN ('COLLABORATOR', 'STAFF');
```

### Validación de Invitaciones
Los colaboradores con áreas específicas pueden validar tokens de cumpleaños:

```bash
# Validar invitación (solo colaboradores autorizados)
curl -X POST http://localhost:3000/api/birthdays/invite/ABC123 \
  -H "Cookie: user_session=<COLLABORATOR_COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{"device": "iPad Barra"}'
```

## 🔄 Flujo de Trabajo Diario

### 1. Login Matutino
```bash
# Colaborador hace login
curl -X POST http://localhost:3000/api/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"dni":"12345678","password":"password"}'
# → Recibe cookie user_session
```

### 2. Registro de Asistencia
```bash
# Marcar entrada
curl -X POST http://localhost:3000/api/attendance/checkin \
  -H "Cookie: user_session=<COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{"location": "Entrada Principal"}'
```

### 3. Consultar Tareas
```bash
# Ver tareas del día
DAY=$(date +%Y-%m-%d)
curl -H "Cookie: user_session=<COOKIE>" \
  "http://localhost:3000/api/tasks/list?day=$DAY"
```

### 4. Realizar Tareas
```bash
# Marcar tarea como completada
curl -X PATCH http://localhost:3000/api/tasks/task_123 \
  -H "Cookie: user_session=<COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "notes": "Completado exitosamente"}'
```

### 5. Control de Tokens (STAFF)
```bash
# Ver tokens disponibles (solo STAFF)
curl -H "Cookie: user_session=<COOKIE>" \
  "http://localhost:3000/api/u/tokens"

# Reclamar token
curl -X POST http://localhost:3000/api/u/tokens/token_123/claim \
  -H "Cookie: user_session=<COOKIE>"
```

### 6. Registro de Salida
```bash
# Marcar salida
curl -X POST http://localhost:3000/api/attendance/checkout \
  -H "Cookie: user_session=<COOKIE>" \
  -H "Content-Type: application/json" \
  -d '{"location": "Salida Principal"}'
```

## 🪄 Scripts de Utilidad

### Bulk Import de Colaboradores
```bash
# Archivo CSV: username,password,name,dni,area,role
# Formato: ana.garcia,AnaSecure2025!,Ana García,12345678,Barra,COLLABORATOR

npm run ts-node scripts/bulk-import-collaborators.ts colaboradores.csv
```

### Reset de Contraseñas Masivo
```bash
# Resetear contraseñas expiradas
npm run ts-node scripts/reset-expired-passwords.ts
```

### Auditoría de Accesos
```sql
-- Accesos recientes por colaborador
SELECT u.username, p.name,
       COUNT(al.id) as total_accesos,
       MAX(al.created_at) as ultimo_acceso
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
LEFT JOIN "AccessLog" al ON u.id = al.user_id
  AND al.created_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE u.role IN ('COLLABORATOR', 'STAFF')
GROUP BY u.id, u.username, p.name
ORDER BY ultimo_acceso DESC NULLS LAST;
```

## ⚠️ Errores Comunes y Soluciones

### Error: USERNAME_TAKEN
**Causa**: Username ya existe
**Solución**: Elegir username único o agregar sufijo (ana.garcia2)

### Error: DNI_TAKEN
**Causa**: DNI ya registrado
**Solución**:
```sql
-- Verificar colaborador existente
SELECT u.username, p.name FROM "User" u
JOIN "Person" p ON u.person_id = p.id
WHERE p.dni = '12345678';
```

### Error: INVALID_AREA
**Causa**: Área no permitida
**Solución**: Usar una de las áreas válidas: `Barra`, `Mozos`, `Seguridad`, `Animación`, `DJs`, `Multimedia`, `Caja`, `Otros`

### Login Falla
**Causa**: Contraseña incorrecta o usuario inactivo
**Solución**:
```sql
-- Verificar estado del usuario
SELECT username, active, role FROM "User" WHERE username = 'ana.garcia';

-- Resetear contraseña si es necesario
UPDATE "User" SET password_hash = '$2b$10$...' WHERE username = 'ana.garcia';
```

## 📋 Checklist de Onboarding

### Para Nuevo Colaborador
- [ ] Crear usuario con datos correctos
- [ ] Asignar rol apropiado (COLLABORATOR/STAFF)
- [ ] Configurar área correcta
- [ ] Verificar login BYOD funciona
- [ ] Probar acceso a funcionalidades
- [ ] Explicar políticas de seguridad
- [ ] Proporcionar guía de uso

### Para Administrador
- [ ] Validar datos antes de crear
- [ ] Elegir rol mínimo necesario
- [ ] Asignar área correcta para permisos
- [ ] Comunicar credenciales de forma segura
- [ ] Monitorear primeros accesos
- [ ] Configurar notificaciones si aplica

## 🔄 Mantenimiento Periódico

### Auditoría Mensual
```sql
-- Usuarios inactivos (sin login en 30 días)
SELECT u.username, p.name, u.last_login_at
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
WHERE u.role IN ('COLLABORATOR', 'STAFF')
  AND (u.last_login_at IS NULL OR u.last_login_at < CURRENT_DATE - INTERVAL '30 days');

-- Colaboradores sin área asignada
SELECT u.username, p.name
FROM "User" u
JOIN "Person" p ON u.person_id = p.id
WHERE u.role IN ('COLLABORATOR', 'STAFF')
  AND (p.area IS NULL OR p.area = '');
```

### Limpieza de Datos
```sql
-- Desactivar usuarios antiguos (ejemplo: después de 6 meses de inactividad)
UPDATE "User"
SET active = false
WHERE role IN ('COLLABORATOR', 'STAFF')
  AND last_login_at < CURRENT_DATE - INTERVAL '6 months';
```

## 📞 Contactos y Soporte

### Roles de Soporte
- **Administradores**: Alta y gestión de colaboradores
- **Supervisores**: Validación de permisos y áreas
- **Soporte Técnico**: Problemas de login y acceso

### Documentación Relacionada
- `docs/roles.md` - Sistema completo de roles y permisos
- `docs/troubleshooting.md` - Problemas comunes de colaboradores
- `docs/terminology.md` - Términos y definiciones

---

*Última actualización: Noviembre 2025*
*Documento mantenido por el equipo de administración*
