# Roles y permisos

Esta guía resume cómo funcionan los roles en el sistema Go Lounge, diferenciando claramente los contextos de autenticación y las secciones de la aplicación que habilita cada uno.

## Contextos de Autenticación

- **`admin_session`** (Panel admin y APIs administrativas) → Roles: `ADMIN`, `STAFF`
- **`user_session`** (BYOD / Área de colaboradores `/u/**`) → Roles: `COLLABORATOR`, `STAFF`

> **Importante**: El rol `STAFF` existe en ambos contextos pero NO es el mismo permiso. Un usuario `STAFF` en BYOD no obtiene acceso al panel admin; para panel admin se requiere una sesión `admin_session` con rol `ADMIN` o `STAFF` (de admin).

## Roles del Sistema

### 🔑 ADMIN
- **Contexto**: `admin_session`
- **Acceso**: Panel administrativo completo (`/admin/**`)
- **Permisos**: Control total del sistema, incluyendo:
  - Gestión de usuarios y colaboradores
  - Control de tokens (activar/desactivar)
  - Métricas y reportes
  - Configuración del sistema
  - APIs administrativas completas

### 👨‍💼 STAFF (Admin)
- **Contexto**: `admin_session`
- **Acceso**: Panel administrativo limitado
- **Permisos actuales**:
  - `/admin/attendance` y `/api/admin/attendance/*`
  - Control de tokens desde panel admin
  - Validación de cumpleaños (staff puede validar tokens de invitación)
  - Otras secciones requieren `ADMIN`

### 🧑‍🍳 COLLABORATOR (BYOD)
- **Contexto**: `user_session`
- **Acceso**: Área BYOD (`/u/**`)
- **Permisos**:
  - Scanner personal (`/u/scanner`)
  - Checklist diario (`/u/checklist`)
  - Registro de asistencia (IN/OUT)
  - Gestión de tareas asignadas
- **Áreas específicas**: Algunos colaboradores tienen áreas de restaurante asignadas que les dan permisos adicionales para cumpleaños

### 👨‍💼 STAFF (Usuario)
- **Contexto**: `user_session`
- **Acceso**: Área BYOD con permisos extendidos
- **Permisos adicionales sobre COLLABORATOR**:
  - Control de tokens (`/u/tokens`)
  - Acceso a funcionalidades avanzadas
  - Puede alternar tokens independientemente del área

## Matriz de Acceso Detallada

### Panel Admin (`/admin/**`)
| Rol | Acceso | Notas |
|-----|--------|-------|
| `ADMIN` (admin_session) | ✅ Completo | Acceso total |
| `STAFF` (admin_session) | ⚠️ Limitado | Solo rutas específicas (asistencia, tokens) |
| `COLLABORATOR` (user_session) | ❌ No | Requiere admin_session |
| `STAFF` (user_session) | ❌ No | Requiere admin_session |

### Área BYOD (`/u/**`)
| Rol | Acceso | Notas |
|-----|--------|-------|
| `ADMIN` (admin_session) | ✅ Completo | Acceso administrativo |
| `STAFF` (admin_session) | ✅ Completo | Acceso administrativo |
| `COLLABORATOR` (user_session) | ✅ Básico | Scanner, checklist, asistencia |
| `STAFF` (user_session) | ✅ Extendido | + Control de tokens |

### APIs Especiales
| API | Roles Permitidos | Notas |
|-----|------------------|-------|
| `/api/system/tokens/*` | `ADMIN`, `STAFF` (admin_session) | Control de sistema de tokens |
| `/api/birthdays/*` | Público + `ADMIN`, `STAFF` (admin_session) | Reservas públicas, validación staff |
| `/api/trivia/*` | Público (rate limited) | Sesiones de trivia |
| `/api/admin/health` | Basic Auth (`health` user) | Health checks |
| `/api/staff/metrics` | `ADMIN` | Métricas de rendimiento |

## Colaboradores con Áreas Específicas

Algunos colaboradores tienen asignadas **áreas de restaurante** que les otorgan permisos adicionales:

- **Permisos extra**: Pueden validar invitaciones de cumpleaños incluso sin ser `STAFF`
- **Mapeo**: Área → Rol staff equivalente (definido en `lib/staff-roles.ts`)
- **Uso**: Colaboradores de áreas específicas pueden ayudar en validaciones de eventos

## Autenticación y Sesiones

### Cookies de Sesión
- **`admin_session`**: Para panel administrativo y APIs admin
- **`user_session`**: Para área BYOD y funcionalidades de colaborador

### Middleware de Protección
- Rutas `/admin/**`: Requieren `admin_session` con roles apropiados
- Rutas `/u/**`: Requieren `user_session` válida
- Rutas `/api/admin/**`: Requieren `admin_session`
- Rutas `/api/user/**`: Requieren `user_session`

## Dónde se Define en el Código

- **Admin auth**: `src/lib/auth.ts`, middleware en `src/middleware.ts`
- **User auth**: `src/lib/auth-user.ts`, middleware en `src/middleware.ts`
- **Staff roles**: `src/lib/staff-roles.ts` (mapeo de áreas)
- **Birthday auth**: `src/lib/birthdays/clientAuth.ts`
- **Rate limiting**: `src/lib/rateLimit.ts` (por contexto)

## Buenas Prácticas

- **Por defecto**: Crea colaboradores como `COLLABORATOR`
- **STAFF BYOD**: Solo cuando necesiten control de tokens u otros privilegios extendidos
- **Separación clara**: Mantén credenciales de `admin_session` separadas de `user_session`
- **Áreas específicas**: Asigna áreas de restaurante solo cuando sea necesario para funcionalidades adicionales
- **Principio de menor privilegio**: Otorga el rol mínimo necesario para cada función

## Ejemplos de Flujo

### Login Admin (Desarrollo)
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "admin-admin"
}
# → Cookie admin_session con rol ADMIN
```

### Login BYOD (Colaborador)
```bash
POST /api/user/auth/login
# → Cookie user_session con rol COLLABORATOR o STAFF
```

### Validación de Cumpleaños
- **Staff admin**: Puede validar cualquier invitación
- **Colaborador con área**: Puede validar invitaciones según su área asignada
- **Público**: Solo puede ver información básica de invitaciones

---

Para el alta y flujo de colaboradores, ver también: `docs/collaborators.md`.
