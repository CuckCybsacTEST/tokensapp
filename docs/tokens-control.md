# Control de Tokens

Este documento describe la política de control ON/OFF del sistema de canje y los permisos vigentes tras la simplificación: ahora **cualquier usuario con rol STAFF** (ya sea en `admin_session` o en `user_session` BYOD) puede ver y alternar el estado global de tokens. El área (`area='Caja'`) dejó de ser requisito.

## Resumen de permisos (versión actual)

- `ADMIN` (admin_session): puede ver y alternar.
- `STAFF` (admin_session): puede ver y alternar (ya no es solo lectura).
- `STAFF` (user_session BYOD): puede ver y alternar desde `/u/tokens`.
- `COLLAB` (user_session): no puede ver ni alternar (403 en capabilities y toggle; status devuelve 401/403 según ausencia de sesión válida de staff/admin).

Auditoría registra el tipo de actor: `admin` o `staff` (se retiró `staff:caja`).

## Endpoints

**GET** `/api/system/tokens/status`
- Devuelve `{ tokensEnabled, scheduledEnabled, lastChangeIso, nextSchedule, serverTimeIso, timezone }`.
- Autorización: `ADMIN` o `STAFF` (admin_session) o `STAFF` (user_session BYOD). `COLLAB` recibe 401/403.

**GET** `/api/system/tokens/capabilities`
- Devuelve `{ canView: true, canToggle: true }` para cualquier STAFF / ADMIN. `COLLAB` → 403.

**POST** `/api/system/tokens/toggle`
- Body: `{ enabled: boolean }`.
- Efecto: alterna el estado global, invalida caché y registra auditoría (`actor: 'admin' | 'staff'`).
- Autorización: `ADMIN` o `STAFF` (admin_session) o `STAFF` (user_session). No se verifica área.

## UI

Panel admin: `/admin/tokens` (control habilitado tanto para ADMIN como STAFF).

BYOD: `/u/tokens` disponible para cualquier STAFF. La home `/u` muestra tarjeta de acceso “Control de Tokens”. Se eliminó la ruta `/u/caja`.

Encabezado BYOD (`/u/**`): indica el colaborador activo mostrando nombre y DNI, e incluye botón de cierre de sesión.

## Consideraciones de seguridad

Middleware: `/api/system/*` accesible con `admin_session` (ADMIN/STAFF) o `user_session` (STAFF). `COLLAB` bloqueado.
Auditoría: registra `actor.kind` = `admin` | `staff`.
No se requiere doble sesión; una sola sesión STAFF basta.

## Ejemplos rápidos

PowerShell (Windows), servidor local `http://localhost:3000`:

```powershell
# 1) Ver estado como staff BYOD (requiere cookie user_session en $cookie)
Invoke-RestMethod -UseBasicParsing -Uri 'http://localhost:3000/api/system/tokens/status' -Headers @{ Cookie = $cookie }

# 2) Preguntar capacidades
Invoke-RestMethod -UseBasicParsing -Uri 'http://localhost:3000/api/system/tokens/capabilities' -Headers @{ Cookie = $cookie }

### Alternar ON
Invoke-RestMethod -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/system/tokens/toggle' -Headers @{ Cookie = $cookie; 'Content-Type' = 'application/json' } -Body '{"enabled":true}'
```

Si recibes 403 al alternar, verifica:
- Que la cookie sea de una sesión STAFF válida (no COLLAB).
- Que no haya expirado la sesión (reintenta login).

## Seeds y entornos

- Seeds deshabilitados por defecto y seguros: solo se ejecutan si defines `ALLOW_SEED=1` y, por defecto, se saltan cuando la base no está vacía (no borran datos existentes).
- En producción, ejecuta seeds manualmente y solo una vez en entornos vacíos.
