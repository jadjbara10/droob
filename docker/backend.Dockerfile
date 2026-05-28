# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/tsconfig.json backend/

WORKDIR /app/backend
RUN npm ci

COPY backend/src ./src
COPY backend/drizzle ./drizzle

RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/drizzle ./drizzle

RUN addgroup -g 1001 -S droob && adduser -S droob -u 1001 -G droob
USER droob

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]