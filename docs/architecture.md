# 🏗️ Arquitectura del Sistema Go Lounge

Go Lounge es una plataforma integral para experiencias digitales en un venue, incluyendo tokens QR, premios, ruleta, cumpleaños, menú digital, inventario, pedidos, trivia, shows, tickets y gestión de asistencia. Esta documentación describe la arquitectura completa del sistema.

## Diagrama de Componentes General

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       🖥️ CLIENTE (Navegador)                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Menú      │  │  Tokens/QR  │  │ Cumpleaños  │  │   Trivia    │  │   Shows     │  │  Admin   │ │
│  │ (/menu)     │  │ (/r/*)      │  │ (/cumple*)  │  │ (/trivia)   │  │ (/shows)    │  │ (/admin) │ │
│  │ • Productos │  │ • Canje     │  │ • Reservas  │  │ • Sesiones  │  │ • Tickets   │  │ • Paneles │ │
│  │ • Carrito   │  │ • Ruleta    │  │ • Invites   │  │ • Preguntas │  │ • Compras   │  │ • Gestión │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │   Staff     │  │   Asistencia│  │   Ofertas   │  │   Inventario │  │  Socket.IO  │               │
│  │ (/u/*)      │  │ (/scanner)  │  │ (/offers)   │  │ (/inventory) │  │   Client    │               │
│  │ • Dashboard │  │ • Escaneo   │  │ • Temporales│  │ • Productos  │  │ • Real-time │               │
│  │ • Control   │  │ • Checklists│  │ • Promos    │  │ • Proveedores│  │ • Notifs    │               │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ HTTP/WebSocket
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  🚀 NEXT.JS SERVER (Puerto 3000)                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │ API Routes  │  │ Socket.IO   │  │ Scheduler  │  │ Auth/MW    │  │ File Upload │  │ PWA/SW  │ │
│  │ (/api/*)    │  │ Server      │  │ (Tokens)   │  │            │  │            │  │         │ │
│  │ • Tokens    │  │ • Rooms     │  │ • Cron     │  │ • Sessions  │  │ • Images    │  │ • Cache  │ │
│  │ • Orders    │  │ • Events    │  │ • Expiry   │  │ • Roles     │  │ • QR Codes  │  │ • Offline│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Prisma Client
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   🗄️ POSTGRESQL DATABASE (50+ Modelos)                           │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Tokens    │  │   Orders    │  │ Cumpleaños │  │   Trivia    │  │   Shows     │  │  Users   │ │
│  │ • Prize     │  │ • Products  │  │ • Reservas │  │ • Questions │  │ • Tickets   │  │ • Roles  │ │
│  │ • Batch     │  │ • Inventory │  │ • Invites  │  │ • Sessions  │  │ • Purchases │  │ • Auth   │ │
│  │ • Roulette  │  │ • Staff     │  │ • Referrers│  │ • Prizes    │  │ • Packages  │  │ • Audit  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│  │ Asistencia  │  │   Ofertas   │  │   Tasks     │  │   Events    │  │   Config    │               │
│  │ • Scans     │  │ • Discounts │  │ • Checklists│  │ • Logs      │  │ • System    │               │
│  │ • Persons   │  │ • Schedules │  │ • Progress  │  │ • Metrics   │  │ • Settings  │               │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos - Sistema de Tokens/QR

```
1. Admin/Staff activa tokens → POST /api/system/tokens/toggle
2. Usuario escanea QR → GET /r/[tokenId]
3. Validación: Firma HMAC, expiración, estado ON, no canjeado
4. Si válido: Canje, asigna premio, audita
5. Ruleta opcional: POST /api/roulette/spin → Selecciona premio aleatorio
6. UI actualiza estado en tiempo real
```

## Flujo de Datos - Nuevo Pedido (Menú)

```
1. Cliente escanea QR → Ingresa a /menu?table=01
2. GET /api/menu/categories → Carga productos
3. Cliente selecciona items → Carrito local (useState)
4. Cliente confirma pedido → POST /api/orders
   ├── Validación de mesa activa
   ├── Verificación de productos disponibles
   ├── Cálculo de totales
   └── Creación en BD (transacción)
5. Socket.IO emite "new-order" → Staff dashboard
6. Staff recibe notificación → Actualiza estado
7. Cliente recibe confirmación → Muestra estado
```

## Flujo de Datos - Reserva de Cumpleaños

```
1. Cliente reserva → POST /api/birthdays/reservations
2. Validación: Fecha, capacidad, pago (Culqi)
3. Genera tokens de invitación → InviteToken
4. Envía QR a invitados → /r/[inviteTokenId]
5. Host llega: Escanea, activa tokens
6. Invitados canjean: Validación, expiración
```

## Flujo de Datos - Trivia

```
1. Usuario inicia trivia → POST /api/trivia/sessions
2. Carga preguntas → GET /api/trivia/questions
3. Responde → POST /api/trivia/progress
4. Completa: Asigna premio → TriviaPrize
5. Canje QR → /r/[prizeTokenId]
```

## Estados del Pedido

```
PENDING ──────▶ CONFIRMED ──────▶ PREPARING ──────▶ READY ──────▶ DELIVERED
     │               │                │               │              │
     │               │                │               │              │
     └───────────────┴────────────────┴───────────────┴──────────────┴─▶ CANCELLED
```

## Estados de Tokens

```
GENERATED ──────▶ ACTIVE ──────▶ REVEALED ──────▶ REDEEMED
     │               │              │               │
     │               │              │               │
     └───────────────┴──────────────┴───────────────┴─▶ EXPIRED/DISABLED
```

## Eventos Socket.IO

### Canales (Rooms)
- `table-{tableId}`: Comunicación con mesa específica
- `staff-{staffId}`: Comunicación con staff individual
- `cashier`: Comunicación con caja
- `waiter-{waiterId}`: Comunicación con mozo específico
- `order-{orderId}`: Actualizaciones de pedido específico
- `token-{tokenId}`: Estado de token (futuro)

### Eventos Principales
```
Cliente → Servidor:
├── join-table: Unirse a sala de mesa
├── join-staff: Unirse como staff
├── new-order: Nuevo pedido creado
├── token-redeem: Token canjeado
├── birthday-arrival: Llegada a cumpleaños

Servidor → Cliente:
├── new-order: Notificar nuevo pedido a staff
├── order-status-update: Actualizar estado del pedido
├── order-confirmed: Pedido confirmado
├── order-ready: Pedido listo para servir
├── token-status-update: Estado de token cambiado
├── birthday-notification: Notificación de cumpleaños
```

## Seguridad y Validaciones

```
┌─────────────────────────────────────────────────────────────┐
│                    🛡️ CAPAS DE SEGURIDAD                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ Sanitización de inputs (cliente)                        │
│  ✅ Validación TypeScript (tiempo de desarrollo)            │
│  ✅ Validación de API (servidor)                            │
│  ✅ Verificación de mesas activas (menú)                    │
│  ✅ Control de productos disponibles (inventario)           │
│  ✅ Validación de firmas HMAC (tokens)                      │
│  ✅ Rate limiting básico                                     │
│  ✅ Autenticación staff/admin (sesiones)                    │
│  ✅ Auditoría de cambios (tokens, pedidos)                  │
│  ✅ Expiración automática (tokens, invites)                 │
│  ✅ Control de acceso por roles (ADMIN, STAFF, COLLAB)      │
│  ✅ Logs de auditoría y eventos                             │
└─────────────────────────────────────────────────────────────┘
```

### Autenticación y Roles
- **Sesiones**: Admin (cookies `admin_session`), User BYOD (`user_session`).
- **Roles**: ADMIN (full access), STAFF (control tokens, pedidos), COLLAB (limitado).
- **Middleware**: Protege rutas `/admin/*`, `/u/*`, APIs críticas.
- **Permisos Granulares**: Basado en roles, áreas (e.g., STAFF puede alternar tokens sin restricción de área).

### Validaciones Específicas
- **Tokens**: Firma HMAC, expiración, estado ON, unicidad.
- **Pedidos**: Mesa activa, productos en stock, totales correctos.
- **Cumpleaños**: Capacidad, pagos Culqi, expiración invites.
- **Trivia**: Sesiones únicas, progreso secuencial.
- **Shows/Tickets**: Inventario, pagos, QR únicos.

## Rendimiento y Escalabilidad

### Optimizaciones Implementadas
- ✅ Next.js App Router (SSR/SSG/ISR)
- ✅ Prisma query optimization con índices DB
- ✅ Socket.IO rooms para targeting específico
- ✅ Lazy loading de componentes e imágenes
- ✅ Caché de navegador y server-side
- ✅ Scheduler para expiraciones automáticas
- ✅ PWA con service worker para offline
- ✅ Imágenes optimizadas (Sharp, WebP)
- ✅ Rate limiting y validaciones eficientes
- ✅ Auditoría asíncrona para no bloquear

### Métricas de Rendimiento
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **API Response Time**: < 200ms (tokens/status), < 500ms (pedidos complejos)
- **Socket.IO Latency**: < 50ms
- **Database Query Time**: < 100ms (con índices)
- **Scheduler Overhead**: < 1% CPU (cron jobs)
- **PWA Cache Hit Rate**: > 80%

### Estrategia de Escalabilidad
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   App Servers   │────│   Redis Cache   │
│   (Nginx/HA)    │    │   (Next.js)     │    │   (Sessions)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Socket.IO     │    │   File Storage  │
│   Primary       │    │   Cluster       │    │   (CDN/AWS S3)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ PostgreSQL      │    │   Cron Jobs     │    │   Monitoring    │
│ Read Replicas   │    │   (Scheduler)   │    │   (Logs/Metrics)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Limitaciones y Mejoras Futuras
- **Rate Limiting**: Implementar más granular (por IP, user).
- **Caching**: Agregar Redis para queries frecuentes (productos, tokens activos).
- **CDN**: Para imágenes y QR codes.
- **Monitoring**: Métricas detalladas con Prometheus/Grafana.
- **Horizontal Scaling**: Stateless servers, DB replicas.

## Scheduler y Automatización

### Tokens Scheduler
- **Boundary Enforcement**: Fuerza ON/OFF en límites horarios (18:00 - 03:00 AM), respeta overrides manuales.
- **Expiry Jobs**: Expira tokens de cumpleaños, activa tokens por ventana horaria.
- **Tecnología**: `node-cron` con Luxon para TZ, logging configurable.

### Otros Jobs
- **Cumpleaños**: Notifica reservas pendientes, expira invites.
- **Inventario**: Alertas de stock bajo (futuro).
- **Backups**: Automatizados para batches/tokens.

## Base de Datos - Modelo Principal

### Modelos Core
- **Tokens/Premios**: Prize, Batch, Token, RouletteSession.
- **Pedidos**: Category, Product, Order, OrderItem, Table/ServicePoint.
- **Cumpleaños**: BirthdayPack, BirthdayReservation, InviteToken.
- **Trivia**: TriviaQuestion, TriviaSession, TriviaPrize.
- **Shows**: Show, TicketType, TicketPurchase.
- **Usuarios**: User, Person, Scan, Task.
- **Sistema**: SystemConfig, EventLog, Notification.

### Índices y Optimizaciones
- Índices en campos críticos: expiresAt, batchId, prizeId, status.
- Relaciones eficientes, queries optimizadas con Prisma.
- Raw SQL para operaciones masivas (expiry).

## APIs Principales

### Tokens
- `GET/POST /api/system/tokens/*`: Control ON/OFF, status, toggle.
- `GET /r/[tokenId]`: Canje de token.
- `POST /api/roulette/spin`: Ruleta.

### Pedidos
- `GET /api/menu/*`: Productos, categorías.
- `POST /api/orders`: Crear pedido.
- `PUT /api/orders/[id]/status`: Actualizar estado.

### Cumpleaños
- `POST /api/birthdays/reservations`: Crear reserva.
- `GET /api/birthdays/invites/[id]`: Canjear invite.

### Trivia
- `POST /api/trivia/sessions`: Iniciar sesión.
- `POST /api/trivia/progress`: Enviar respuesta.

### Shows/Tickets
- `GET /api/shows`: Listar shows.
- `POST /api/tickets/purchase`: Comprar tickets.

### Admin/Staff
- `GET /api/admin/*`: Paneles, métricas.
- `GET /api/u/*`: Dashboard BYOD.

## Tecnologías y Dependencias

- **Frontend**: Next.js 14, React 18, Tailwind, Material-UI, Framer Motion.
- **Backend**: Next.js API Routes, Socket.IO, Prisma.
- **DB**: PostgreSQL con 50+ modelos.
- **Auth**: Sesiones custom, bcrypt.
- **Pagos**: Culqi integration.
- **QR**: qrcode, jsQR, @zxing.
- **Scheduling**: node-cron, Luxon.
- **Testing**: Vitest, Playwright.
- **Deployment**: Railway, Docker.

## Conclusión

La arquitectura de Go Lounge es modular y escalable, centrada en experiencias QR y gestión de venue. El sistema integra múltiples funcionalidades con énfasis en seguridad, rendimiento y automatización. Para expansiones futuras, priorizar caching, monitoring y horizontal scaling.</content>
<parameter name="filePath">d:\VERSION ESTABLE_BACKUP_NEW_WORKING\tokensapp\docs\architecture.md