# Sistema Go Lounge! Jukebox - Documentación Técnica

## Descripción General

El sistema Go Lounge! Jukebox permite a los clientes solicitar canciones al DJ a través de un código QR. Soporta pedidos gratuitos, premium y VIP con diferentes prioridades en la cola.

## Componentes del Sistema

### 1. Modelos de Base de Datos (Prisma)

#### MusicOrder
Almacena los pedidos musicales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | ID único |
| requesterName | String | Nombre del cliente |
| whatsapp | String? | Número de WhatsApp (opcional) |
| songTitle | String | Título de la canción |
| artist | String | Nombre del artista |
| spotifyId | String? | ID de Spotify |
| spotifyUri | String? | URI para reproducir en Spotify |
| albumName | String? | Nombre del álbum |
| albumImage | String? | URL de la imagen del álbum |
| duration | Int? | Duración en segundos |
| previewUrl | String? | URL de preview de 30 segundos |
| orderType | MusicOrderType | FREE, PREMIUM o VIP |
| status | MusicOrderStatus | Estado actual del pedido |
| priority | Int | Prioridad (VIP=100, PREMIUM=50, FREE=0) |
| queuePosition | Int? | Posición en la cola |
| playedAt | DateTime? | Fecha/hora de reproducción |
| playedBy | String? | DJ que reprodujo la canción |
| rejectedReason | String? | Razón de rechazo |
| djNotes | String? | Notas del DJ |
| flagged | Boolean | Si está marcado para revisión |
| flaggedReason | String? | Razón del flag |
| deviceFingerprint | String? | Identificador del dispositivo |
| ipAddress | String? | Dirección IP |
| tableId | String? | Mesa del cliente |
| servicePointId | String? | Punto de servicio |

#### MusicRateLimit
Control de rate limiting por usuario/dispositivo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| identifier | String | IP:deviceFingerprint |
| requestCount | Int | Total de pedidos |
| freeCount | Int | Pedidos gratuitos |
| premiumCount | Int | Pedidos premium |
| windowStart | DateTime | Inicio de la ventana |
| lastRequestAt | DateTime | Último pedido |

#### MusicSystemConfig
Configuración global del sistema.

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| systemEnabled | Boolean | true | Sistema activo |
| qrEnabled | Boolean | true | QR activo |
| premiumPrice | Float | 5.0 | Precio premium (S/) |
| vipPrice | Float | 10.0 | Precio VIP (S/) |
| freeLimitPerHour | Int | 3 | Límite gratuitos/hora |
| premiumLimitPerHour | Int | 10 | Límite premium/hora |
| tableLimitPerHour | Int | 5 | Límite por mesa/hora |
| cooldownMinutes | Int | 5 | Tiempo entre pedidos |
| captchaThreshold | Int | 2 | Umbral para captcha |
| duplicateSongHours | Int | 2 | Bloqueo de duplicados |
| peakHourMultiplier | Float | 1.5 | Multiplicador en hora pico |
| peakHourStart | Int | 22 | Inicio hora pico (22:00) |
| peakHourEnd | Int | 2 | Fin hora pico (02:00) |
| blockedArtists | String[] | [] | Artistas bloqueados |
| blockedSongs | String[] | [] | Canciones bloqueadas |

#### MusicBlockedUser
Usuarios bloqueados del sistema.

### 2. APIs

#### Pedidos Musicales
- `GET /api/music-orders` - Listar pedidos (con filtros)
- `POST /api/music-orders` - Crear nuevo pedido
- `GET /api/music-orders/[id]` - Obtener pedido específico
- `PATCH /api/music-orders/[id]` - Actualizar estado
- `DELETE /api/music-orders/[id]` - Eliminar pedido
- `GET /api/music-orders/queue` - Estado de la cola

#### Spotify
- `GET /api/spotify/search?q=query` - Buscar canciones

#### Administración
- `GET /api/admin/music-system/config` - Obtener config
- `PATCH /api/admin/music-system/config` - Actualizar config
- `GET /api/admin/music-system/blocked-users` - Listar bloqueados
- `POST /api/admin/music-system/blocked-users` - Bloquear usuario
- `DELETE /api/admin/music-system/blocked-users/[id]` - Desbloquear
- `GET /api/admin/music-system/stats` - Estadísticas

### 3. Interfaces de Usuario

#### Página de Cliente (`/music-request`)
- Accesible vía QR
- Búsqueda de canciones en Spotify
- Selección de tipo de pedido (FREE/PREMIUM/VIP)
- Vista de posición en cola
- Preview de audio

#### Consola DJ (`/dj/console`)
- Vista de cola en tiempo real
- Aprobar/Rechazar pedidos
- Marcar como reproduciendo
- Notas y flags
- Preview de canciones
- Reordenamiento de cola

#### Panel Admin (`/admin/music-orders`)
- Configuración del sistema
- Gestión de usuarios bloqueados
- Artistas/canciones prohibidas
- Estadísticas y métricas
- Control de precios

### 4. Sistema de Rate Limiting

El middleware de rate limiting (`src/lib/music-rate-limit.ts`) controla:

1. **Límites por hora**: FREE/PREMIUM tienen límites diferentes
2. **Cooldown**: Tiempo mínimo entre pedidos
3. **Límites por mesa**: Evita spam desde una ubicación
4. **Detección de abuso**: Patrones sospechosos
5. **Captcha**: Se activa tras múltiples pedidos anónimos
6. **Duplicados**: Bloquea misma canción en X horas

### 5. Sistema de Prioridades

| Tipo | Prioridad | Comportamiento |
|------|-----------|----------------|
| VIP | 100 | Salta al frente de la cola |
| PREMIUM | 50 | Prioridad alta |
| FREE | 0 | Cola normal (requiere aprobación) |

### 6. Estados del Pedido

```
PENDING → APPROVED → QUEUED → PLAYING → PLAYED
    ↓                    ↓
REJECTED            CANCELLED
```

- **PENDING**: Pedido recibido, esperando aprobación (solo FREE)
- **APPROVED**: Aprobado por el DJ
- **QUEUED**: En cola de reproducción
- **PLAYING**: Reproduciéndose actualmente
- **PLAYED**: Completado
- **REJECTED**: Rechazado
- **CANCELLED**: Cancelado

### 7. Eventos Socket.IO

- `new-music-order` - Nuevo pedido recibido
- `music-order-status-update` - Cambio de estado
- `music-queue-update` - Actualización de cola

## Variables de Entorno Requeridas

```env
# Spotify API (opcional pero recomendado)
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
```

Para obtener credenciales de Spotify:
1. Ir a https://developer.spotify.com/dashboard
2. Crear una aplicación
3. Copiar Client ID y Client Secret

## Flujo del Usuario

1. Cliente escanea QR → `/music-request?table=ID`
2. Busca canción (Spotify o manual)
3. Selecciona tipo (FREE/PREMIUM/VIP)
4. Ingresa nombre y opcionalmente WhatsApp
5. Envía pedido
6. Ve posición en cola y estado
7. Recibe notificación cuando se reproduce

## Flujo del DJ

1. Accede a `/dj/console`
2. Ve pedidos pendientes (FREE requieren aprobación)
3. Aprueba/Rechaza pedidos
4. Reordena cola si es necesario
5. Marca canción como "Reproduciendo"
6. Marca como "Reproducida" al terminar

## Consideraciones de Seguridad

- Rate limiting por IP y fingerprint
- Bloqueo de usuarios abusivos
- Validación de contenido
- Captcha tras múltiples pedidos anónimos
- Lista negra de artistas/canciones

## Mantenimiento

### Limpiar pedidos antiguos
Los pedidos se mantienen por 24 horas. Implementar job de limpieza si es necesario.

### Monitoreo
- Revisar usuarios bloqueados periódicamente
- Ajustar límites según demanda
- Revisar estadísticas diarias

## Troubleshooting

### "Error al buscar canciones"
- Verificar credenciales de Spotify
- Verificar conectividad

### "Límite alcanzado"
- El usuario alcanzó su límite por hora
- Esperar o comprar PREMIUM/VIP

### "Canción ya pedida"
- La canción fue pedida recientemente
- Configurar `duplicateSongHours` en admin
