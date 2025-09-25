# Multi-stage Dockerfile for Next.js (App Router) + Prisma
# Suitable for Railway/Render/Fly single-instance deployments

ARG NODE_VERSION=20

# Use AWS Public ECR mirror of Docker Official Images (avoids Docker Hub rate limits)
FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-alpine AS base
USER root
RUN apk add --no-cache openssl ca-certificates libc6-compat
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
# Copy only schema first so postinstall (prisma generate) has it available
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  # Allow lifecycle scripts so native modules like sharp can fetch/build binaries
  # Prisma Client will also run its postinstall; that's OK (we still run generate explicitly later)
  if [ -f package-lock.json ]; then npm ci --no-audit --fund=false; \
  elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm@9 && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then npm i -g yarn && yarn install --frozen-lockfile; \
  else npm install; fi

# Rebuild prisma client after copying schema
FROM deps AS prisma
COPY prisma ./prisma
RUN npx prisma generate

# Build the application
FROM prisma AS builder
ENV NEXT_TELEMETRY_DISABLED=1 \
  NODE_OPTIONS=--max_old_space_size=2048 \
  NEXT_PRIVATE_BUILD_WORKERS=2
COPY . .
# Ensure env defaults for build (fake Postgres DSN just to satisfy modules that read env at build time)
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build_db"
RUN npm run build

# Production image, copy needed artifacts
FROM public.ecr.aws/docker/library/node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

USER root
RUN apk add --no-cache openssl ca-certificates libc6-compat

# Copy standalone output instead of full node_modules to minimize runtime image
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts/docker-start.sh ./docker-start.sh

# Expose port (Railway sets PORT env)
ENV PORT=3000
EXPOSE 3000

# Health environment defaults
ENV PUBLIC_BASE_URL=http://localhost:3000

# Ensure runtime has permissions over app dirs that may require writes
RUN chown -R node:node /app/.next /app/public /app/prisma || true

# Start command via entrypoint script (auto prisma db push for SQLite)
RUN chmod +x /app/docker-start.sh
USER node
CMD ["/bin/sh", "/app/docker-start.sh"]
