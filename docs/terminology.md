# Terminología del Sistema Go Lounge

Este documento define todos los términos técnicos, abreviaturas y conceptos utilizados en el sistema Go Lounge, organizados por categorías para facilitar la comprensión y el desarrollo.

## 🎫 Sistema de Tokens

### Conceptos Básicos
- **Token**: Código QR único que representa un premio potencial
- **Batch/Lote**: Grupo de tokens generados juntos con características similares
- **Prize/Premio**: Recompensa física o descuento que se puede obtener
- **Signature**: Código único que identifica un token (visible en QR)
- **functionalDate**: Fecha operativa de un lote (cierra a medianoche Lima)

### Estados de Token
- **Active**: Token disponible para uso
- **Redeemed**: Token canjeado por premio
- **Expired**: Token vencido sin uso
- **Disabled**: Token deshabilitado manualmente
- **Revealed**: Premio mostrado en ruleta (flujo de dos fases)
- **Delivered**: Premio entregado físicamente (flujo de dos fases)

### Campos de Base de Datos
- **revealedAt**: Fecha de revelación del premio en ruleta
- **deliveredAt**: Fecha de entrega física del premio
- **redeemedAt**: Campo legacy (copia de deliveredAt para compatibilidad)
- **expiresAt**: Fecha de expiración del token
- **createdAt**: Fecha de creación del token

## 🎂 Sistema de Cumpleaños

### Reservas y Eventos
- **BirthdayReservation**: Reserva de fiesta de cumpleaños
- **Celebrant**: Persona que cumple años
- **Host**: Cumpleañero (token especial para entrada)
- **Guest**: Invitado (tokens multi-uso)
- **Pack**: Paquete de cumpleaños con QR codes incluidos

### Tokens de Invitación
- **InviteToken**: Token QR para acceso a fiesta
- **Host Token**: Token único para el cumpleañero
- **Guest Token**: Token multi-uso para invitados
- **maxUses**: Número máximo de usos por token invitado
- **usedCount**: Contador de usos actuales

### Estados de Reserva
- **Pending**: Reserva creada, esperando confirmación
- **Active**: Reserva confirmada y activa
- **Completed**: Evento finalizado exitosamente
- **Cancelled**: Reserva cancelada

### Llegadas y Control
- **hostArrivedAt**: Fecha/hora de llegada del cumpleañero
- **guestArrivals**: Contador total de llegadas de invitados
- **lastGuestArrivalAt**: Última llegada de invitado
- **timeSlot**: Horario reservado (ej: "20:00")

## 👥 Autenticación y Roles

### Contextos de Sesión
- **admin_session**: Sesión para panel administrativo
- **user_session**: Sesión para área BYOD/colaboradores

### Roles del Sistema
- **ADMIN**: Acceso completo al sistema
- **STAFF**: Acceso limitado (panel) o extendido (BYOD)
- **COLLABORATOR**: Acceso básico BYOD + scanner
- **STAFF (Usuario)**: COLLABORATOR + control de tokens

### Autenticación Técnica
- **Session Cookie**: Cookie HTTP para mantener sesión
- **JWT**: JSON Web Token (no usado actualmente)
- **Basic Auth**: Autenticación básica (health checks)
- **Rate Limiting**: Límite de requests por IP/usuario

## 📊 Métricas y Reportes

### Tipos de Métricas
- **Period Metrics**: Métricas por período de tiempo
- **Conversion Rate**: Tasa de conversión (canjeados/total)
- **Active Tokens**: Tokens disponibles actualmente
- **Business Day**: Día operativo (18:00 - 03:00 AM Lima)

### Períodos de Reporte
- **Today**: Día actual operativo
- **Yesterday**: Día anterior
- **This Week**: Semana actual
- **Last Month**: Mes anterior
- **Custom**: Período personalizado

## 🎯 Trivia y Juegos

### Componentes de Trivia
- **QuestionSet**: Conjunto de preguntas agrupadas
- **Question**: Pregunta individual con opciones
- **Answer**: Respuesta posible (una correcta)
- **Session**: Sesión de juego de un usuario
- **Prize**: Recompensa por completar trivia

### Estados de Sesión
- **Active**: Sesión en progreso
- **Completed**: Trivia terminada exitosamente
- **Expired**: Sesión vencida por tiempo

## 🏪 Menú y Pedidos

### Estructura de Menú
- **Category**: Categoría de productos (ej: "Piscos", "Cervezas")
- **Product**: Item individual del menú
- **Price**: Precio en soles
- **Available**: Producto disponible para pedido

### Estados de Pedido
- **Pending**: Pedido creado, esperando confirmación
- **Confirmed**: Pedido confirmado por staff
- **Preparing**: En preparación
- **Ready**: Listo para entrega
- **Delivered**: Entregado al cliente
- **Cancelled**: Pedido cancelado

### Mesas y Zonas
- **Table**: Mesa física identificada por número
- **Zone**: Área del restaurante (ej: "Terraza", "Interior")
- **Capacity**: Capacidad máxima de personas

## 🔧 Desarrollo y Arquitectura

### Tecnologías
- **Next.js**: Framework React para SSR/SSG
- **Prisma**: ORM para PostgreSQL
- **Socket.IO**: Comunicación en tiempo real
- **Tailwind CSS**: Framework de estilos
- **TypeScript**: JavaScript tipado
- **Vitest**: Framework de testing

### Patrones de Arquitectura
- **App Router**: Sistema de rutas de Next.js 13+
- **Server Components**: Componentes que renderizan en servidor
- **Client Components**: Componentes interactivos en cliente
- **API Routes**: Endpoints REST en `/api/*`
- **Middleware**: Lógica de pre-procesamiento de requests

### Base de Datos
- **PostgreSQL**: Base de datos relacional
- **Migrations**: Cambios versionados de schema
- **Seeds**: Datos iniciales para desarrollo
- **Indexes**: Optimizaciones de consulta

## 🌐 APIs y Endpoints

### Patrones de URL
- **`/api/admin/*`**: Endpoints administrativos
- **`/api/user/*`**: Endpoints de colaboradores
- **`/api/system/*`**: Endpoints del sistema
- **`/api/birthdays/*`**: APIs de cumpleaños
- **`/api/trivia/*`**: APIs de trivia

### Códigos de Estado
- **200**: OK - Operación exitosa
- **201**: Created - Recurso creado
- **400**: Bad Request - Datos inválidos
- **401**: Unauthorized - No autenticado
- **403**: Forbidden - Sin permisos
- **404**: Not Found - Recurso no existe
- **500**: Internal Server Error - Error del servidor

## 📱 Interfaces de Usuario

### Áreas de la App
- **Admin Panel**: `/admin/*` - Gestión del sistema
- **BYOD**: `/u/*` - Área de colaboradores
- **Public**: `/` - Páginas públicas
- **Scanner**: `/scanner` - Kiosco de escaneo

### Componentes UI
- **Layout**: Estructura base de página
- **Modal**: Ventanas emergentes
- **Toast**: Notificaciones temporales
- **Table**: Tablas de datos
- **Form**: Formularios de entrada

## 🚀 Despliegue y DevOps

### Entornos
- **Development**: Entorno local de desarrollo
- **Staging**: Entorno de pruebas
- **Production**: Entorno de producción

### Herramientas de Despliegue
- **Railway**: Plataforma de hosting
- **Docker**: Contenedorización
- **CI/CD**: Integración y despliegue continuo
- **Monitoring**: Monitoreo de sistema

### Configuración
- **Environment Variables**: Variables de entorno
- **Feature Flags**: Banderas de características
- **Rate Limits**: Límites de requests
- **CORS**: Configuración de origen cruzado

## 📋 Negocio y Operaciones

### Tipos de Cliente
- **Walk-in**: Cliente sin reserva
- **Reservation**: Cliente con reserva previa
- **Birthday**: Cliente de evento de cumpleaños
- **VIP**: Cliente premium

### Métricas de Negocio
- **Revenue**: Ingresos totales
- **Conversion**: Tasa de conversión de tokens
- **Satisfaction**: Satisfacción del cliente
- **Retention**: Retención de clientes

### Procesos Operativos
- **Shift**: Turno de trabajo
- **Attendance**: Control de asistencia de staff
- **Inventory**: Gestión de inventario
- **Maintenance**: Mantenimiento del sistema

## 🔒 Seguridad

### Autenticación
- **Password Hashing**: Encriptación de contraseñas
- **Session Management**: Gestión de sesiones
- **CSRF Protection**: Protección contra CSRF
- **XSS Prevention**: Prevención de XSS

### Autorización
- **Role-Based Access**: Control basado en roles
- **Permission Checks**: Verificaciones de permisos
- **Audit Logs**: Logs de auditoría
- **Data Validation**: Validación de datos

## 📊 Monitoreo y Logs

### Tipos de Log
- **Application Logs**: Logs de aplicación
- **Error Logs**: Logs de errores
- **Access Logs**: Logs de acceso
- **Audit Logs**: Logs de auditoría

### Herramientas de Monitoreo
- **Health Checks**: Verificación de estado
- **Metrics**: Métricas del sistema
- **Alerts**: Alertas automáticas
- **Dashboards**: Paneles de control

## 🧪 Testing

### Tipos de Tests
- **Unit Tests**: Tests de unidades
- **Integration Tests**: Tests de integración
- **E2E Tests**: Tests end-to-end
- **API Tests**: Tests de APIs

### Herramientas de Testing
- **Vitest**: Framework de testing
- **Playwright**: Tests E2E
- **Jest**: Framework alternativo
- **Supertest**: Testing de APIs

## 📚 Glosario Adicional

### Abreviaturas Comunes
- **DB**: Database (Base de datos)
- **UI**: User Interface (Interfaz de usuario)
- **API**: Application Programming Interface
- **QR**: Quick Response (Código QR)
- **CRUD**: Create, Read, Update, Delete
- **SSR**: Server-Side Rendering
- **SSG**: Static Site Generation
- **PWA**: Progressive Web App

### Términos Técnicos Específicos
- **Hydration**: Proceso de activación de React en cliente
- **Middleware**: Software intermediario en requests
- **Migration**: Cambio versionado de base de datos
- **Seed**: Datos iniciales de base de datos
- **Fixture**: Datos de prueba
- **Stub**: Simulación de función para testing
- **Mock**: Simulación de objeto para testing

---

## 📖 Guía de Uso

### Para Desarrolladores
- Consulta este documento antes de nombrar nuevas entidades
- Mantén consistencia con la terminología existente
- Actualiza este documento cuando agregues nuevos términos

### Para Operadores
- Usa los términos correctos en comunicaciones
- Consulta definiciones cuando encuentres términos desconocidos
- Reporta inconsistencias en la terminología

### Para Stakeholders
- Esta documentación asegura comunicación clara
- Los términos técnicos están explicados en contexto de negocio
- Facilita la comprensión entre equipos técnicos y no técnicos

---

*Última actualización: Noviembre 2025*
*Documento mantenido por el equipo de desarrollo*
