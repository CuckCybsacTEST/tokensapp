# Control de Tokens (Caja)

Este documento describe la política de control ON/OFF del sistema de canje y los permisos asociados al perfil de Caja.

## Resumen de permisos

- `ADMIN` (admin_session):
  - Puede ver el estado global y alternar ON/OFF desde `/admin/tokens`.
  - Accede a las APIs internas de sistema.
- `STAFF` (admin_session):
  - Acceso de solo lectura al estado en el panel (`/admin/tokens`). No puede alternar.
- `STAFF` con `Person.area = 'Caja'` (user_session BYOD):
  - Puede ver y alternar ON/OFF sin necesidad de `admin_session`.
  - UI dedicada: `/u/caja`.
- `COLLAB` (BYOD) o `STAFF` sin área `Caja` (BYOD):
  - Acceso denegado al toggle; pueden consultar estado si la política lo permite.

La comprobación de permisos es robusta del lado servidor: incluso si la UI muestra controles por error, el backend valida que el actor sea `ADMIN` o `STAFF` BYOD en área `Caja` antes de ejecutar el cambio.

## Endpoints

- `GET /api/system/tokens/status`
  - Devuelve `{ tokensEnabled, scheduledEnabled, lastChangeAt, scheduleWindow }`.
  - Autorización: `ADMIN/STAFF` (admin_session) o `STAFF` (BYOD). No requiere ser Caja para lectura.

- `GET /api/system/tokens/capabilities`
  - Devuelve `{ canView, canToggle }` según la sesión actual.
  - Autorización: requiere sesión válida (admin o BYOD). Si no hay sesión → 401.

- `POST /api/system/tokens/toggle`
  - Body: `{ enabled: boolean }`.
  - Efecto: alterna el estado global, invalida caché y registra auditoría (`actor: 'admin' | 'staff:caja'`).
  - Autorización: `ADMIN` (admin_session) o `STAFF` BYOD con `Person.area='Caja'`.

## UI

- Panel admin: `/admin/tokens`
  - Muestra dashboard y control. Si la sesión es `STAFF` (admin), el control aparece deshabilitado con aviso.

- Colaborador (BYOD): `/u/caja`
  - Página dedicada para Caja que consume `status`, `capabilities` y `toggle`.
  - La Home `/u` muestra una tarjeta “Control de Tokens (Caja)” si el usuario logueado pertenece al área Caja.

Encabezado BYOD (`/u/**`): indica el colaborador activo mostrando nombre y DNI, e incluye botón de cierre de sesión.

## Consideraciones de seguridad

- Middleware permite `/api/system/*` con `admin_session` (ADMIN/STAFF) o con `user_session` (STAFF). El endpoint `toggle` además valida que sea `ADMIN` o `STAFF` Caja.
- Auditoría: el cambio registra el origen del actor. Úsalo para trazabilidad.
- No se requiere mezclar cookies de admin + BYOD; Caja opera solo con su sesión de usuario.

## Ejemplos rápidos

PowerShell (Windows), servidor local `http://localhost:3000`:

```powershell
# 1) Ver estado como staff BYOD (requiere cookie user_session en $cookie)
Invoke-RestMethod -UseBasicParsing -Uri 'http://localhost:3000/api/system/tokens/status' -Headers @{ Cookie = $cookie }

# 2) Preguntar capacidades
Invoke-RestMethod -UseBasicParsing -Uri 'http://localhost:3000/api/system/tokens/capabilities' -Headers @{ Cookie = $cookie }

# 3) Alternar ON (Caja)
Invoke-RestMethod -UseBasicParsing -Method Post -Uri 'http://localhost:3000/api/system/tokens/toggle' -Headers @{ Cookie = $cookie; 'Content-Type' = 'application/json' } -Body '{"enabled":true}'
```

Si recibes 403 al alternar, verifica que el usuario sea `STAFF` BYOD y que su `Person.area` sea exactamente `Caja`.

## Seeds y entornos

- Seeds deshabilitados por defecto y seguros: solo se ejecutan si defines `ALLOW_SEED=1` y, por defecto, se saltan cuando la base no está vacía (no borran datos existentes).
- En producción, ejecuta seeds manualmente y solo una vez en entornos vacíos.
