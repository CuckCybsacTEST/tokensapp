## Attendance Scanner Components

Este documento describe los elementos reutilizables y utilidades introducidos para el flujo de asistencia (escáner y página manual).

### `parseInOut`
Ubicación: `src/lib/attendance/parseInOut.ts`

Responsabilidad:
- Normaliza y detecta el modo (IN / OUT) a partir de múltiples formatos de códigos:
  - Texto plano: `IN` / `OUT`
  - JSON directo: `{ "kind":"GLOBAL", "mode":"IN" }`
  - JSON en base64url
  - URL con `?mode=IN|OUT`
  - Texto que comience con `GLOBAL` y contenga `IN` u `OUT` (con fallback si ambiguo)

Contrato rápido:
- Entrada: `rawInput: string`, `fallbackMode: 'IN'|'OUT'`
- Salida: `{ mode: 'IN' | 'OUT' | null; source?: string }`
- Nunca lanza excepción (atrapa parseos inválidos).

Casos de uso:
- Escáner (`/u/assistance`)
- Futuras páginas o scripts que acepten códigos mixtos.

### `PendingRegistrationCard`
Ubicación: `src/components/attendance/PendingRegistrationCard.tsx`

Responsabilidad:
- Presentar un estado de "procesando" reutilizable mientras se confirma una marca de entrada o salida.
- Muestra feedback optimista continuo y, si el request tarda demasiado, ofrece acciones de `Reintentar` y `Cancelar`.

Props:
| Prop | Tipo | Descripción |
|------|------|-------------|
| `mode` | `'IN' | 'OUT'` | Ajusta paleta (verde para IN, índigo para OUT) y texto principal. |
| `pendingTooLong` | `boolean` | Activa la UI secundaria (botones) cuando el backend excede el umbral de tiempo. |
| `onRetry` | `() => void` | Handler para reintentar (resetea estado + relanza escaneo / request). |
| `onCancel` | `() => void` | Cancela la operación y devuelve el flujo a espera. |

Decisiones de diseño:
- Separado para evitar duplicar markup entre IN y OUT y permitir introducir nuevos modos (BREAK, LUNCH) con mínima fricción.
- Colores desacoplados en objeto `palette` para futuras extensiones.
- Sin dependencia directa de estados globales (todo pasa por props). Facilita pruebas unitarias visuales y storybook más adelante.

### Flujo de tiempo excedido
El escáner activa un timeout (4s) y setea `pendingTooLong=true` si no hay respuesta. De esa forma el componente muestra los botones de control sin acoplarse a lógica de red.

### Vibración (UX móvil)
La vibración se dispara al iniciar el registro (fuera del componente) para mantener este puramente presentacional.

### Futuras mejoras sugeridas
- Storybook / visual regression para el componente.
- Prop `progress` (0..1) si se introduce un backend con streaming/progreso.
- Animación diferente para modo OUT (e.g. borde pulsante) para reforzar que es salida.

### Ejemplo mínimo de uso
```tsx
<PendingRegistrationCard
  mode="IN"
  pendingTooLong={pendingTooLong}
  onRetry={handleRetry}
  onCancel={handleCancel}
/>
```

---
Última actualización: (auto) generar documentación inicial tras refactor de escáner.

# Escáner de Asistencia (IN / OUT)

> Última actualización: extracción del componente `PendingRegistrationCard` y util `parseInOut` (flujo optimista + abort + timeout).

## Objetivo
Proveer una experiencia de escaneo rápida y tolerante a latencia para registrar ENTRADA (IN) y SALIDA (OUT) minimizando fricción visual y evitando flashes de error innecesarios (p.ej. duplicados).

## Arquitectura de la Página (`/u/assistance`)

Capas principales:
1. Cámara + detección QR
   - `BarcodeDetector` nativo cuando está disponible.
   - Fallback `@zxing/browser` si el API no existe.
2. Bucle de escaneo (`requestAnimationFrame`) que delega el texto detectado a `handleRawCandidate`.
3. Lógica de validación / parseo del código: util pura `parseInOut`.
4. Registro optimista (`doRegister`): emite feedback inmediato (sonido / vibración / flash condicional) y luego confirma con backend.
5. UI de estados: normal, pendiente (optimista), confirmación de entrada, confirmación de salida.
6. Control fino de concurrencia / red: `AbortController` para cancelar fetchs obsoletos (usuario abandona, reintenta, etc.).
7. Timeout de percepción: si la confirmación tarda > 4s se habilita UI de "Reintentar" / "Cancelar".

## Flujo Básico
```
detectar QR → parseInOut → validar expectedMode → debounce → doRegister()
  doRegister():
    - pausar detecciones (scanningRef)
    - feedback optimista inmediato (audio + vibración + (flash sólo OUT))
    - iniciar timeout visual (4s)
    - fetch POST /api/attendance/mark (abort previo si había uno en vuelo)
      - ok => fetchRecent() y mostrar tarjeta resultante (entrada/salida)
      - error "silencioso" (DUPLICATE / ALREADY_TODAY) => nada
      - error con mensaje => audioWarn + flash WARN + mensaje amigable
    - limpiar timeout + restaurar estados
```

## `parseInOut` (Util Reutilizable)
Archivo: `src/lib/attendance/parseInOut.ts`

Responsabilidad: convertir un string escaneado en `{ mode: 'IN'|'OUT'|null, source }` sin efectos secundarios.

Formatos soportados:
- Texto plano: `IN`, `OUT`.
- JSON directo: `{"kind":"GLOBAL","mode":"IN"}`.
- Base64URL JSON del bloque anterior.
- URL con query `?mode=IN|OUT`.
- Texto prefijado `GLOBAL...` que contenga exactamente uno de IN / OUT (o ambos → fallback).

Ambigüedad: si aparecen ambas (`GLOBAL ... IN ... OUT`) se usa `fallbackMode` (calculado como el siguiente modo esperado).

Razonamiento: centralizar y mantener pureza → fácil test unitario y reutilización en un eventual flujo manual u otros lectores de código.

## `PendingRegistrationCard`
Archivo: `src/components/attendance/PendingRegistrationCard.tsx`

Componente visual reutilizable para el estado “procesando” tanto de ENTRADA como SALIDA.

Props:
| Prop | Tipo | Descripción |
|------|------|-------------|
| `mode` | `'IN'|'OUT'` | Selecciona paleta (verde = IN, índigo = OUT) y textos |
| `pendingTooLong` | `boolean` | Activa texto alterno y botones si true |
| `onRetry` | `() => void` | Handler para reintentar (resetea estado externo) |
| `onCancel` | `() => void` | Handler para cancelar la operación en curso |

Uso en la página: se renderiza mientras `pendingMode` no es null y no existe confirmación final.

### Decisiones de Diseño
- Tarjeta separada facilita test visual y futura expansión (ej. agregar métrica de segundos transcurridos) sin inflar la página.
- El mismo componente sirve para nuevos modos (ej. BREAK) añadiendo una entrada de paleta.
- Mantiene animación de spinner y barra pulsante ligera para no “parpadear” al usuario.

## Control de Escaneo: `scanningRef`
En vez de desactivar la cámara, se usa un flag `scanningRef.current=false` al iniciar registro y se vuelve a `true` cuando el flujo permite procesar nuevos QR. Ventajas:
- Evita overhead de reinicializar `getUserMedia`.
- Conserva la animación del marco sin mostrar congelación abrupta.

## Abort Controllers
Refs: `markControllerRef`, `recentControllerRef`, `meControllerRef`.

Motivación: en móviles con latencia, un segundo QR cargado inmediatamente tras el primero podría dejar fetchs obsoletos; abortarlos evita condiciones de carrera y mensajes tardíos.

## Timeout de Percepción
`pendingTimerRef` → 4000 ms. Si se dispara: `pendingTooLong=true` y la tarjeta muestra acciones.

Estrategia usuario:
- Reintentar: aborta fetch actual y permite reescaneo inmediato.
- Cancelar: aborta y muestra mensaje “Cancelado.” (no ruido sonoro adicional).

## Silenciamiento de Duplicados
Errores `DUPLICATE` / `ALREADY_TODAY` no generan flash amarillo ni mensaje → reduce ruido operativo.

## Accesibilidad / Feedback
- Audio OK diferente al WARN.
- Vibración ligera (20 ms IN, 30 ms OUT) si `navigator.vibrate` existe.
- Animaciones moderadas (< 650 ms) para evitar cansancio visual.

## Extensiones Futuras
| Idea | Descripción | Impacto |
|------|-------------|---------|
| WebWorker + OffscreenCanvas | Decodificar QR fuera del hilo principal | Mejor FPS en dispositivos lentos |
| Conteo de reintentos | Registrar cuántas veces se reintenta (telemetría) | Detectar problemas de red |
| Métrica de RTT | Medir duración entre feedback optimista y confirmación real | Ajustar timeout adaptativo |
| Modo multi-shift | Nuevos modos (BREAK, LUNCH) usando mismo pipeline | Escalabilidad semántica |

## Test Sugeridos
1. `parseInOut.test.ts`
   - Plain IN/OUT
   - JSON válido / JSON inválido
   - Base64URL válido
   - URL con ?mode=
   - GLOBAL ambiguo (IN y OUT) usando fallback
2. Simulación de timeout: forzar retraso >4s y validar aparición de botones.
3. Verificar que al cancelar se reanuda escaneo (scanningRef = true).

## Resumen
La extracción de `parseInOut` y `PendingRegistrationCard` aisla lógica y presentación, habilitando pruebas unitarias y evoluciones (nuevos modos, workers) sin tocar la base del flujo de asistencia.
