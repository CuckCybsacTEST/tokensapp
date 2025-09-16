# Multi-stage Dockerfile for Next.js (App Router) + Prisma
# Suitable for Railway/Render/Fly single-instance deployments

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm@9 && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then npm i -g yarn && yarn install --frozen-lockfile; \
  else npm install; fi

# Rebuild prisma client after copying schema
FROM deps AS prisma
COPY prisma ./prisma
RUN npx prisma generate

# Build the application
FROM prisma AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
# Ensure env defaults for build (DATABASE_URL may be unused at build but prisma generate might need it)
ENV DATABASE_URL="file:./prisma/dev.db"
RUN npm run build

# Production image, copy needed artifacts
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nextjs

# Copy node_modules and production build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

# Expose port (Railway sets PORT env)
ENV PORT=3000
EXPOSE 3000

# Health environment defaults
ENV PUBLIC_BASE_URL=http://localhost:3000

# Start command
USER nextjs
CMD ["npm", "start"]
