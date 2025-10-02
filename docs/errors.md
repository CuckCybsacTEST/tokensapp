# API Errors

Formato unificado de errores REST/JSON.

## Formato Canonico
```json
{
  "code": "STRING_CODE",
  "message": "Mensaje legible (puede ser mismo code)",
  "details": { "opcional": "metadata adicional" }
}
```

- `code`: identificador estable (MAYÚSCULAS, snake) usado por frontend/tests.
- `message`: texto amigable (localizable). Puede omitirse y front usaría fallback por `code`.
- `details`: objeto opcional con datos diagnósticos (no poner secretos ni PII sensible). 

## Cabeceras Recomendadas
- `Content-Type: application/json; charset=utf-8`
- `Retry-After` (solo para `RATE_LIMIT` / situaciones temporales)
- `Cache-Control: no-store` en errores mutadores (evitar caches intermedios).

## Códigos Estándar (Listado Actual)
| Code | HTTP | Descripción |
|------|------|-------------|
| UNAUTHORIZED | 401 | Falta sesión o credenciales inválidas |
| FORBIDDEN | 403 | Rol/scope insuficiente |
| MUST_LOGOUT | 400 | Debe cerrar sesión antes de la acción (flujo público) |
| INVALID_CREDENTIALS | 401 | Usuario o contraseña/DNI inválidos |
| INVALID_DNI_OR_CODE | 400 | Código OTP o DNI inválido / vencido |
| NOT_FOUND | 404 | Recurso inexistente (token, premio, tarea, plantilla) |
| TEMPLATE_NOT_FOUND | 404 | Plantilla inexistente |
| TEMPLATE_FILE_NOT_FOUND | 404 | Archivo de plantilla no hallado |
| BATCH_NOT_FOUND | 404 | Lote inexistente |
| TOKEN_NOT_FOUND | 404 | Token inexistente |
| INVALID_QUERY | 400 | Query params inválidos |
| INVALID_BODY | 400 | Body inválido / errores de validación (details con campos) |
| BAD_REQUEST | 400 | Petición mal formada / parámetros inválidos |
| INVALID_JSON | 400 | JSON no parseable (legacy; usar BAD_REQUEST) |
| INVALID_LABEL | 400 | Etiqueta fuera de rango/regla |
| INVALID_AREA | 400 | Área no permitida |
| INVALID_ID | 400 | ID faltante o malformado |
| TOKEN_ID_REQUIRED | 400 | Falta tokenId en ruta |
| BATCH_ID_REQUIRED | 400 | Falta batchId (nuevo; reemplaza MISSING_BATCH_ID) |
| INVALID_MEASURE_ENABLED | 400 | Campo measureEnabled inválido |
| INVALID_TARGET_VALUE | 400 | Valor objetivo inválido |
| INVALID_UNIT_LABEL | 400 | Unidad inválida |
| UNIT_LABEL_TOO_LONG | 400 | Unidad excede longitud máxima |
| INVALID_IMAGE_TYPE | 400 | Tipo de imagen no soportado |
| INVALID_CONTENT_TYPE | 400 | Content-Type inválido (multipart esperado) |
| FILE_REQUIRED | 400 | Falta archivo obligatorio |
| NAME_REQUIRED | 400 | Falta nombre de plantilla |
| FILE_TOO_LARGE | 400 | Archivo excede límite |
| INVALID_IMAGE | 400 | Archivo no es imagen válida |
| MISSING_TEMPLATE_ID | 400 | Falta templateId |
| MISSING_FILE | 400 | Falta archivo en formulario |
| INVALID_FILE_TYPE | 400 | Tipo de archivo inválido |
| EMPTY_IDS | 400 | Lista de IDs vacía en reorder |
| SOME_IDS_NOT_FOUND | 400 | IDs inexistentes en reorder |
| AREA_MISMATCH | 400 | IDs de áreas distintas |
| INVALID_DAY | 400 | Día inválido (YYYY-MM-DD) |
| USER_WITHOUT_PERSON | 400 | Usuario sin persona asociada |
| INVALID_ITEMS_LENGTH | 400 | Demasiados items en payload |
| INVALID_EXPIRATION | 400 | Días de expiración no permitidos |
| INVALID_STOCK | 400 | Stock inválido para premio |
| NO_ACTIVE_PRIZES | 400 | No hay premios activos elegibles |
| NO_PRIZES | 400 | Lote sin premios resultantes |
| LIMIT_EXCEEDED | 400 | Límite lógico excedido (tokens, etc.) |
| AUTO_BATCH_FAILED | 500 | Fallo inesperado en generación automática |
| NO_TOKENS | 400 | No hay tokens disponibles para ruleta |
| NOT_ENOUGH_ELEMENTS | 400 | Insuficientes elementos para ruleta |
| NOT_ELIGIBLE | 400 | Condiciones de elegibilidad no cumplidas (details.reason) |
| BAD_SNAPSHOT | 500 | Snapshot de sesión corrupto o inválido |
| UNKNOWN_MODE | 500 | Modo de ruleta desconocido |
| CANCELLED | 409 | Sesión cancelada (estado conflictivo) |
| FINISHED | 409 | Sesión finalizada (no más acciones) |
| CANCEL_FAILED | 500 | Cancelación de ruleta falló |
| SPIN_FAILED | 500 | Error inesperado durante spin |
| RATE_LIMIT | 429 | Límite de frecuencia superado (details.retryAfterSeconds) |
| RACE_CONDITION | 409 | Conflicto concurrente detectable |
| ALREADY_EXISTS | 409 | Recurso / sesión duplicada ya activa |
| ALREADY_REDEEMED | 409 | Token ya canjeado (legacy una fase) |
| BAD_SIGNATURE | 409 | Firma token inválida |
| UNKNOWN_SIGNATURE_VERSION | 409 | Versión de firma desconocida |
| INACTIVE | 410 | Token/premio deshabilitado |
| EXPIRED | 410 | Token expirado |
| SYSTEM_OFF | 423 | Canje bloqueado (modo OFF) |
| TWO_PHASE_DISABLED | 409 | Flujo two-phase desactivado |
| NOT_REVEALED | 409 | Token aún no revelado |
| ALREADY_REVEALED | 409 | Token ya revelado |
| ALREADY_DELIVERED | 409 | Token ya entregado |
| NOT_DELIVERED | 409 | Token aún no entregado |
| DELIVER_FAILED | 500 | Error en entrega (two-phase) |
| REVEAL_FAILED | 500 | Error revelando token |
| REVERT_FAILED | 500 | Error revirtiendo entrega |
| DELIVER_STATE_LOST | 500 | Estado inconsistente tras entrega |
| COMPOSE_ERROR | 500 | Error al componer imagen/plantilla |
| UPLOAD_FAILED | 500 | Fallo inesperado subiendo plantilla |
| TEMPLATE_FILE_NOT_FOUND | 404 | Archivo de plantilla no hallado |
| TEMPLATE_MISSING | 500 | Plantilla no disponible en render batch |
| DB_ERROR | 500 | Error de base de datos |
| TX_FAIL | 500 | Fallo genérico en transacción |
| INTERNAL_ERROR | 500 | Excepción interna (preferido) |
| INTERNAL | 500 | Alias legado (mantener para compat) |

### Alias / Legacy / Notas
- BAD_REQUEST reemplaza casos previos de INVALID_JSON o BAD_JSON.
- INTERNAL se mantiene como alias; usar INTERNAL_ERROR para nuevos lanzamientos.
- Diferenciar:
  - TEMPLATE_NOT_FOUND: registro inexistente en DB
  - TEMPLATE_FILE_NOT_FOUND: registro existe pero archivo en FS falta
- NOT_ELIGIBLE expone `details.reason` (ej: TOO_MANY_TOKENS, NEED_AT_LEAST_2_TOKENS, NO_PRIZES) y campos adicionales (`totalTokens`, `prizes`).
- RATE_LIMIT incluye `details.retryAfterSeconds` y header `Retry-After`.
- En migración two-phase los códigos NOT_REVEALED / ALREADY_REVEALED / ALREADY_DELIVERED / NOT_DELIVERED unifican semántica.

> Mantener esta tabla en sincronía. Evitar introducir variantes de un mismo concepto (ej. INTERNAL vs INTERNAL_ERROR) salvo transición.


(Se irán añadiendo otros siguiendo la convención; evitar códigos opacos como `E123`.)

## Uso en Código
Utilizar helper `apiError(code, message?, details?, status, headers?)` de `src/lib/apiError.ts`.

Ejemplo:
```ts
if (!token) return apiError('NOT_FOUND', 'Token no encontrado', { tokenId }, 404);
```

## Migración de Formatos Legados
- Rutas que retornan `{ error: 'CODE' }` deben migrar a `apiError('CODE', ...)`.
- Durante transición opcional: devolver ambos campos (no recomendado a largo plazo). 
- Tests deben validar siempre `body.code`.

## Buenas Prácticas
- No reutilizar `code` para significados distintos.
- Evitar filtrar internals (stack traces) hacia `message`; usar logs internos para diagnóstico profundo.
- `details` solo con datos accionables (ej. `{ retryAfterSeconds: 15 }`).
- Mantener esta tabla sincronizada cuando se introduce un nuevo código.

## Próximos Pasos (Pendiente)
- Añadir linter interno (script) que busque `NextResponse.json({ error:` sin usar `apiError`.
- Internacionalización opcional de `message` (capa front) preservando `code` como clave estable.
