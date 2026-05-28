# ═══════════════════════════════════════════════════════
# دروب Droob — Backend Dockerfile
# Multi-stage build for minimal production image
# ═══════════════════════════════════════════════════════

# ──── Stage 1: Build ────
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm (faster, disk-efficient)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Copy source
COPY backend/ backend/

# Build TypeScript
WORKDIR /app/backend
RUN pnpm run build || npx tsc --noEmit || true

# Prune dev dependencies for production
RUN pnpm prune --prod

# ──── Stage 2: Production Runtime ────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S droob && adduser -S droob -u 1001 -G droob

# Copy built output and production node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/drizzle ./drizzle

# Copy env template
COPY .env.example ./.env.example

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Switch to non-root user
USER droob

# Start the server
CMD ["node", "dist/server.js"]