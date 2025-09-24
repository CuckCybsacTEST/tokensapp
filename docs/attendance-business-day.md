# Business Day Attendance Model

## Motivación
El sistema original agrupaba las marcas (IN/OUT) por día calendario UTC (`substr(scannedAt,1,10)`). Esto causaba problemas en turnos que cruzan medianoche local (América/Lima, UTC-5):
- Un colaborador que entra 23:30 local y sale 01:30 local del día siguiente era dividido en *dos* días diferentes.
- Un OUT inmediatamente después de medianoche era rechazado por "NO_IN_TODAY".

La solución: definir un **"día de trabajo" (businessDay)** con un **corte horario configurable** (por defecto 10:00 local). Todas las marcas entre las 10:00 de un día y las 09:59:59 del día siguiente pertenecen al mismo `businessDay`.

## Definición de corte
Variables de entorno relevantes:
- `ATTENDANCE_BUSINESS_DAY=1` habilita la lógica nueva (si no es "1" se usa la ruta legacy basada en día UTC, pero igual se rellena `businessDay` para continuidad de métricas).
- `ATTENDANCE_CUTOFF_HOUR=10` hora local de corte (0–23). Por defecto 10.
- `ATTENDANCE_TZ` (futuro) – hoy asumimos Lima (UTC-5) sin DST.

Interpretación: El día laboral *D* comienza a las **`D 10:00:00 -05:00`** y termina justo antes de **`(D+1) 10:00:00 -05:00`**.

## Fórmula
Asumiendo:
- `utcTs` = instante en UTC (Date ISO)
- `cutoff = H` (ej. 10)
- Offset fijo de Lima = `-5` horas (sin DST)

Convertimos el problema a una simple resta de horas en UTC:

```
shiftHours = cutoff + 5   // (cutoff hour + |UTC offset|)
shifted = utcTs - shiftHours horas
businessDay = fecha( shifted ) en formato YYYY-MM-DD (UTC)
```

Razonamiento: restar (cutoff + 5) horas "mueve" el límite local de 10:00 -05 al borde de medianoche UTC. Ejemplo con cutoff 10 → `shiftHours = 15`.

Pseudo código (función `computeBusinessDayFromUtc`):
```ts
function computeBusinessDayFromUtc(utcDate: Date, cutoffHour: number = 10): string {
  const shift = (cutoffHour + 5) * 60 * 60 * 1000; // 5 = offset absoluto Lima
  const shifted = new Date(utcDate.getTime() - shift);
  return shifted.toISOString().slice(0,10); // YYYY-MM-DD
}
```

## Ejemplos IN/OUT cruzando medianoche (cutoff 10:00 local)
| Evento | Hora UTC | Hora Local (-05) | Cálculo shifted ( -15h ) | businessDay | Comentario |
|--------|----------|------------------|--------------------------|-------------|------------|
| IN     | 2025-09-23 23:30 | 18:30 23/Sep | 2025-09-23 08:30 | 2025-09-23 | Marca inicial del turno |
| OUT    | 2025-09-24 06:59 | 01:59 24/Sep | 2025-09-23 15:59 | 2025-09-23 | Sigue mismo día laboral |
| (aún mismo día) | 2025-09-24 14:59 | 09:59 24/Sep | 2025-09-23 23:59 | 2025-09-23 | Límite final incluido |
| Corte exacto → nuevo día | 2025-09-24 15:00 | 10:00 24/Sep | 2025-09-24 00:00 | 2025-09-24 | Primera marca del siguiente businessDay |
| OUT tardío sin IN nuevo | 2025-09-24 16:10 | 11:10 24/Sep | 2025-09-24 01:10 | 2025-09-24 | Rechazado (NO_IN_TODAY) si no hubo IN post-corte |

Notas:
- El borde exacto (HH:00:00) pertenece al **nuevo** `businessDay`.
- Cualquier segundo antes (HH-1:59:59) pertenece al día anterior.

## Limitaciones actuales
1. **Un solo par IN/OUT por businessDay**: Se rechaza un segundo IN u OUT (códigos `ALREADY_TODAY`).
2. **No cierre automático**: Un IN sin OUT antes del corte no genera OUT automático.
3. **No múltiples turnos**: No se soportan split shifts (ej. IN→OUT→IN→OUT el mismo día).
4. **Offset fijo (-5)**: El código asume Lima sin DST. Cambios de zona u horario de verano requerirían parametrizar el offset dinámico.
5. **Backfill ya ejecutado**: Todas las filas históricas poseen `businessDay`. Legacy sólo se usa como fallback lógico, no para datos nuevos (igual seguimos grabando `businessDay`).
6. **Secuencia estricta**: OUT exige IN del mismo `businessDay`; no busca IN del día anterior.
7. **Sin tolerancia por reloj desincronizado**: Se confía en el tiempo del servidor (no se ajusta por latencia de dispositivo).

## Roadmap (multi-shift, autocierre, otros)
| Feature | Descripción | Estado | Consideraciones |
|---------|-------------|--------|-----------------|
| Multi-shift | Permitir varios pares IN/OUT por businessDay | Pendiente | Requiere modelo: secuencias numeradas y validación de pares incompletos |
| Autocierre | Generar OUT automático al llegar al corte si existe IN sin OUT | Pendiente | Cron / job al minuto del corte; definir regla de duración máxima |
| Migración NOT NULL | Enforzar `Scan.businessDay NOT NULL` | Pendiente | Seguro tras confirmar no hay registros vacíos (ya backfilled) |
| Timezone configurable | `ATTENDANCE_TZ` (ej. America/Lima) con cálculo dinámico de offset | Pendiente | Evitar errores si algún día se aplica DST |
| Métricas de anomalías | Detectar turnos > X horas o OUT faltante | Pendiente | Complemento para autocierre |
| UI de historial por businessDay | Mostrar agrupación y duración total | Pendiente | Base de datos ya preparada |
| Auditoría ampliada | Guardar deviceId y localización | Parcial | `deviceId` existe; falta enriquecimiento |

## Rollback rápido
- **Activar** lógica business day: `ATTENDANCE_BUSINESS_DAY=1`.
- **Legacy** (UTC day): remover variable o usar cualquier valor ≠ '1'. (Se seguirá rellenando `businessDay` por consistencia de métricas.)

## Testing
- `attendanceDay.test.ts` valida la función de cálculo con varios bordes.
- `attendanceFlow.test.ts` cubre IN tarde + OUT post medianoche + OUT tardía sin nuevo IN (NO_IN_TODAY).
- Se recomienda añadir un test adicional exacto al corte (HH:00:00) y uno a HH:00:01.

## Observabilidad sugerida
- Contar marcas rechazadas por `NO_IN_TODAY` y `SCAN_OUT_WITHOUT_IN` para detectar patrones incorrectos de uso.
- Alertar si porcentaje de OUT faltantes antes del corte supera cierto umbral.

## Resumen
La introducción de `businessDay` elimina el quiebre artificial en medianoche y alinea la lógica de asistencia con la realidad operativa de turnos que continúan después de las 00:00. El flag de compatibilidad permite revertir rápidamente mientras se ganan datos y confianza antes de evolucionar a multi-shift y autocierre.
