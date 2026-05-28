# ---- Dashboard Dockerfile ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY dashboard/package.json dashboard/tsconfig.json dashboard/
COPY dashboard/next.config.ts dashboard/

WORKDIR /app/dashboard
RUN npm ci

COPY dashboard/src ./src
COPY dashboard/public ./public

RUN npm run build

# ---- Runner ----
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dashboard/.next ./.next
COPY --from=builder /app/dashboard/package.json ./
COPY --from=builder /app/dashboard/node_modules ./node_modules
COPY --from=builder /app/dashboard/public ./public

RUN addgroup -g 1001 -S droob && adduser -S droob -u 1001 -G droob
USER droob

EXPOSE 3000

CMD ["npm", "start"]