---
name: droob-backend
description: Droob Backend API — Express + Drizzle ORM + PostgreSQL + Redis on Fly.io. Build, run, and deploy the backend service for the Droob smart transit app in Amman, Jordan.
---

# Droob Backend Skill

## Architecture

- **Runtime**: Node.js 20+ with Express.js 5
- **Database**: PostgreSQL 16 + PostGIS 3.4 (spatial queries for transit routing)
- **ORM**: Drizzle ORM (type-safe SQL queries)
- **Cache**: Redis 7 (session store, rate limiting, OSRM cache)
- **Routing Engine**: OSRM (Open Source Routing Machine) on port 5000
- **Authentication**: JWT (access + refresh tokens), bcrypt password hashing
- **Real-time**: WebSocket via `ws` library (trip tracking, driver location)

## Directory Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   │   ├── auth.ts      # POST /auth/login, /auth/register, /auth/refresh
│   │   ├── trips.ts     # Trip CRUD, booking, status
│   │   ├── routes.ts    # Transit routes and stops (PostGIS)
│   │   ├── users.ts     # User profile management
│   │   ├── fares.ts     # Fare calculation and lookup
│   │   ├── admin.ts     # Admin dashboard endpoints
│   │   └── health.ts    # GET /health
│   ├── middleware/
│   │   ├── auth.ts      # JWT verification middleware
│   │   ├── cors.ts      # CORS configuration (restricted origins)
│   │   └── rateLimit.ts # Rate limiting middleware
│   ├── db/
│   │   ├── index.ts     # Database connection pool
│   │   ├── schema.ts    # Drizzle schema definitions
│   │   └── migrate.ts   # Migration runner
│   ├── services/
│   │   ├── osrm.ts      # OSRM routing service client
│   │   ├── redis.ts     # Redis client and cache helpers
│   │   └── websocket.ts # WebSocket manager
│   └── index.ts         # App entry point
├── drizzle/             # Drizzle migrations
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Build & Run Commands

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Build TypeScript
npm run build

# Start production server
npm start

# Development with hot reload
npm run dev
```

## Required Environment Variables

| Variable        | Description                          | Example                                          |
|-----------------|--------------------------------------|--------------------------------------------------|
| `DATABASE_URL`  | PostgreSQL connection string         | `postgresql://user:pass@host:5432/droob`         |
| `JWT_SECRET`    | Secret key for JWT signing           | `openssl rand -base64 64`                        |
| `REDIS_URL`     | Redis connection string              | `redis://:password@host:6379`                    |
| `OSRM_URL`      | OSRM routing service URL             | `http://localhost:5000`                          |
| `PORT`          | Server port (default: 3000)          | `3000`                                           |
| `NODE_ENV`      | Environment mode                     | `production` / `development`                     |
| `SMTP_HOST`     | Email SMTP server                    | `smtp.gmail.com`                                 |
| `SMTP_PORT`     | Email SMTP port                      | `587`                                            |
| `SMTP_USER`     | Email sender address                 | `noreply@droob-jo.com`                           |
| `SMTP_PASS`     | Email app password (set via secrets) | (from fly secrets)                               |
| `CORS_ORIGIN`   | Allowed CORS origins                 | `https://droob-jo.com,https://admin.droob-jo.com`|

**IMPORTANT**: Never store secrets in `.env` files. Use `fly secrets set` for production.

## Port

- Default: **3000**
- Health check: `GET /health` → `{ "status": "ok", "uptime": 123 }`

## API Routes Summary

All routes are prefixed with `/api/v1`:

| Method | Path                  | Auth     | Description              |
|--------|-----------------------|----------|--------------------------|
| POST   | /auth/register        | None     | Register new user        |
| POST   | /auth/login           | None     | Login, get JWT tokens    |
| POST   | /auth/refresh         | Refresh  | Refresh access token     |
| GET    | /routes               | None     | List transit routes      |
| GET    | /routes/:id/stops     | None     | Get stops for a route    |
| GET    | /stops/nearby         | None     | Find nearby stops (geo)  |
| POST   | /trips/plan           | JWT      | Plan a trip (OSRM)       |
| GET    | /trips/:id            | JWT      | Get trip details         |
| POST   | /trips/:id/confirm    | JWT      | Confirm/start trip       |
| GET    | /fares/calculate      | None     | Calculate fare estimate  |
| GET    | /admin/stats          | Admin    | Dashboard statistics     |
| GET    | /health               | None     | Health check             |

## Constraints & Warnings

1. **PostGIS required** — Spatial queries depend on PostGIS extension enabled
2. **OSRM must be running** — Trip planning fails without OSRM on port 5000
3. **Redis should have AUTH in production** — Set password via `REDIS_URL`
4. **JWT tokens expire** — Access: 15min, Refresh: 7 days
5. **CORS is restricted** — Only `droob-jo.com` and `admin.droob-jo.com` allowed
6. **No hardcoded secrets** — All secrets via environment variables or fly secrets
7. **WebSocket requires JWT** — WS connections must include valid token

## Verification Checklist

- [ ] `npm run build` succeeds with 0 TypeScript errors
- [ ] `npm start` listens on port 3000
- [ ] `GET /health` returns `200 OK`
- [ ] Database connection pool is alive
- [ ] Redis connection is alive
- [ ] OSRM is reachable from the backend
- [ ] All secrets are in fly secrets, NOT in fly.toml
- [ ] CORS rejects unauthorized origins
