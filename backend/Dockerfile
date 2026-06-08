# ═══════════════════════════════════════════════════════
# دروب Droob — Backend Dockerfile (Railway)
# Uses tsx to run TypeScript directly (no build step)
# ═══════════════════════════════════════════════════════

FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production=false --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
COPY drizzle ./drizzle

RUN addgroup -g 1001 -S droob && adduser -S droob -u 1001 -G droob
USER droob

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["npx", "tsx", "src/server.ts"]
