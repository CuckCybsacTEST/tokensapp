## Tokens Scheduler (Option B – Boundary Enforcement)

Controla `tokensEnabled` aplicando flips sólo en los límites horarios y respetando overrides manuales entre ellos.

### Ventana programada
| Hora (local TZ `TOKENS_TIMEZONE`, default `America/Lima`) | Acción programada |
|-----------------------------------------------------------|--------------------|
| 18:00 (inclusive) → 23:59 | Forzar ON (si estaba OFF) |
| 00:00 (medianoche) | Forzar OFF |

Entre esos límites NO se altera el valor manualmente establecido por un admin.

### Overrides manuales
| Escenario | Resultado |
|-----------|-----------|
| Admin enciende 02:00 | Permanece ON hasta 00:00 siguiente (aunque 02:00–17:59 sea tramo programado OFF) |
| Admin apaga 20:30 | Permanece OFF hasta 00:00 (aunque 18:00–00:00 sea tramo programado ON) |

### Estados expuestos
- `tokensEnabled`: estado efectivo persistido en DB (aplica gating real de canje).
- `scheduledEnabled`: cálculo informativo (`computeTokensEnabled`) para UI / métricas.

### Motivos de diseño
1. Minimiza “flapping”: no se toca un override hasta un boundary.
2. Ofrece ventana operativa predecible (18:00–00:00) sin impedir operación excepcional.
3. Simplicidad mental: solo dos cron flips; resto del día es libre de interferencias automáticas.

### Riesgos de override temprano
- Ampliar ventana operativa sin intención → consumir stock antes de hora.
- Activación accidental nocturna (02:00) pasa desapercibida si no hay alertas.

Mitigaciones (no implementadas, ideas futuras):
- Confirmación doble si hora < 16:00.
- Auto‑revert tras N horas fuera de ventana.
- Banner UI cuando `tokensEnabled=true` y `scheduledEnabled=false`.
- Evento específico `TOKENS_OVERRIDE_OUT_OF_WINDOW` para monitoreo.

### Integración
```ts
import { startScheduler } from '@/lib/scheduler';
startScheduler(); // Llamar una vez en el bootstrap del servidor
```

Requiere dependencias ya listadas en `package.json` (`node-cron`, `luxon`). Si `node-cron` no está instalado: se realiza sólo una reconciliación informativa.

### Logging
- En modo actual el heartbeat por minuto sólo se emite con `LOG_LEVEL=debug`.
- Eventos clave (`enforce on/off`, expiración birthdays) se registran en `info`.
- Ajustar `LOG_LEVEL` para controlar volumen (`error|warn|info|debug`).

### Extensión futura
- Añadir métricas Prometheus (counter flips, overrides activos, backlog tokens). 
- Endpoint de “dry-run” para ver próximos toggles y efectos si se aplica auto‑revert.

### Resumen rápido
| Concepto | Regla |
|----------|-------|
| Enforce ON | 18:00 |
| Enforce OFF | 00:00 |
| Override early ON | Dura hasta 00:00 |
| Override off dentro ventana | Dura hasta 00:00 |
| Heartbeat | Solo `debug` |

El diseño prioriza predecibilidad + flexibilidad controlada.

### Ventanas horarias por lote (singleHour)

Se añadió soporte a generación automática de lotes con una ventana horaria específica (`mode: singleHour` en `/api/batch/generate-all`).

Campos relevantes:
- `Token.validFrom` (nullable): inicio de la ventana. Si existe y es futuro, el token se crea `disabled=true`.
- `Token.expiresAt`: fin de la ventana. Expiración tradicional.
- Manifest meta incluye: `windowStartIso`, `windowEndIso`, `windowDurationMinutes`, `windowMode: 'hour'`.

Flujo:
1. Generación singleHour calcula `validFrom` y `expiresAt` según `date + hour` y `durationMinutes`.
2. Si la ventana es futura: tokens quedan `disabled=true`.
3. Scheduler (job minucioso) habilita automáticamente tokens cuya hora llegó (`validFrom <= now < expiresAt`).
4. Redeem bloquea canje temprano (`TOO_EARLY`) si `validFrom` no ha llegado.

Endpoint auxiliar manual: `POST /api/system/tokens/enable-hourly` (ADMIN/STAFF) para forzar habilitación inmediata de todos los tokens con `validFrom` alcanzado que sigan `disabled=true`.

Consideraciones:
- No se requiere `validFrom` para modos legacy; permanece null.
- Si el servidor corre en timezone distinto a Lima, el cálculo base usa la fecha Lima pero el ajuste final se hace en UTC; ligeras diferencias de segundos no afectan la ventana.
- Límite de duración: 5 a 720 minutos.

Ejemplo de payload:
```json
{ "mode": "singleHour", "date": "2025-10-05", "hour": "21:00", "durationMinutes": 90, "includeQr": true }
```

Respuesta ZIP manifest (fragmento):
```jsonc
{
	"meta": {
		"mode": "auto",
		"windowMode": "hour",
		"windowStartIso": "2025-10-06T02:00:00.000Z",
		"windowEndIso": "2025-10-06T03:30:00.000Z",
		"windowDurationMinutes": 90
	}
}
```
