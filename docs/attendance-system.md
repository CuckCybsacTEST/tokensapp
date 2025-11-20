# Sistema de Asistencia (Attendance System)

Este documento describe el sistema completo de asistencia de Go Lounge, incluyendo el modelo de día de negocio, componentes del escáner y flujo de registro IN/OUT.

## 📅 Modelo de Día de Negocio (Business Day)

### Motivación
El sistema agrupa marcas (IN/OUT) por "día de trabajo" (businessDay) con corte horario configurable para manejar turnos que cruzan medianoche.

### Definición de Corte
Variables de entorno:
- `ATTENDANCE_BUSINESS_DAY=1`: Habilita lógica desplazada
- `ATTENDANCE_CUTOFF_HOUR=14`: Hora de inicio de jornada (actual: 14:00)
- `ATTENDANCE_TZ`: Planeado (actualmente offset fijo Lima UTC-5)

### Escenario Actual (Discoteca 14:00→14:00)
- Ventana: `D 14:00` → `(D+1) 13:59:59.999`
- Cualquier OUT después de `(D+1) 14:00` pertenece al businessDay siguiente

### Fórmula de Cálculo
```ts
function computeBusinessDayFromUtc(utcDate: Date, cutoffHour: number = 14): string {
  const shift = (cutoffHour + 5) * 60 * 60 * 1000; // 5 = offset Lima
  const shifted = new Date(utcDate.getTime() - shift);
  return shifted.toISOString().slice(0,10); // YYYY-MM-DD
}
```

### Ejemplos con Corte 14:00
| Evento | Hora Local | businessDay | Comentario |
|--------|------------|-------------|------------|
| IN | 2025-09-23 15:10 | 2025-09-23 | Dentro ventana |
| OUT | 2025-09-24 01:40 | 2025-09-23 | Cruza medianoche |
| Corte | 2025-09-24 14:00 | 2025-09-24 | Nueva jornada |

### Limitaciones
1. Un solo par IN/OUT por businessDay
2. No cierre automático
3. No múltiples turnos
4. Offset fijo (-5 horas)

### Scripts de Soporte
- `scripts/recompute-business-day.ts`: Recalcular tras cambiar cutoff
- `scripts/backfill-business-day.ts`: Backfill inicial (legacy)

## 📱 Componentes del Escáner

### `parseInOut` (Utilidad)
Ubicación: `src/lib/attendance/parseInOut.ts`

Responsabilidad: Normalizar códigos QR a modo IN/OUT.

Formatos soportados:
- Texto plano: `IN` / `OUT`
- JSON: `{ "kind":"GLOBAL", "mode":"IN" }`
- Base64URL JSON
- URL: `?mode=IN|OUT`
- Texto con `GLOBAL` + IN/OUT

Contrato:
```ts
{
  mode: 'IN' | 'OUT' | null;
  source?: string;
}
```

### `PendingRegistrationCard` (Componente)
Ubicación: `src/components/attendance/PendingRegistrationCard.tsx`

Props:
| Prop | Tipo | Descripción |
|------|------|-------------|
| `mode` | `'IN'|'OUT'` | Paleta y textos |
| `pendingTooLong` | `boolean` | Muestra botones retry/cancel |
| `onRetry` | `() => void` | Reintentar operación |
| `onCancel` | `() => void` | Cancelar operación |

## 🔄 Flujo de Escaneo (`/u/assistance`)

### Arquitectura
1. **Cámara + Detección**: `BarcodeDetector` nativo → fallback `@zxing/browser`
2. **Bucle de Escaneo**: `requestAnimationFrame` delega a `handleRawCandidate`
3. **Validación**: `parseInOut` → validar expectedMode → debounce
4. **Registro**: `doRegister()` con feedback optimista

### Estados de UI
- Normal (escaneando)
- Pendiente (optimista)
- Confirmación entrada/salida

### Control de Concurrencia
- `scanningRef`: Pausa detección durante registro
- `AbortController`: Cancela fetchs obsoletos
- Timeout 4s: Activa UI retry/cancel

### Feedback de Usuario
- **Audio**: OK diferente a WARN
- **Vibración**: 20ms (IN), 30ms (OUT)
- **Visual**: Spinner + barra pulsante

### Silenciamiento de Errores
- `DUPLICATE` / `ALREADY_TODAY`: Sin feedback (reduce ruido)
- Otros errores: Audio WARN + flash + mensaje

## 🧪 Testing

### Tests Recomendados
- `parseInOut.test.ts`: Todos los formatos de entrada
- `attendanceDay.test.ts`: Función de cálculo con bordes
- `attendanceFlow.test.ts`: IN tarde + OUT post medianoche
- Simulación timeout >4s

## 🔮 Roadmap

### Business Day
- Multi-shift (varios IN/OUT por día)
- Autocierre al llegar al corte
- Timezone configurable
- Métricas de anomalías

### Escáner
- WebWorker para decodificación QR
- Conteo de reintentos
- Métrica RTT
- Modo multi-shift

## 📊 Observabilidad
- Contar rechazos `NO_IN_TODAY` y `SCAN_OUT_WITHOUT_IN`
- Alertar si porcentaje OUT faltantes > umbral