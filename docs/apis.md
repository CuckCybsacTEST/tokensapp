# 🔌 APIs del Sistema de Menú Digital

## Base URL
```
http://localhost:3000/api
```

## Autenticación
Actualmente sin autenticación. Para producción, implementar JWT o NextAuth.js.

---

## 🍽️ APIs de Menú

### GET /api/menu/categories

Obtiene todas las categorías activas con sus productos.

#### Respuesta Exitosa (200)
```json
{
  "categories": [
    {
      "id": "bebidas",
      "name": "Bebidas",
      "description": "Cócteles, vinos y bebidas refrescantes",
      "icon": "🍸",
      "order": 1,
      "active": true,
      "products": [
        {
          "id": "pisco-sour",
          "name": "Pisco Sour",
          "description": "Cóctel peruano tradicional con pisco, limón, azúcar y clara de huevo",
          "price": 25.00,
          "image": "/images/pisco-sour.jpg",
          "available": true,
          "featured": true,
          "order": 1
        },
        {
          "id": "cerveza-artesanal",
          "name": "Cerveza Artesanal",
          "description": "Cerveza lager artesanal de producción local",
          "price": 18.00,
          "image": "/images/cerveza.jpg",
          "available": true,
          "featured": false,
          "order": 2
        }
      ]
    },
    {
      "id": "comidas",
      "name": "Comidas",
      "description": "Platos principales y entradas",
      "icon": "🍽️",
      "order": 2,
      "active": true,
      "products": [...]
    }
  ]
}
```

#### Código de Error (500)
```json
{
  "error": "Error interno del servidor"
}
```

---

### GET /api/menu/products

Obtiene todos los productos disponibles, opcionalmente filtrados por categoría.

#### Parámetros de Consulta
- `categoryId` (string, opcional): ID de la categoría para filtrar

#### Ejemplos de Uso

**Todos los productos:**
```
GET /api/menu/products
```

**Productos de una categoría:**
```
GET /api/menu/products?categoryId=bebidas
```

#### Respuesta Exitosa (200)
```json
{
  "products": [
    {
      "id": "pisco-sour",
      "name": "Pisco Sour",
      "description": "Cóctel peruano tradicional",
      "price": 25.00,
      "image": "/images/pisco-sour.jpg",
      "categoryId": "bebidas",
      "category": {
        "id": "bebidas",
        "name": "Bebidas",
        "icon": "🍸"
      },
      "available": true,
      "featured": true,
      "order": 1
    }
  ]
}
```

---

## 📋 APIs de Pedidos

### POST /api/orders

Crea un nuevo pedido para una mesa específica.

#### Cuerpo de la Petición
```json
{
  "tableId": "01",
  "items": [
    {
      "productId": "pisco-sour",
      "quantity": 2,
      "notes": "Sin hielo extra, por favor"
    },
    {
      "productId": "lomo-saltado",
      "quantity": 1,
      "notes": "Bien cocido"
    }
  ],
  "notes": "Pedido urgente - cliente VIP"
}
```

#### Validaciones
- `tableId`: Requerido, debe existir y estar activo
- `items`: Requerido, array no vacío
- `items[].productId`: Requerido, debe existir y estar disponible
- `items[].quantity`: Opcional, default 1, debe ser > 0
- `items[].notes`: Opcional, string
- `notes`: Opcional, string para el pedido completo

#### Respuesta Exitosa (201)
```json
{
  "success": true,
  "order": {
    "id": "clx8y9z0a0001abcdefghijk",
    "tableId": "01",
    "table": {
      "id": "01",
      "number": 1,
      "name": "Terraza 01",
      "zone": "Terraza"
    },
    "status": "PENDING",
    "total": 68.00,
    "notes": "Pedido urgente - cliente VIP",
    "items": [
      {
        "id": "clx8y9z0a0002abcdefghijl",
        "productId": "pisco-sour",
        "product": {
          "id": "pisco-sour",
          "name": "Pisco Sour",
          "price": 25.00
        },
        "quantity": 2,
        "price": 25.00,
        "notes": "Sin hielo extra, por favor"
      },
      {
        "id": "clx8y9z0a0003abcdefghijm",
        "productId": "lomo-saltado",
        "product": {
          "id": "lomo-saltado",
          "name": "Lomo Saltado",
          "price": 43.00
        },
        "quantity": 1,
        "price": 43.00,
        "notes": "Bien cocido"
      }
    ],
    "createdAt": "2025-10-11T15:30:00.000Z"
  }
}
```

#### Respuestas de Error

**Mesa no encontrada (404):**
```json
{
  "error": "Mesa no encontrada o inactiva"
}
```

**Producto no disponible (404):**
```json
{
  "error": "Producto pisco-sour no encontrado o no disponible"
}
```

**Datos inválidos (400):**
```json
{
  "error": "Se requiere tableId y al menos un item"
}
```

**Error interno (500):**
```json
{
  "error": "Error interno del servidor"
}
```

---

### GET /api/orders

Obtiene pedidos. Para clientes: pedidos de su mesa. Para staff: todos los pedidos.

#### Parámetros de Consulta
- `tableId` (string, opcional): Filtrar pedidos de una mesa específica

#### Ejemplos de Uso

**Todos los pedidos (staff):**
```
GET /api/orders
```

**Pedidos de una mesa:**
```
GET /api/orders?tableId=01
```

#### Respuesta Exitosa (200)
```json
{
  "orders": [
    {
      "id": "clx8y9z0a0001abcdefghijk",
      "tableId": "01",
      "table": {
        "id": "01",
        "number": 1,
        "name": "Terraza 01",
        "zone": "Terraza"
      },
      "status": "PENDING",
      "total": 68.00,
      "notes": "Pedido urgente - cliente VIP",
      "createdAt": "2025-10-11T15:30:00.000Z",
      "items": [
        {
          "id": "clx8y9z0a0002abcdefghijl",
          "productId": "pisco-sour",
          "product": {
            "id": "pisco-sour",
            "name": "Pisco Sour"
          },
          "quantity": 2,
          "price": 25.00,
          "notes": "Sin hielo extra, por favor"
        }
      ]
    }
  ]
}
```

---

### PATCH /api/orders/{orderId}/status

Actualiza el estado de un pedido (solo para staff).

#### Parámetros de Ruta
- `orderId` (string): ID del pedido

#### Cuerpo de la Petición
```json
{
  "status": "PREPARING"
}
```

#### Estados Válidos
- `PENDING` → `CONFIRMED` → `PREPARING` → `READY` → `DELIVERED`
- Cualquier estado → `CANCELLED`

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "order": {
    "id": "clx8y9z0a0001abcdefghijk",
    "status": "PREPARING",
    "updatedAt": "2025-10-11T15:35:00.000Z"
  }
}
```

---

## 🔧 APIs de Sistema (Futuras)

### GET /api/system/health
Verifica el estado del sistema.

### GET /api/system/metrics
Obtiene métricas de uso del sistema.

### POST /api/auth/login
Autenticación de staff (futuro).

---

## 📊 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |

## ⏱️ Límites de Rate Limiting

- **GET requests**: 100 por minuto por IP
- **POST /api/orders**: 10 por minuto por mesa
- **PATCH requests**: 60 por minuto por IP

## 🔍 Logs y Monitoreo

Cada petición API genera logs con:
- Timestamp
- IP del cliente
- Endpoint accedido
- Tiempo de respuesta
- Código de estado
- Error (si aplica)

## 🧪 Testing

### Tests Unitarios
```bash
npm run test:unit
```

### Tests de Integración
```bash
npm run test:integration
```

### Tests E2E
```bash
npm run test:e2e
```

### Ejemplo de Test API
```javascript
// tests/api/orders.test.js
describe('POST /api/orders', () => {
  it('should create a new order', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({
        tableId: '01',
        items: [{ productId: 'pisco-sour', quantity: 1 }]
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```</content>
<parameter name="filePath">d:\VERSION ESTABLE_BACKUP_NEW_WORKING\tokensapp\docs\apis.md