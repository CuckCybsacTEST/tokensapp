# Roles y permisos

Esta guía resume cómo funcionan los roles en el sistema, diferenciando claramente los contextos de autenticación y las secciones de la aplicación que habilita cada uno.

- Contextos de autenticación:
  - `admin_session` (panel y APIs admin) → roles: `ADMIN`, `STAFF`.
  - `user_session` (BYOD / área de colaboradores `/u/**`) → roles: `COLLAB`, `STAFF`.

Importante: el rol `STAFF` existe en ambos contextos, pero no es el mismo permiso. Un usuario `STAFF` en BYOD no obtiene acceso al panel admin; para panel admin se requiere una sesión `admin_session` con rol `ADMIN` o `STAFF` (de admin).

## Resumen por contexto

- Admin (`admin_session`):
  - `ADMIN`: acceso total al panel y a APIs admin.
  - `STAFF` (admin): acceso limitado a vistas/APIs específicas (p. ej. asistencia). Ejemplos de reglas actuales:
    - Acceso a `/admin/attendance` y a `/api/admin/attendance/*`.
    - Otras secciones de `/admin/**` requieren `ADMIN`.

- BYOD (`user_session`):
  - `COLLAB`: acceso a `/u/**` (scanner BYOD, checklist, asistencia personal), puede marcar IN/OUT y gestionar tareas del día.
  - `STAFF` (usuario): mismas capacidades que `COLLAB` en `/u/**` y habilita permisos específicos por perfil. Caso especial: si la persona asociada tiene `area='Caja'`, puede alternar el estado global de tokens desde `/u/caja` sin requerir sesión de admin. Ver [Control de Tokens (Caja)](./tokens-control.md).

## Matriz de acceso (extracto)

- Panel admin (`/admin/**`):
  - `ADMIN`: Sí.
  - `STAFF` (admin): Solo en rutas puntuales habilitadas (p. ej. `/admin/attendance`).
  - `COLLAB` (BYOD): No.
  - `STAFF` (BYOD): No.

- APIs admin sensibles (`/api/scanner/metrics|recent|events`):
  - Solo `ADMIN` (admin_session).

- BYOD (`/u/**` y APIs `/api/user/**`, `/api/tasks/**`, `/api/attendance/**`):
  - Requiere `user_session` válida (rol `COLLAB` o `STAFF` de usuario) o bien `admin_session` con `ADMIN` (bypass para pruebas).
  - Toggle de tokens: solo `STAFF` (BYOD) con `Person.area='Caja'`. Ruta: `/u/caja`. API: `/api/system/tokens/toggle`.

- Página de escáner `/scanner` (kiosco):
  - Permite `admin_session` con `ADMIN` o `STAFF` de admin, o bien cualquier `user_session` válida (COLLAB/STAFF de usuario).

## Dónde se define en el código

- Admin session y roles: `src/lib/auth.ts`, chequeos en `src/middleware.ts` y rutas `src/app/api/admin/**`.
- User session (BYOD) y roles: `src/lib/auth-user.ts`, chequeos en `src/middleware.ts` y rutas `src/app/api/user/**`, `src/app/api/tasks/**`, `src/app/api/attendance/**`.
- Ejemplo de login admin: `src/app/api/auth/login/route.ts`.
- Ejemplo de login BYOD: `src/app/api/user/auth/login/route.ts`.

## Buenas prácticas

- Crea colaboradores como `COLLAB` por defecto. Usa `STAFF` (BYOD) solo si necesitás distinguir en métricas u otorgar permisos futuros en `/u/**`.
  - Si un colaborador operará caja, asignale `STAFF` (BYOD) y `area='Caja'` en su Persona; así podrá alternar tokens sin credenciales de admin.
- Para acceso al panel, gestioná credenciales de `admin_session` por separado y asigná `STAFF` de admin solo a quienes necesiten ver módulos habilitados (p. ej. asistencia), reservando `ADMIN` para operación completa.
- Evitá mezclar roles de contextos: tener `STAFF` en BYOD no otorga acceso al panel admin.

## Ejemplos rápidos

- Login admin (dev):
  - `POST /api/auth/login` con `{ username: "admin", password: "admin-admin" }` → crea cookie `admin_session` con rol `ADMIN`.
  - También existe usuario dev `staff/staff-staff` con rol `STAFF` (admin) para validar `/admin/attendance`.

- Login BYOD (colaborador):
  - `POST /api/user/auth/login` con credenciales creadas en `/api/admin/users` → crea `user_session` con rol `COLLAB` o `STAFF` (usuario).
  - Acceso a `/u/scanner` y checklist `/u/checklist` restringido por middleware.

---

Para el alta y flujo de colaboradores, ver también: `docs/collaborators.md`.
