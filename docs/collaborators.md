# Registro de colaboradores

Esta guía describe cómo dar de alta colaboradores (empleados) en el panel de administración, qué campos usa el sistema y cómo validar el acceso BYOD (login de usuario) con ejemplos listos para usar.

## Campos

Requeridos
- `username` (único, mínimo 3 caracteres)
- `password` (mínimo 8 caracteres, se almacena hasheada con bcrypt)
- `name` (nombre y apellido a mostrar)
- `dni` (único por persona)
- `area` (selección de un conjunto permitido)

Notas importantes
- Ya no se ingresa `code` manualmente; el código de la persona es el DNI normalizado (solo dígitos).
- El `dni` se normaliza a dígitos. Ejemplo: `12.345.678` → `12345678`.
- El `area` debe ser uno de: `Barra`, `Mozos`, `Seguridad`, `Animación`, `DJs`, `Multimedia`, `Caja`, `Otros`.
  - Especial: `Caja` habilita el control de tokens (ON/OFF) desde BYOD si el usuario tiene rol `STAFF`. Ver [Control de Tokens (Caja)](./tokens-control.md).

## Seguridad

- Hash de contraseñas: se usa `bcrypt` para almacenar `passwordHash`; la contraseña en claro nunca se guarda ni se devuelve por API.
- Política de contraseña: longitud mínima 8 caracteres. Se recomienda combinar letras, números y símbolos.
- Roles soportados: `ADMIN`, `STAFF`, `COLLAB`. El alta de colaboradores (POST `/api/admin/users`) está restringido a usuarios con rol `ADMIN`.
- Importante: `STAFF` en BYOD no equivale a `STAFF` de admin. Ver [Roles y permisos](./roles.md) para la matriz completa y diferencias por contexto.
- Datos sensibles: el API no expone `passwordHash`. Evita loguear contraseñas o hashes.

## Endpoints relevantes

- Crear colaborador (admin): `POST /api/admin/users`
- Listar usuarios (admin): `GET /api/admin/users`
- Login BYOD (colaborador): `POST /api/user/auth/login`
- Ver tareas asignadas (colaborador): `GET /api/tasks/list?day=YYYY-MM-DD`

## Ejemplos

Asegúrate de tener la app corriendo en `http://localhost:3000` y una sesión de administrador activa (desde el panel o usando tu mecanismo de auth admin).

### 1) Alta de colaborador (curl)

```bash
curl -i -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<TU_COOKIE_DE_ADMIN>" \
  -d '{
    "username": "ana",
    "password": "ana-ana",
    "role": "COLLAB",
    "person": { "name": "Ana García", "dni": "12.345.678", "area": "Barra" }
  }'
```

Respuesta esperada (201):
```json
{
  "ok": true,
  "user": { "id": "...", "username": "ana", "role": "COLLAB" },
  "person": { "id": "...", "code": "12345678", "name": "Ana García", "dni": "12345678", "area": "Barra" }
}
```

Errores comunes:
- 400: `INVALID_NAME`, `INVALID_DNI`, `INVALID_AREA`, `INVALID_PASSWORD`
- 409: `USERNAME_TAKEN`, `DNI_TAKEN`, `CODE_TAKEN`

### 2) Verificar login BYOD del colaborador (curl)

```bash
# Login de usuario
curl -i -X POST http://localhost:3000/api/user/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ana","password":"ana-ana"}'
```

Copia el valor de cookie `user_session` del header `Set-Cookie` y úsalo para consultar sus tareas del día:

```bash
DAY=$(date +%F)
curl -i "http://localhost:3000/api/tasks/list?day=$DAY" \
  -H "Cookie: user_session=<COOKIE_DEL_LOGIN>"
```

### 3) Alta y verificación en PowerShell (Windows)

```powershell
# Alta (requiere cookie de admin válida)
$adminCookie = "admin_session=<TU_COOKIE_DE_ADMIN>"
$body = @{ 
  username = "ana";
  password = "ana-ana";
  role = "COLLAB";
  person = @{ name = "Ana García"; dni = "12.345.678"; area = "Barra" } 
} | ConvertTo-Json -Depth 5

Invoke-WebRequest -Uri "http://localhost:3000/api/admin/users" -Method Post -ContentType "application/json" -Headers @{ Cookie = $adminCookie } -Body $body | Select-Object -ExpandProperty StatusCode

# Login BYOD
$loginBody = @{ username = "ana"; password = "ana-ana" } | ConvertTo-Json
$loginResp = Invoke-WebRequest -Uri "http://localhost:3000/api/user/auth/login" -Method Post -ContentType "application/json" -Body $loginBody -SessionVariable sess

# La cookie de usuario queda en la sesión web $sess
$day = (Get-Date).ToString('yyyy-MM-dd')
Invoke-WebRequest -Uri ("http://localhost:3000/api/tasks/list?day=$day") -WebSession $sess | Select-Object -ExpandProperty StatusCode
```

### 4) Vincular usuario a persona existente usando DNI como código (opcional)

Si ya existe una `Person` (por ejemplo cargada por importación) con `code = '12345678'`, podés vincular un usuario sin reenviar `person` completo. El backend normaliza el `code` a dígitos si envías un DNI con puntos/guiones.

```bash
curl -i -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_session=<TU_COOKIE_DE_ADMIN>" \
  -d '{
    "username": "linkuser",
    "password": "linkuser-strong-1",
    "code": "12.345.678"
  }'
```

Respuesta (200):
```json
{ "ok": true, "user": { "username": "linkuser", "role": "COLLAB", "personCode": "12345678" } }
```

Notas
- `code` ya no se ingresa en el alta de persona: el sistema usa el DNI normalizado como código.
- El `dni` se normaliza a dígitos (ej.: `12.345.678` → `12345678`).
- `area` es obligatorio y debe ser uno del conjunto permitido.
- El listado `GET /api/admin/users` devuelve columnas `personCode`, `personName`, `dni`, `area`, `username`, `role`.
