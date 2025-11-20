# 🚀 Guía de Despliegue - Sistema de Menú Digital

## 📋 Requisitos de Producción

### Infraestructura
- **Servidor**: Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **CPU**: 2+ cores
- **RAM**: 4GB+ mínimo, 8GB+ recomendado
- **Disco**: 20GB+ SSD
- **Base de Datos**: PostgreSQL 13+
- **Dominio**: SSL obligatorio

### Servicios Externos
- **Railway** (recomendado) o **Vercel** + **Neon** para BD
- **CDN**: Cloudflare o similar para assets
- **Monitoring**: Sentry o similar para errores

---

## ☁️ Despliegue en Railway (Configuración Optimizada)

### Objetivos de la Configuración
- Builds predecibles sin timeouts
- Imagen final pequeña y rápida
- Compatibilidad con dependencias nativas (sharp)
- PostgreSQL en producción confirmado

### Cambios Clave Implementados

#### 1. Next.js en Modo Standalone
- `next.config.mjs` define `output: 'standalone'`
- Dockerfile copia solo `.next/standalone` + `.next/static` + `public`
- Arranque con `node server.js`

#### 2. Sharp con Lazy Loading
```ts
async function getSharp() {
  const m = await import('sharp');
  return m.default || (m as any);
}
```

#### 3. Dockerfile Optimizado
- Base: `public.ecr.aws/docker/library/node:20-alpine`
- Etapas: `deps` → `prisma` → `builder` → `runner`
- Variables de memoria: `NODE_OPTIONS=--max_old_space_size=2048`

#### 4. Variables de Entorno Requeridas
```bash
DATABASE_URL="postgresql://..."  # DSN PostgreSQL
TOKEN_SECRET="clave-segura"      # Para firmar tokens
PUBLIC_BASE_URL="https://tu-app.railway.app"
ALLOW_MIGRATIONS=1               # Solo primera vez
```

### Flujo de Despliegue en Railway
1. Configurar variables de entorno
2. Para BD nueva: `ALLOW_MIGRATIONS=1`
3. Desplegar y verificar logs
4. Ejecutar smoke tests
5. Desactivar `ALLOW_MIGRATIONS`

---

## 🐳 Despliegue con Docker

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Build de la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Comando de inicio
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/lounge_db
      - NEXTAUTH_SECRET=your-secret-key
      - NEXTAUTH_URL=https://yourdomain.com
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=lounge_db
      - POSTGRES_USER=lounge_user
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### Comando de Despliegue
```bash
# Build y deploy
docker-compose up -d --build

# Ver logs
docker-compose logs -f app

# Scaling
docker-compose up -d --scale app=3
```

---

## ☁️ Despliegue en Railway

### 1. Configuración del Proyecto
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Conectar base de datos
railway add postgresql
```

### 2. Variables de Entorno
```bash
# Configurar variables
railway variables set DATABASE_URL=postgresql://...
railway variables set NEXTAUTH_SECRET=your-secret
railway variables set NEXTAUTH_URL=https://your-app.railway.app
railway variables set NODE_ENV=production
```

### 3. Despliegue
```bash
# Deploy automático desde Git
git push railway main

# Ver logs
railway logs

# Ver variables
railway variables
```

---

## ⚙️ Configuración de Producción

### Variables de Entorno (.env.production)
```env
# Base de datos
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# NextAuth.js (futuro)
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://yourdomain.com"

# Socket.IO
SOCKET_IO_PORT=3001
SOCKET_IO_CORS_ORIGIN="https://yourdomain.com"

# Features
NEXT_PUBLIC_BIRTHDAYS_ENABLED=true
NEXT_PUBLIC_ANALYTICS_ID="GA-XXXXXXXXX"

# Email (futuro)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="app-password"

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"

# Redis (futuro)
REDIS_URL="redis://username:password@host:port"
```

### Configuración Next.js (next.config.mjs)
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones de producción
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Optimización de imágenes
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/webp', 'image/avif'],
  },

  // Experimental features
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
};

export default nextConfig;
```

---

## 🗄️ Configuración de Base de Datos

### PostgreSQL en Producción
```sql
-- Crear usuario específico
CREATE USER lounge_user WITH PASSWORD 'secure_password';
CREATE DATABASE lounge_db OWNER lounge_user;

-- Permisos
GRANT ALL PRIVILEGES ON DATABASE lounge_db TO lounge_user;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### Migraciones Prisma
```bash
# Ejecutar migraciones en producción
npx prisma migrate deploy

# Generar cliente
npx prisma generate

# Verificar conexión
npx prisma db push --preview-feature
```

### Backup Automático
```bash
# Script de backup diario
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U lounge_user -h localhost lounge_db > backup_$DATE.sql

# Subir a S3 o similar
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

---

## 🔒 Seguridad en Producción

### SSL/TLS
```nginx
# Configuración Nginx (ejemplo)
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /api/socketio {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Rate Limiting
```javascript
// middleware.js
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

export default limiter;
```

### CORS Configuration
```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ];
  },
};
```

---

## 📊 Monitoreo y Logs

### Configuración Sentry
```javascript
// pages/_app.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Logs Estructurados
```javascript
// lib/logger.js
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export default logger;
```

### Health Checks
```javascript
// pages/api/health.js
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
  });
}
```

---

## 🚦 Monitoreo de Rendimiento

### Métricas Clave
- **Response Time**: < 200ms APIs, < 3s páginas
- **Error Rate**: < 1%
- **Uptime**: > 99.9%
- **Memory Usage**: < 80% del límite
- **Database Connections**: Monitorizar pool

### Alertas
- Error rate > 5%
- Response time > 500ms
- Memory usage > 90%
- Database connection errors
- Socket.IO connection failures

---

## 🔄 Estrategia de Backup y Recovery

### Backup Programado
```bash
# Crontab para backup diario
0 2 * * * /path/to/backup-script.sh

# Backup semanal completo
0 3 * * 0 /path/to/full-backup-script.sh
```

### Recovery Plan
1. **Database**: `pg_restore` desde último backup
2. **Application**: Re-deploy desde último commit estable
3. **Assets**: Restaurar desde CDN backup
4. **DNS**: Verificar configuración

### Pruebas de Recovery
- ✅ Backup restoration test mensual
- ✅ Failover test trimestral
- ✅ Data integrity verification

---

## 📈 Escalabilidad

### Horizontal Scaling
```javascript
// Configuración PM2 para clustering
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'lounge-menu',
    script: 'npm start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

### Database Scaling
- Read replicas para consultas
- Connection pooling (PgBouncer)
- Query optimization y índices
- Caché Redis para datos frecuentes

### CDN para Assets
- Imágenes servidas desde CDN
- JS/CSS minificados y comprimidos
- Cache headers optimizados

---

## 🧪 Checklist de Pre-Despliegue

### ✅ Funcionalidades
- [ ] APIs responden correctamente
- [ ] Socket.IO funciona en producción
- [ ] Base de datos migrada
- [ ] Datos iniciales cargados
- [ ] Autenticación configurada (futuro)

### ✅ Seguridad
- [ ] SSL configurado
- [ ] Variables de entorno seguras
- [ ] CORS configurado
- [ ] Rate limiting activo
- [ ] Headers de seguridad

### ✅ Rendimiento
- [ ] Imágenes optimizadas
- [ ] Bundle analizado
- [ ] Caché configurado
- [ ] CDN activo

### ✅ Monitoreo
- [ ] Logs configurados
- [ ] Métricas activas
- [ ] Alertas configuradas
- [ ] Health checks funcionales

### ✅ Backup
- [ ] Estrategia de backup implementada
- [ ] Recovery test realizado
- [ ] Documentación de procedimientos

---

## 📞 Contactos de Emergencia

### Desarrollo
- **Lead Developer**: dev@ellounge.com
- **DevOps**: infra@ellounge.com

### Operaciones
- **Manager**: manager@ellounge.com
- **Soporte**: support@ellounge.com

### Proveedores
- **Railway**: support@railway.app
- **PostgreSQL**: Soporte del proveedor
- **CDN**: Soporte del proveedor

---

**Versión de Despliegue**: 1.0.0
**Fecha**: Octubre 2025
**Responsable**: Equipo de Desarrollo El Lounge</content>
<parameter name="filePath">d:\VERSION ESTABLE_BACKUP_NEW_WORKING\tokensapp\docs\deployment.md