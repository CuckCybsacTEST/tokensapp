# 🏗️ Arquitectura del Sistema de Menú Digital

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                    🖥️ CLIENTE (Navegador)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Menú (/menu)  │  │ Dashboard Staff │  │   Socket.IO     │ │
│  │                 │  │ (/staff/dash)   │  │   Client        │ │
│  │ • ProductCard   │  │                 │  │                 │ │
│  │ • CategoryFilter│  │ • OrderList     │  │ • useTableSocket│ │
│  │ • CartSidebar   │  │ • StatusFilters │  │ • useStaffSocket│ │
│  │ • OrderForm     │  │ • Real-time     │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ HTTP/WebSocket
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                   🚀 NEXT.JS SERVER (Puerto 3000)               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   API Routes    │  │  Socket.IO      │  │   Middleware     │ │
│  │                 │  │  Server         │  │                 │ │
│  │ • /api/menu/*   │  │                 │  │ • CORS          │ │
│  │ • /api/orders   │  │ • Room-based    │  │ • Auth (future) │ │
│  │ • /api/staff/*  │  │ • Event handling│  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Prisma Client
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    🗄️ POSTGRESQL DATABASE                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Categories    │  │   Products      │  │   Orders        │ │
│  │                 │  │                 │  │                 │ │
│  │ • id, name      │  │ • id, name      │  │ • id, tableId   │ │
│  │ • description   │  │ • price, image  │  │ • status, total │ │
│  │ • icon, order   │  │ • categoryId    │  │ • items[]       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Tables        │  │   Staff         │  │ Notifications   │ │
│  │                 │  │                 │  │                 │ │
│  │ • id, number    │  │ • id, name      │  │ • type, title   │ │
│  │ • name, zone    │  │ • role, active  │  │ • message       │ │
│  │ • capacity      │  │                 │  │ • orderId       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos - Nuevo Pedido

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

## Estados del Pedido

```
PENDING ──────▶ CONFIRMED ──────▶ PREPARING ──────▶ READY ──────▶ DELIVERED
     │               │                │               │              │
     │               │                │               │              │
     └───────────────┴────────────────┴───────────────┴──────────────┴─▶ CANCELLED
```

## Eventos Socket.IO

### Canales (Rooms)
- `table-{tableId}`: Comunicación con mesa específica
- `staff-{staffId}`: Comunicación con staff individual
- `cashier`: Comunicación con caja
- `waiter-{waiterId}`: Comunicación con mozo específico

### Eventos Principales
```
Cliente → Servidor:
├── join-table: Unirse a sala de mesa
├── join-staff: Unirse como staff
├── new-order: Nuevo pedido creado

Servidor → Cliente:
├── new-order: Notificar nuevo pedido a staff
├── order-status-update: Actualizar estado del pedido
├── order-confirmed: Pedido confirmado
└── order-ready: Pedido listo para servir
```

## Seguridad y Validaciones

```
┌─────────────────────────────────────────────────────────────┐
│                    🛡️ CAPAS DE SEGURIDAD                     │
├─────────────────────────────────────────────────────────────┤
│  ✅ Sanitización de inputs (cliente)                        │
│  ✅ Validación TypeScript (tiempo de desarrollo)            │
│  ✅ Validación de API (servidor)                            │
│  ✅ Verificación de mesas activas                           │
│  ✅ Control de productos disponibles                        │
│  ✅ Rate limiting (futuro)                                  │
│  ✅ Autenticación staff (futuro)                            │
│  ✅ Logs de auditoría                                       │
└─────────────────────────────────────────────────────────────┘
```

## Rendimiento y Escalabilidad

### Optimizaciones Implementadas
- ✅ Next.js App Router (SSR/SSG)
- ✅ Prisma query optimization
- ✅ Socket.IO rooms para targeting específico
- ✅ Lazy loading de componentes
- ✅ Imágenes optimizadas
- ✅ Caché de navegador

### Métricas de Rendimiento
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **API Response Time**: < 200ms
- **Socket.IO Latency**: < 50ms
- **Database Query Time**: < 100ms

### Estrategia de Escalabilidad
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   App Servers   │────│   Redis Cache   │
│                 │    │   (Next.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Socket.IO     │    │   File Storage  │
│   Primary       │    │   Cluster       │    │   (CDN)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ PostgreSQL      │
│ Read Replicas   │
└─────────────────┘
```</content>
<parameter name="filePath">d:\VERSION ESTABLE_BACKUP_NEW_WORKING\tokensapp\docs\architecture.md