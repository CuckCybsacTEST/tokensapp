# 🍽️ Sistema de Menú Digital - El Lounge

## 📋 Descripción General

Sistema completo de menú digital para restaurante El Lounge, implementado con Next.js 14, Prisma ORM, PostgreSQL y Socket.IO para comunicación en tiempo real entre mesas, mozos y caja.

## 🏗️ Arquitectura del Sistema

### Tecnologías Principales
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL
- **Tiempo Real**: Socket.IO
- **UI/UX**: Tailwind CSS, Framer Motion, Lucide React
- **Despliegue**: Railway (recomendado)

### Estructura del Proyecto
```
tokensapp/
├── prisma/
│   ├── schema.prisma          # Modelos de base de datos
│   └── seed.ts               # Datos iniciales
├── src/
│   ├── app/
│   │   ├── menu/
│   │   │   └── page.tsx       # Interfaz del menú para clientes
│   │   ├── staff/
│   │   │   └── dashboard/
│   │   │       └── page.tsx   # Dashboard para personal
│   │   └── api/
│   │       ├── menu/
│   │       │   ├── categories/route.ts
│   │       │   └── products/route.ts
│   │       └── orders/
│   │           └── route.ts    # API de pedidos
│   ├── hooks/
│   │   └── useSocket.ts       # Hooks para Socket.IO
│   └── lib/
│       └── socket.ts          # Configuración Socket.IO cliente
├── scripts/
│   ├── seed-menu.ts           # Seed de menú
│   └── seed-tables.ts         # Seed de mesas
└── docs/                      # Documentación adicional
```

## 🗄️ Base de Datos

### Modelos Prisma

#### Category (Categorías)
```prisma
model Category {
  id          String    @id @default(cuid())
  name        String
  description String?
  icon        String?   // Emoji o nombre de icono
  order       Int       @default(0)
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  products    Product[]

  @@index([order])
  @@index([active])
}
```

#### Product (Productos)
```prisma
model Product {
  id          String    @id @default(cuid())
  name        String
  description String?
  price       Float
  image       String?
  categoryId  String
  category    Category  @relation(fields: [categoryId], references: [id])
  available   Boolean   @default(true)
  featured    Boolean   @default(false)
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  orderItems  OrderItem[]

  @@index([categoryId])
  @@index([available])
  @@index([featured])
  @@index([order])
}
```

#### Table (Mesas)
```prisma
model Table {
  id        String   @id @default(cuid())
  number    Int      @unique
  name      String?  // ej: "Terraza 01", "VIP 05"
  zone      String?  // ej: "Terraza", "VIP", "Barra"
  capacity  Int      @default(4)
  active    Boolean  @default(true)
  qrCode    String?  @unique // URL del QR
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]

  @@index([zone])
  @@index([active])
}
```

#### Order (Pedidos)
```prisma
model Order {
  id          String      @id @default(cuid())
  tableId     String
  table       Table       @relation(fields: [tableId], references: [id])
  staffId     String?     // mozo asignado
  staff       Staff?      @relation(fields: [staffId], references: [id])
  status      OrderStatus @default(PENDING)
  total       Float       @default(0)
  notes       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  confirmedAt DateTime?
  readyAt     DateTime?
  deliveredAt DateTime?
  items       OrderItem[]

  @@index([tableId])
  @@index([staffId])
  @@index([status])
  @@index([createdAt])
}
```

#### OrderItem (Items del Pedido)
```prisma
model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int      @default(1)
  price     Float    // precio al momento del pedido
  notes     String?
  createdAt DateTime @default(now())

  @@index([orderId])
  @@index([productId])
}
```

#### Staff (Personal)
```prisma
model Staff {
  id        String     @id @default(cuid())
  name      String
  role      StaffRole
  active    Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  orders    Order[]

  @@index([role])
  @@index([active])
}
```

#### Notification (Notificaciones)
```prisma
model Notification {
  id        String            @id @default(cuid())
  type      NotificationType
  title     String
  message   String
  orderId   String?
  order     Order?            @relation(fields: [orderId], references: [id])
  read      Boolean           @default(false)
  createdAt DateTime          @default(now())

  @@index([orderId])
  @@index([read])
}
```

### Enums
```prisma
enum OrderStatus {
  PENDING     // Pendiente
  CONFIRMED   // Confirmado por mozo
  PREPARING   // En preparación
  READY       // Listo para servir
  DELIVERED   // Entregado
  CANCELLED   // Cancelado
}

enum StaffRole {
  WAITER    // Mozo
  CASHIER   // Caja
}

enum NotificationType {
  ORDER_NEW        // Nuevo pedido
  ORDER_CONFIRMED  // Pedido confirmado
  ORDER_READY      // Pedido listo
  ORDER_DELIVERED  // Pedido entregado
  ORDER_CANCELLED  // Pedido cancelado
  STAFF_ALERT      // Alerta a staff
  SYSTEM_MESSAGE   // Mensaje del sistema
}
```

## 🔌 APIs Implementadas

### GET /api/menu/categories
**Descripción**: Obtiene todas las categorías activas con sus productos.

**Respuesta**:
```json
{
  "categories": [
    {
      "id": "bebidas",
      "name": "Bebidas",
      "description": "Cócteles, vinos y bebidas refrescantes",
      "icon": "🍸",
      "order": 1,
      "products": [
        {
          "id": "pisco-sour",
          "name": "Pisco Sour",
          "description": "Cóctel peruano tradicional",
          "price": 25.00,
          "available": true,
          "featured": true
        }
      ]
    }
  ]
}
```

### GET /api/menu/products
**Descripción**: Obtiene todos los productos disponibles.

**Parámetros de consulta**:
- `categoryId` (opcional): Filtrar por categoría específica

### POST /api/orders
**Descripción**: Crea un nuevo pedido.

**Cuerpo de la petición**:
```json
{
  "tableId": "table-01",
  "items": [
    {
      "productId": "pisco-sour",
      "quantity": 2,
      "notes": "Sin hielo extra"
    }
  ],
  "notes": "Pedido urgente"
}
```

**Respuesta**:
```json
{
  "success": true,
  "order": {
    "id": "order-123",
    "tableId": "table-01",
    "status": "PENDING",
    "total": 50.00,
    "items": [...],
    "createdAt": "2025-10-11T10:30:00Z"
  }
}
```

### GET /api/orders
**Descripción**: Obtiene pedidos (todos para staff, por mesa para clientes).

**Parámetros de consulta**:
- `tableId` (opcional): Filtrar pedidos de una mesa específica

## 🎨 Interfaz de Usuario

### Menú para Clientes (`/menu`)

#### Funcionalidades
- ✅ Navegación por categorías con iconos
- ✅ Carrito de compras persistente
- ✅ Ingreso de número de mesa
- ✅ Cálculo automático de totales
- ✅ Notas por producto
- ✅ Validación de campos requeridos
- ✅ Notificaciones en tiempo real del estado del pedido

#### Componentes Principales
- `CategoryFilter`: Filtros por categoría
- `ProductCard`: Tarjeta de producto con imagen y precio
- `CartSidebar`: Panel lateral del carrito
- `OrderForm`: Formulario de pedido con validación

### Dashboard del Personal (`/staff/dashboard`)

#### Funcionalidades
- ✅ Vista de todos los pedidos activos
- ✅ Estadísticas en tiempo real (pendientes, preparando, listos)
- ✅ Filtros por estado de pedido
- ✅ Cambio de estado de pedidos
- ✅ Notificaciones en tiempo real
- ✅ Indicador de conexión Socket.IO

#### Estados de Pedido
1. **PENDING** → **PREPARING**: Iniciar preparación
2. **PREPARING** → **READY**: Marcar como listo
3. **READY** → **DELIVERED**: Marcar como entregado
4. Cualquier estado → **CANCELLED**: Cancelar pedido

## 🔄 Socket.IO - Comunicación en Tiempo Real

### Eventos del Cliente

#### Conexión por Rol
```javascript
// Unirse como mesa específica
socket.emit("join-table", tableId);

// Unirse como staff
socket.emit("join-staff", "all");

// Unirse como cajero
socket.emit("join-cashier");
```

#### Eventos de Pedidos
```javascript
// Nuevo pedido desde mesa
socket.emit("new-order", {
  id: "order-123",
  tableId: "table-01",
  items: [...],
  total: 50.00
});
```

### Eventos del Servidor

#### Notificaciones a Staff
```javascript
// Nuevo pedido recibido
io.to("cashier").emit("new-order", orderData);

// Actualización de estado
socket.broadcast.emit("order-status-update", {
  orderId: "order-123",
  status: "PREPARING"
});
```

### Hooks de React

#### useTableSocket
```typescript
const { socket, isConnected } = useTableSocket(tableId);
```

#### useStaffSocket
```typescript
const { socket, isConnected } = useStaffSocket();
```

## 🚀 Guía de Instalación y Configuración

### 1. Requisitos Previos
- Node.js 18+
- PostgreSQL 13+
- npm o yarn

### 2. Instalación
```bash
# Clonar repositorio
git clone <repository-url>
cd tokensapp

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de base de datos
```

### 3. Base de Datos
```bash
# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Poblar datos iniciales
npx tsx scripts/seed-tables.ts
npx tsx scripts/seed-menu.ts
```

### 4. Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Verificar tipos
npm run typecheck

# Ejecutar tests
npm test
```

### 5. Producción
```bash
# Build para producción
npm run build

# Iniciar servidor
npm start
```

## 📱 Flujo de Uso

### Para Clientes
1. **Acceso**: Escanear QR de mesa o ingresar manualmente
2. **Navegación**: Explorar categorías y productos
3. **Pedido**: Agregar items al carrito con notas opcionales
4. **Confirmación**: Ingresar número de mesa y enviar pedido
5. **Seguimiento**: Recibir actualizaciones en tiempo real

### Para Personal
1. **Dashboard**: Vista general de todos los pedidos
2. **Gestión**: Cambiar estados según progreso
3. **Notificaciones**: Alertas en tiempo real de nuevos pedidos
4. **Filtros**: Organizar pedidos por estado

## 🔧 Configuración Avanzada

### Variables de Entorno
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lounge_db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Socket.IO
SOCKET_IO_PORT=3001

# Features
NEXT_PUBLIC_BIRTHDAYS_ENABLED=true
```

### Configuración Socket.IO
```javascript
// src/pages/api/socketio.js
const io = new Server(res.socket.server, {
  path: "/api/socketio",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
```

## 📊 Métricas y Monitoreo

### KPIs del Sistema
- **Tiempo de respuesta**: < 200ms para APIs
- **Tasa de conversión**: Pedidos completados / Sesiones de menú
- **Tiempo promedio de pedido**: Desde creación hasta entrega
- **Satisfacción del cliente**: Encuestas post-pedido

### Logs Importantes
- Creación de pedidos
- Cambios de estado
- Errores de conexión Socket.IO
- Tiempos de respuesta de APIs

## 🔒 Seguridad

### Validaciones Implementadas
- ✅ Sanitización de inputs
- ✅ Validación de tipos TypeScript
- ✅ Verificación de mesas activas
- ✅ Control de productos disponibles
- ✅ Rate limiting en APIs

### Mejores Prácticas
- Uso de HTTPS en producción
- Validación de origen en Socket.IO
- Logs de auditoría para cambios críticos
- Backup automático de base de datos

## 🚀 Próximos Pasos y Mejoras

### Funcionalidades Pendientes
- [ ] Sistema de autenticación para staff
- [ ] Gestión de inventario en tiempo real
- [ ] Reportes y analytics avanzados
- [ ] Integración con sistemas de punto de venta
- [ ] Notificaciones push móviles
- [ ] Modo offline para mesas

### Optimizaciones Técnicas
- [ ] Implementar caché Redis
- [ ] Optimización de imágenes
- [ ] Lazy loading de componentes
- [ ] Service workers para PWA
- [ ] CDN para assets estáticos

### Escalabilidad
- [ ] Microservicios para módulos específicos
- [ ] Base de datos read replicas
- [ ] Load balancing
- [ ] Auto-scaling basado en demanda

## 📞 Soporte y Mantenimiento

### Contactos
- **Desarrollo**: [equipo-dev@ellounge.com]
- **Soporte**: [soporte@ellounge.com]
- **Operaciones**: [operaciones@ellounge.com]

### Documentación Adicional
- `docs/`: Documentación detallada por módulo
- `scripts/`: Utilidades de mantenimiento
- `tests/`: Casos de prueba automatizados

---

**Versión**: 1.0.0
**Fecha**: Octubre 2025
**Estado**: ✅ Producción Lista</content>
<parameter name="filePath">d:\VERSION ESTABLE_BACKUP_NEW_WORKING\tokensapp\README-MENU.md