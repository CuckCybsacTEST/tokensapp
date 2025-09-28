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
