# 🔌 APIs del Sistema Go Lounge

## Base URL
```
http://localhost:3000/api
```

## Autenticación
El sistema usa sesiones basadas en cookies:
- **Admin Session**: Para ADMIN/STAFF (panel `/admin/*`).
- **User Session**: Para STAFF (BYOD `/u/*`).
- **Sin sesión**: Acceso limitado (e.g., menú público, canje tokens).

APIs críticas requieren auth; se devuelve 401/403 si no autorizado.

---

## 🎫 APIs de Tokens y Premios

### GET /api/system/tokens/status
Obtiene el estado actual del sistema de tokens.

#### Auth Requerida
- ADMIN o STAFF (admin_session) o STAFF (user_session).

#### Respuesta Exitosa (200)
```json
{
  "ok": true,
  "tokensEnabled": true,
  "scheduledEnabled": true,
  "serverTimeIso": "2025-11-20T12:00:00.000Z",
  "timezone": "America/Lima",
  "nextSchedule": "2025-11-20T18:00:00.000Z",
  "lastChangeIso": "2025-11-20T10:00:00.000Z"
}
```

### POST /api/system/tokens/toggle
Alterna el estado ON/OFF de tokens.

#### Auth Requerida
- ADMIN o STAFF (admin_session) o STAFF (user_session).

#### Cuerpo de la Petición
```json
{
  "enabled": true
}
```

#### Respuesta Exitosa (200)
```json
{
  "ok": true,
  "tokensEnabled": true,
  "serverTimeIso": "2025-11-20T12:00:00.000Z",
  "nextSchedule": "2025-11-20T18:00:00.000Z"
}
```

### GET /r/[tokenId]
Canjea un token QR (público, sin auth).

#### Parámetros de Ruta
- `tokenId` (string): ID del token.

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "prize": {
    "key": "retry",
    "label": "Nuevo intento",
    "color": "#3BA7F0"
  },
  "token": {
    "id": "abc123",
    "expiresAt": "2025-11-19T04:59:59.999Z"
  }
}
```

### POST /api/roulette/spin
Ejecuta un spin de ruleta para un batch.

#### Auth Requerida
- Ninguna (público).

#### Cuerpo de la Petición
```json
{
  "batchId": "cmi4uvy7o001jgn1h04fqw4r6"
}
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "prize": {
    "key": "win",
    "label": "Premio 01"
  }
}
```

---

## 🍽️ APIs de Menú

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

## 🎫 APIs de Tokens

### GET /api/system/tokens/status

Obtiene el estado actual del sistema de tokens (habilitado/deshabilitado, programado, horarios).

#### Autenticación
Requiere rol `ADMIN` o `STAFF` (cookie `admin_session`).

#### Respuesta Exitosa (200)
```json
{
  "tokensEnabled": true,
  "scheduledEnabled": false,
  "nextToggle": "2025-10-12T00:00:00.000Z",
  "currentTime": "2025-10-11T15:30:00.000Z"
}
```

#### Error de Autenticación (401)
```json
{
  "error": "No autorizado"
}
```

---

### POST /api/system/tokens/toggle

Activa o desactiva manualmente el sistema de tokens.

#### Autenticación
Requiere rol `ADMIN` o `STAFF` (cookie `admin_session`).

#### Cuerpo de la Petición
```json
{
  "enabled": true
}
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "tokensEnabled": true,
  "message": "Sistema de tokens activado"
}
```

#### Errores
- **401**: No autorizado
- **400**: Datos inválidos

---

### GET /api/u/tokens

Obtiene tokens disponibles para un usuario staff (página BYOD).

#### Autenticación
Requiere rol `STAFF` (cookie `user_session`).

#### Parámetros de Consulta
- `batchId` (string, opcional): Filtrar por lote específico

#### Respuesta Exitosa (200)
```json
{
  "tokens": [
    {
      "id": "token_1234567890",
      "prizeId": "prize_001",
      "prize": {
        "name": "Cerveza Corona",
        "description": "Cerveza premium"
      },
      "expiresAt": "2025-10-12T00:00:00.000Z",
      "batchId": "batch_20251011",
      "signature": "abc123def456"
    }
  ],
  "total": 1
}
```

---

### POST /api/u/tokens/{tokenId}/claim

Reclama un token (lo marca como usado).

#### Autenticación
Requiere rol `STAFF` (cookie `user_session`).

#### Parámetros de Ruta
- `tokenId` (string): ID del token

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Token reclamado exitosamente"
}
```

#### Errores
- **404**: Token no encontrado
- **400**: Token expirado o ya usado
- **401**: No autorizado

---

## 🎂 APIs de Birthdays

### GET /api/birthdays/packs

Obtiene los paquetes de cumpleaños disponibles.

#### Autenticación
Pública (con rate limiting) o STAFF/ADMIN para paquetes custom.

#### Respuesta Exitosa (200)
```json
{
  "packs": [
    {
      "id": "pack_001",
      "name": "Pack Básico",
      "qrCount": 10,
      "bottle": "Cerveza Corona",
      "featured": false,
      "perks": ["Mesa reservada", "Botella incluida"],
      "priceSoles": 150.00,
      "isCustom": false
    }
  ]
}
```

---

### POST /api/birthdays/reservations

Crea una nueva reserva de cumpleaños.

#### Autenticación
Pública (requiere feature flag habilitado).

#### Cuerpo de la Petición
```json
{
  "celebrantName": "Juan Pérez",
  "phone": "+51 999 999 999",
  "documento": "12345678",
  "email": "juan@email.com",
  "date": "2025-10-15",
  "timeSlot": "20:00",
  "packId": "pack_001",
  "guestsPlanned": 15,
  "referrerId": "ref_123"
}
```

#### Respuesta Exitosa (201)
```json
{
  "ok": true,
  "id": "res_123456",
  "celebrantName": "Juan Pérez",
  "phone": "+51 999 999 999",
  "documento": "12345678",
  "email": "juan@email.com",
  "date": "2025-10-15",
  "timeSlot": "20:00",
  "pack": {
    "id": "pack_001",
    "name": "Pack Básico",
    "qrCount": 10,
    "bottle": "Cerveza Corona",
    "featured": false
  },
  "guestsPlanned": 15,
  "status": "pending",
  "tokensGeneratedAt": null,
  "createdAt": "2025-10-01T10:00:00.000Z",
  "clientSecret": "secret_token_for_qr_access"
}
```

#### Errores
- **409**: DUPLICATE_DNI_YEAR - Ya tienes una reserva este año
- **400**: INVALID_NAME_MIN_WORDS - Nombre debe tener al menos 2 palabras
- **400**: INVALID_REFERRER - Referidor inválido

---

### GET /api/birthdays/reservations/{id}/public-secret

Genera un clientSecret temporal para acceder a los tokens de una reserva.

#### Autenticación
Pública (requiere feature flag habilitado).

#### Respuesta Exitosa (200)
```json
{
  "clientSecret": "temporary_secret_token",
  "ttlMinutes": 10
}
```

#### Errores
- **404**: Reserva no encontrada
- **400**: Aún no hay tokens para la reserva

---

### POST /api/birthdays/reservations/{id}/tokens

Genera tokens de invitación para una reserva (idempotente).

#### Autenticación
Requiere clientSecret válido en el body.

#### Cuerpo de la Petición
```json
{
  "clientSecret": "temporary_secret_token"
}
```

#### Respuesta Exitosa (200)
```json
{
  "ok": true,
  "items": [
    {
      "id": "token_123",
      "code": "ABC123",
      "kind": "host",
      "status": "active",
      "expiresAt": "2025-10-15T23:59:59.000Z",
      "usedCount": null,
      "maxUses": null
    },
    {
      "id": "token_124",
      "code": "DEF456",
      "kind": "guest",
      "status": "active",
      "expiresAt": "2025-10-15T23:59:59.000Z",
      "usedCount": 0,
      "maxUses": 10
    }
  ]
}
```

---

### GET /api/birthdays/reservations/{id}/tokens

Lista los tokens de invitación de una reserva.

#### Autenticación
Requiere clientSecret válido como query parameter.

#### Parámetros de Consulta
- `clientSecret` (string, requerido): Token temporal de acceso

#### Respuesta Exitosa (200)
```json
{
  "ok": true,
  "items": [
    {
      "id": "token_123",
      "code": "ABC123",
      "kind": "host",
      "status": "active",
      "expiresAt": "2025-10-15T23:59:59.000Z",
      "usedCount": null,
      "maxUses": null
    }
  ]
}
```

---

### GET /api/birthdays/invite/{code}

Obtiene información de una invitación de cumpleaños por código.

#### Autenticación
Pública para vista básica, STAFF/ADMIN para vista extendida.

#### Respuesta Exitosa (200) - Vista Pública
```json
{
  "public": true,
  "message": "Estás invitad@ a la fiesta de Juan. Muestra este código para tu acceso y prepárate para celebrar.",
  "token": {
    "code": "ABC123",
    "kind": "guest",
    "status": "active",
    "expiresAt": "2025-10-15T23:59:59.000Z",
    "celebrantName": "Juan",
    "packName": "Pack Básico",
    "packBottle": "Cerveza Corona",
    "guestsPlanned": 15,
    "isHost": false,
    "multiUse": {
      "used": 2,
      "max": 10
    },
    "packGuestLimit": 10
  },
  "hostArrivedAt": null,
  "reservation": {
    "date": "2025-10-15",
    "timeSlot": "20:00",
    "guestArrivals": 5,
    "statusReservation": "active"
  },
  "isAdmin": false
}
```

#### Respuesta Exitosa (200) - Vista Staff
```json
{
  "public": false,
  "token": {
    "code": "ABC123",
    "kind": "guest",
    "status": "active",
    "expiresAt": "2025-10-15T23:59:59.000Z",
    "celebrantName": "Juan Pérez",
    "packName": "Pack Básico",
    "packBottle": "Cerveza Corona",
    "guestsPlanned": 15,
    "isHost": false,
    "multiUse": {
      "used": 2,
      "max": 10
    },
    "packGuestLimit": 10
  },
  "reservation": {
    "reservationId": "res_123456",
    "date": "2025-10-15",
    "timeSlot": "20:00",
    "phone": "+51 999 999 999",
    "documento": "12345678",
    "email": "juan@email.com",
    "statusReservation": "active",
    "tokensGeneratedAt": "2025-10-01T10:30:00.000Z",
    "createdAt": "2025-10-01T10:00:00.000Z",
    "updatedAt": "2025-10-01T10:30:00.000Z",
    "hostArrivedAt": "2025-10-15T20:00:00.000Z",
    "guestArrivals": 5,
    "lastGuestArrivalAt": "2025-10-15T20:30:00.000Z"
  },
  "isAdmin": true
}
```

#### Errores
- **404**: Token no encontrado

---

### POST /api/birthdays/invite/{code}

Valida/redime un token de invitación (usado por staff para registrar llegada).

#### Autenticación
Requiere rol `STAFF` o `ADMIN`.

#### Cuerpo de la Petición (opcional)
```json
{
  "device": "iPhone",
  "location": "Entrada principal"
}
```

#### Respuesta Exitosa (200)
```json
{
  "token": {
    "code": "ABC123",
    "kind": "guest",
    "status": "active",
    "usedCount": 3,
    "maxUses": 10
  },
  "arrival": {
    "hostArrivedAt": "2025-10-15T20:00:00.000Z",
    "guestArrivals": 6,
    "lastGuestArrivalAt": "2025-10-15T20:45:00.000Z"
  }
}
```

#### Errores
- **400**: TOKEN_EXHAUSTED - Token agotado
- **400**: TOKEN_ALREADY_REDEEMED - Token ya usado
- **400**: TOKEN_EXPIRED - Token expirado
- **400**: RESERVATION_DATE_FUTURE - Fecha de reserva futura

---

---

## 🔧 APIs de Sistema

### GET /api/system/tokens/period-metrics

Obtiene métricas de tokens por período.

#### Autenticación
Requiere rol `ADMIN` o `STAFF`.

#### Parámetros de Consulta
- `period` (string): `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_month`
- `batchId` (string, opcional): Filtrar por lote específico
- `start` & `end` (string, opcional): Para período custom (YYYY-MM-DD)

#### Respuesta Exitosa (200)
```json
{
  "ok": true,
  "period": "Hoy",
  "startDay": "2025-10-11",
  "endDay": "2025-10-12",
  "totals": {
    "total": 150,
    "redeemed": 45,
    "expired": 10,
    "active": 95,
    "delivered": 40,
    "revealed": 38,
    "disabled": 2
  },
  "spins": 120,
  "batchId": null
}
```

---

### GET /api/admin/health

Verifica el estado del sistema (requiere autenticación básica).

#### Autenticación
Basic Auth con usuario `health` y token de entorno `HEALTH_TOKEN`.

#### Respuesta Exitosa (200)
```json
{
  "status": "ok",
  "timestamp": "2025-10-11T15:30:00.000Z",
  "version": "1.0.0"
}
```

---

### GET /api/admin/birthdays/health

Verifica el estado del sistema de cumpleaños.

#### Autenticación
Requiere rol `ADMIN`.

#### Respuesta Exitosa (200)
```json
{
  "status": "ok",
  "birthdaysEnabled": true,
  "totalReservations": 25,
  "activeReservations": 5
}
```

---

### GET /api/staff/metrics

Obtiene métricas de rendimiento del staff.

#### Autenticación
Requiere rol `ADMIN`.

#### Respuesta Exitosa (200)
```json
{
  "staffMetrics": [
    {
      "id": "staff_123",
      "name": "Juan Pérez",
      "metrics": {
        "totalOrders": 45,
        "totalRevenue": 1250.50,
        "avgDeliveryTime": 12.5
      }
    }
  ],
  "summary": {
    "totalStaff": 8,
    "totalOrders": 320,
    "totalRevenue": 8500.00,
    "avgDeliveryTime": 11.2
  }
}
```

---

### GET /api/scanner/metrics

Obtiene métricas del scanner de asistencia.

#### Autenticación
Requiere rol `ADMIN`.

#### Respuesta Exitosa (200)
```json
{
  "totalScans": 1250,
  "successfulScans": 1180,
  "failedScans": 70,
  "avgProcessingTime": 0.8
}
```

---

---

## 🎯 APIs de Trivia

### POST /api/trivia/session

Inicia o continúa una sesión de trivia.

#### Autenticación
Pública (con rate limiting).

#### Cuerpo de la Petición
```json
{
  "questionSetId": "set_123",
  "sessionId": "session_456"
}
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "session": {
    "sessionId": "session_456",
    "questionSetId": "set_123",
    "currentQuestion": 1,
    "totalQuestions": 10,
    "status": "active"
  },
  "question": {
    "id": "q_001",
    "text": "¿Cuál es la capital de Perú?",
    "answers": [
      { "id": "a_1", "text": "Lima" },
      { "id": "a_2", "text": "Cusco" }
    ]
  }
}
```

---

### PUT /api/trivia/session

Responde una pregunta de trivia.

#### Autenticación
Pública.

#### Cuerpo de la Petición
```json
{
  "sessionId": "session_456",
  "questionId": "q_001",
  "answerId": "a_1"
}
```

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "correct": true,
  "nextQuestion": {
    "id": "q_002",
    "text": "¿Cuál es el río más largo del mundo?"
  }
}
```

---

### GET /api/trivia/session?sessionId=...

Obtiene el estado de una sesión de trivia.

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "session": {
    "sessionId": "session_456",
    "status": "completed",
    "score": 8,
    "totalQuestions": 10,
    "prizeWon": {
      "id": "prize_123",
      "name": "Cerveza Corona"
    }
  }
}
```

---

### GET /api/trivia/available-question-sets

Obtiene los sets de preguntas disponibles.

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "questionSets": [
    {
      "id": "set_123",
      "name": "Trivia General",
      "questionCount": 10,
      "active": true
    }
  ]
}
```

---

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
```

---

## ⚠️ Manejo de Errores

### Formato Unificado de Errores
```json
{
  "code": "STRING_CODE",
  "message": "Mensaje legible (puede ser mismo code)",
  "details": { "opcional": "metadata adicional" }
}
```

- `code`: identificador estable (MAYÚSCULAS, snake) usado por frontend/tests
- `message`: texto amigable (localizable)
- `details`: objeto opcional con datos diagnósticos

### Cabeceras Recomendadas
- `Content-Type: application/json; charset=utf-8`
- `Retry-After` (solo para `RATE_LIMIT`)
- `Cache-Control: no-store` en errores mutadores

### Códigos de Error Principales

| Code | HTTP | Descripción |
|------|------|-------------|
| UNAUTHORIZED | 401 | Falta sesión o credenciales inválidas |
| FORBIDDEN | 403 | Rol/scope insuficiente |
| NOT_FOUND | 404 | Recurso inexistente |
| BAD_REQUEST | 400 | Petición mal formada |
| INVALID_BODY | 400 | Body inválido / errores de validación |
| RATE_LIMIT | 429 | Límite de frecuencia superado |
| ALREADY_EXISTS | 409 | Recurso duplicado |
| ALREADY_REDEEMED | 409 | Token ya canjeado |
| EXPIRED | 410 | Token expirado |
| SYSTEM_OFF | 423 | Canje bloqueado (modo OFF) |
| INTERNAL_ERROR | 500 | Excepción interna |

### Uso en Código
```ts
import { apiError } from '@/lib/apiError';

// Ejemplo
if (!token) return apiError('NOT_FOUND', 'Token no encontrado', { tokenId }, 404);
```

### Buenas Prácticas
- No reutilizar `code` para significados distintos
- Evitar filtrar internals hacia `message`; usar logs para diagnóstico
- `details` solo con datos accionables
- Mantener tabla de códigos sincronizada</content>
<parameter name="filePath">d:\VERSION ESTABLE_BACKUP_NEW_WORKING\tokensapp\docs\apis.md