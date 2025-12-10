# Sistema de QR Personalizados - Go Lounge

## 🎯 Descripción General

El **Sistema de QR Personalizados** permite a los clientes crear códigos QR únicos con información personalizada que pueden ser redimidos en Go Lounge. Este sistema está diseñado para experiencias personalizadas y campañas de marketing específicas.

## ✨ Características Principales

### 🎨 **Personalización Visual**
- **Temas Predefinidos**: Default, Navidad, Halloween, Verano, Cumpleaños
- **Colores Personalizables**: QR con colores únicos por tema
- **Diseño Consistente**: Integración con el sistema de temas existente

### 📝 **Campos Dinámicos**
- **Nombre Completo**: Validación de formato (nombre + apellido)
- **WhatsApp**: Validación de números peruanos (+51 9XXXXXXXX)
- **Frase Personal**: Mensaje personalizado opcional
- **Dato Adicional**: Campo configurable para campañas específicas

### 📊 **Lotes Temáticos**
- **Agrupación por Campañas**: QR organizados por eventos/campañas
- **Lotes de Impresión**: Gestión masiva para impresión
- **Control de Validez**: Fechas de expiración configurables

### 📈 **Estadísticas y Métricas**
- **Dashboard Completo**: Métricas en tiempo real
- **Análisis por Tema**: Popularidad de temas
- **Análisis por Campaña**: Rendimiento de campañas
- **Export CSV**: Datos completos para análisis externos

### 🖨️ **Sistema de Impresión**
- **Templates Reutilizables**: Integración con sistema existente
- **PDF por Lotes**: Impresión masiva A4
- **Códigos QR Optimizados**: Tamaño y calidad para impresión

## 🚀 Flujo de Usuario

### 1. **Creación por Cliente**
```
Cliente → /qr-generator → Formulario → QR generado → Descarga/Comparte
```

### 2. **Redención**
```
Cliente escanea QR → /qr/[code] → Validación → Información mostrada
```

### 3. **Gestión Admin**
```
Admin → /admin/custom-qrs → Lista QR → Redimir individual → Imprimir lotes
```

## 🛠️ Arquitectura Técnica

### 📁 **Estructura de Archivos**
```
src/
├── app/
│   ├── qr-generator/           # 🎨 Generador público
│   ├── qr/[code]/             # 🔄 Página de redención
│   └── admin/
│       └── custom-qrs/        # 👨‍💼 Panel de administración
├── lib/
│   └── qr-custom.ts           # 🛠️ Utilidades del sistema
└── prisma/
    └── schema.prisma          # 🗄️ Modelos CustomQr y CustomQrBatch
```

### 🗄️ **Modelos de Base de Datos**

#### **CustomQr**
```prisma
model CustomQr {
  id                String    @id @default(cuid())
  // Datos del cliente
  customerName      String
  customerWhatsapp  String
  customerPhrase    String?
  customData        String?
  // Personalización
  theme             String    @default("default")
  // Seguridad y control
  code              String    @unique
  signature         String
  isActive          Boolean   @default(true)
  expiresAt         DateTime?
  redeemedAt        DateTime?
  redeemedBy        String?
  // Lotes y campañas
  batchId           String?
  campaignName      String?
  // Metadata
  createdAt         DateTime  @default(now())
  ipAddress         String?
  userAgent         String?
}
```

#### **CustomQrBatch**
```prisma
model CustomQrBatch {
  id          String    @id @default(cuid())
  name        String
  description String?
  theme       String    @default("default")
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  qrs         CustomQr[]
}
```

### 🔐 **Seguridad**

#### **Validación HMAC**
- **Firma Digital**: Cada QR tiene firma HMAC-SHA256
- **Prevención de Manipulación**: Verificación de integridad
- **Secret Key**: Configurado en `CUSTOM_QR_HMAC_SECRET`

#### **Validaciones de Datos**
- **Rate Limiting**: Prevención de spam por IP
- **Validación WhatsApp**: Formato peruano específico
- **Unicidad**: Un QR activo por cliente
- **Expiración**: Control temporal automático

### 🎨 **Temas Disponibles**

| Tema | Color QR | Color Fondo | Descripción |
|------|----------|-------------|-------------|
| `default` | `#000000` | `#FFFFFF` | Clásico |
| `christmas` | `#DC2626` | `#FEF3C7` | Navideño |
| `halloween` | `#F97316` | `#451A03` | Terrorífico |
| `summer` | `#059669` | `#ECFDF5` | Tropical |
| `birthday` | `#7C3AED` | `#F3E8FF` | Festivo |

## 📡 API Endpoints

### **Públicas (sin auth)**
- `GET /qr-generator` → Página del generador
- `POST /api/qr/generate` → Crear QR personalizado
- `GET /qr/[code]` → Página de redención

### **Admin (requiere ADMIN)**
- `GET /api/admin/custom-qrs` → Listar QR con paginación
- `POST /api/admin/custom-qrs/[id]/redeem` → Redimir QR
- `GET /api/admin/custom-qrs/stats` → Estadísticas
- `GET /api/admin/custom-qrs/export-csv` → Exportar datos
- `GET /api/admin/custom-qrs/print-batch` → Imprimir lote

## 📊 Dashboard de Estadísticas

### **Métricas Principales**
- **Total Creados**: Número total de QR generados
- **Total Redimidos**: QR canjeados por personal
- **Total Activos**: QR válidos disponibles
- **Total Expirados**: QR fuera de fecha

### **Análisis Avanzado**
- **Por Tema**: Popularidad de cada tema visual
- **Por Campaña**: Rendimiento de campañas específicas
- **Tendencias Diarias**: Creación y redención por día
- **Geográfico**: Análisis por zona horaria (Lima, Perú)

## 🖨️ Sistema de Impresión

### **Integración con Templates**
- **Templates Existentes**: Reutilización del sistema de impresión
- **QR Optimizados**: Tamaño y calidad para impresión
- **Layout A4**: Múltiples QR por página
- **PDF Export**: Descarga directa para imprentas

### **Proceso de Impresión**
1. **Seleccionar Lote**: Por campaña o fecha
2. **Elegir Template**: Diseño de impresión
3. **Generar PDF**: Composición automática
4. **Descargar**: Archivo listo para impresión

## 🌍 Consideraciones Regionales

### **Zona Horaria**
- **America/Lima (PET)**: Todas las fechas y horas
- **Formato Local**: DD/MM/YYYY HH:mm
- **Cálculos de Expiración**: Basados en hora de Lima

### **Validaciones Locales**
- **WhatsApp Perú**: +51 9XXXXXXXX (9 dígitos)
- **Nombres**: Soporte para caracteres especiales (ñ, á, é, etc.)
- **Moneda**: Referencias en soles peruanos

## 🔧 Configuración

### **Variables de Entorno**
```bash
# Seguridad
CUSTOM_QR_HMAC_SECRET=your-secret-key-here

# URLs
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Base de datos (ya configurado)
DATABASE_URL=postgresql://...
```

### **Dependencias**
- **qrcode**: Generación de QR
- **crypto**: Firmas HMAC
- **Prisma**: ORM de base de datos
- **Next.js**: Framework web

## 🚀 Próximas Funcionalidades

### **Fase 2: Avanzadas**
- [ ] **Campos Configurables**: Admin define qué campos mostrar
- [ ] **Temas Personalizados**: Colores completamente personalizables
- [ ] **Notificaciones WhatsApp**: Envío automático al crear QR
- [ ] **Integración CRM**: Sincronización con clientes existentes

### **Fase 3: Escalabilidad**
- [ ] **API de Terceros**: Integración con servicios externos
- [ ] **Analytics Avanzado**: Google Analytics, Facebook Pixel
- [ ] **Multi-tenancy**: Soporte para múltiples venues
- [ ] **Cache Distribuido**: Redis para alta performance

## 📞 Soporte

Para soporte técnico o preguntas sobre el sistema:
- **Documentación**: Este archivo README
- **Código**: Revisar implementación en `/src/lib/qr-custom.ts`
- **Base de Datos**: Modelos en `/prisma/schema.prisma`

---

**Desarrollado para Go Lounge** 🎭✨</content>
<parameter name="filePath">d:\APPLOUNGE_TOKEN_FINAL_NOV\tokensapp\docs\custom-qr-system.md