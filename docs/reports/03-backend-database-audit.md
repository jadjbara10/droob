# 🗄️ Database & Backend Department — Audit Report
**Date:** 2026-06-05
**Agents:** BE-001 (Schema Lead), BE-002 (API Performance), BE-003 (Security), BE-004 (Real-time Systems)
**Files Read:** 22 backend source files, drizzle schema (23 tables), migrations, configs

---

## Executive Summary

The backend is **architecturally sound** with proper Fastify patterns, Drizzle ORM, Zod validation, and Redis caching. However, **critical security gaps** exist (write endpoints lack authentication), **two services are stubbed to null** (push-notifications, payments), and **performance bottlenecks** will emerge at scale (full table scans, N+1 Redis queries). The trip planner algorithm is functional but limited to direct routes — no multi-leg transfer search.

**Overall Backend Score: B- (68/100)** — Solid foundation, critical gaps for production.

---

## 1. Database Schema Audit

### Table Inventory (23 tables defined)

| # | Table | Status | Used By Routes | Indexes |
|---|-------|--------|----------------|---------|
| 1 | `governorates` | ✅ Active | seed.ts | 1 |
| 2 | `agencies` | ✅ Active | routes.ts, seed.ts | 2 |
| 3 | `stops` | ✅ Active | 5 route files + dashboard | 4 |
| 4 | `routes` | ✅ Active | 5 route files + dashboard | 4 |
| 5 | `route_stops` | ✅ Active | 4 route files + dashboard | 3 |
| 6 | `schedules` | ✅ Active | routes.ts, seed.ts | 3 |
| 7 | `trips` | ✅ Active | departures.ts, dashboard.ts | 3 |
| 8 | `vehicles` | ✅ Active | vehicles.ts, dashboard.ts | 4 |
| 9 | `alerts` | ✅ Active | alerts.ts, dashboard.ts | 3 |
| 10 | `community_reports` | ✅ Active | reports.ts | 4 |
| 11 | `users` | ✅ Active | auth.ts, dashboard.ts | 3 |
| 12 | `refresh_tokens` | ⚠️ Defined | **NOT USED by any route** | 2 |
| 13 | `fare_rules` | ⚠️ Defined | **NOT USED by any route** | 1 |
| 14 | `prayer_times` | ⚠️ Defined | **NOT USED by any route** | 1 |
| 15 | `activity_logs` | ⚠️ Defined | **NOT USED by any route** | 3 |
| 16 | `device_tokens` | 🔴 **NULL STUB** | push-notifications.ts imports `null` | 2 |
| 17 | `push_notifications` | 🔴 **NULL STUB** | push-notifications.ts imports `null` | 2 |
| 18 | `tickets` | 🔴 **NULL STUB** | payment.ts imports `null` | 4 |
| 19 | `payments` | 🔴 **NULL STUB** | payment.ts imports `null` | 3 |
| 20 | `wallet_transactions` | 🔴 **NULL STUB** | payment.ts imports `null` | 3 |
| 21 | `email_verification_codes` | ✅ Active | auth.ts | 1 |
| 22 | `ad_events` | ✅ Active | ads.ts | 4 |
| 23 | `user_subscriptions` | ✅ Active | ads.ts | 3 |

### Critical Schema Issues

1. **`geom` stored as `text`, not native geography** — Despite claiming PostGIS support, the `stops.geom` column is `text`. No spatial indexes are possible. All spatial queries use application-level Haversine, which requires full table scans.

2. **`refresh_tokens` table exists but unused** — JWT refresh tokens are signed but never stored/validated against the database. Logout is cosmetic.

3. **5 tables exist in schema but have NO route file** (fare_rules, prayer_times, activity_logs, refresh_tokens)

4. **`push-notifications.ts` and `payment.ts` import `null` instead of schema** — These services crash on any invocation:
```typescript
// services/push-notifications.ts line 16
const deviceTokens: any = null;  // Will throw: Cannot read properties of null
// services/payment.ts line 17
const payments: any = null;      // Same — insert/select on null crashes
```

---

## 2. API Performance Audit

### Endpoint Response Time Analysis

| Endpoint | Method | Expected (ms) | Bottleneck | Fix |
|----------|--------|---------------|------------|-----|
| `GET /stops` | Full table | <50ms (small data) | Full scan at 1000+ rows | Add pagination + bounding box |
| `GET /stops/nearby/:lat/:lng` | Full scan | <100ms | All-stops fetch + JS Haversine | PostGIS `ST_DWithin` |
| `GET /stops/search?q=` | ILIKE | <50ms | No trigram index | Add `pg_trgm` GIN index |
| `POST /planner` | Multi-scan | <500ms | `SELECT * FROM stops LIMIT 1000` x2 + O(n²) route matching | Spatial index + A* algorithm |
| `GET /vehicles` | Redis loop | <200ms | N+1 Redis `GET` per vehicle | Redis pipeline/MGET |
| `GET /departures?stopId=` | 2 queries | <100ms | Estimated times (Math.random for serveece) | Use real schedule data |
| `GET /dashboard/kpis` | Aggregation | <200ms | No materialized view | Redis cache (already 2min TTL) |
| `GET /alerts` | Simple query | <30ms | None | Good |

### Specific Performance Issues

1. **`GET /vehicles` N+1 Redis calls** (vehicles.ts:33-48) — For each active vehicle, makes one Redis GET. 100 vehicles = 100 sequential Redis round trips.

2. **Trip planner fetches ALL stops twice** (trip-planner.ts:106-118) — `db.select().from(stops).limit(1000)` runs twice per request. Combined with nested loop over origin×destination pairs.

3. **Redis `cacheKeys()` uses blocking `KEYS *`** (redis/index.ts:60) — In production, `KEYS` blocks Redis event loop. Use `SCAN`.

4. **Cache key includes full JSON of query params** (planner, stops, routes) — Float-precision coordinates make cache hits nearly impossible.

---

## 3. Security Audit

### 🔴 Critical: Missing Authentication on Write Endpoints

The route registration in `server.ts` does NOT apply `app.authenticate` to:
- **Routes** POST/PATCH: Anyone can create/modify routes
- **Stops** POST/PATCH: Anyone can create/modify stops
- **Alerts** POST/PATCH + POST `/emergency`: Anyone can broadcast emergency alerts
- **Reports** POST: Acceptable for crowdsourcing, but PATCH `/resolve` should require auth

### 🔴 Critical: Emergency Alert Without Auth

`POST /api/v1/alerts/emergency` broadcasts via Socket.io to ALL connected users with NO authentication. This is a significant spam/abuse vector.

### 🟠 High: Dashboard Auth Scope Issue

Dashboard routes are registered under `adminScope` which has `app.authenticate` preHandler. However, there's **no role-based check** — any authenticated user (including "passenger") can access admin KPIs.

### 🟠 High: JWT Refresh Token Not Revocable

- Same secret signs both access and refresh tokens (if `JWT_REFRESH_SECRET` not set)
- No refresh token rotation
- `POST /logout` returns success but does nothing server-side
- `refresh_tokens` table exists but is never queried

### 🟡 Medium: Hardcoded Dev Secret

```typescript
const JWT_SECRET_FINAL = JWT_SECRET || "droob-jordan-dev-secret-do-not-use-in-prod";
```

### 🟡 Medium: CORS Configuration

Production CORS uses comma-separated string that may not parse correctly with `@fastify/cors`.

---

## 4. API Endpoint Completeness

### Present: 45 endpoints across 10 route groups ✅

### Missing Endpoints

| Entity | Missing | Priority |
|--------|---------|----------|
| **Auth** | `PATCH /me` (profile update) | 🟠 High |
| **Auth** | `POST /reset-password` | 🟠 High |
| **Auth** | `DELETE /me` (account deletion — GDPR) | 🟡 Medium |
| **Routes** | `DELETE /:id` | 🟡 Medium |
| **Stops** | `DELETE /:id` | 🟡 Medium |
| **Trip Planner** | Multi-leg transfer search | 🟠 High |
| **Payments** | Webhook endpoints for payment gateways | 🔴 Critical |
| **Admin** | User management CRUD | 🟠 High |
| **Admin** | Activity log browsing | 🟡 Medium |
| **Fare Rules** | CRUD endpoints (table exists, no API) | 🟡 Medium |
| **Prayer Times** | CRUD + auto-fetch from external API | 🟢 Low |

---

## 5. Redis Caching Strategy

### Current Cache Usage

| Endpoint | Cache Key | TTL | Hit Probability |
|----------|-----------|-----|-----------------|
| Trip Planner | `planner:{JSON.stringify(params)}` | 120s | ❌ Near zero (float coords) |
| Stops nearby | `nearby:{lat}:{lng}:{radius}:{modes}` | 120s | ⚠️ Low (exact coordinate match) |
| Dashboard KPIs | `dashboard:kpis` | 120s | ✅ High |
| Vehicle positions | `vehicle:location:{id}` | 30s | ✅ High (by vehicle ID) |

### Recommended Strategy

```
HOT QUERIES (cache 5 min):
  - GET /stops (paginated, no filters)
  - GET /routes (active only)
  - GET /dashboard/kpis

WARM QUERIES (cache 2 min):
  - GET /stops/nearby (quantize coords to 3 decimal places for cache key)
  - GET /departures (by stop ID)
  - POST /planner (quantize coords)

COLD (no cache):
  - GET /stops/search (full-text, high variability)
  - POST /reports (writes)
  - Auth endpoints
```

---

## 6. WebSocket / Real-time Systems

### Current State — Grade: C

- Socket.io properly configured with rooms: `vehicle:{id}`, `line:{code}:jo`, `stop:{id}:arrivals`, `alerts:{governorate}`
- Client subscribe/unsubscribe handlers implemented
- `websocket/index.ts` is DEAD CODE — defines different event names (`join:vehicle` vs `subscribe:vehicle`) and is never imported

### Missing

- No vehicle GPS broadcast from backend (vehicles route only reads from Redis)
- No departure update push when schedule changes
- No real-time alert broadcast to rooms (POST /alerts/emergency should emit to `alerts:national`)
- No connection metrics/monitoring

---

## 7. Migration Plan for 5 Missing/Stubbed Tables

### Table 1: `device_tokens`
- **Status:** Schema exists, service imports `null`
- **Action:** Import schema in `push-notifications.ts`, register device on login, unregister on logout
- **Effort:** 3 hours

### Table 2: `push_notifications`
- **Status:** Schema exists, service imports `null`
- **Action:** Store notification history, track delivery/read counts
- **Effort:** 2 hours

### Table 3: `fare_rules`
- **Status:** Schema exists, NO route file
- **Action:** Create `/api/v1/fares` route with CRUD + distance-based fare calculation
- **Effort:** 4 hours

### Table 4: `prayer_times`
- **Status:** Schema exists, NO route file
- **Action:** Create cron job to fetch daily prayer times from external API, expose via `/api/v1/prayer-times`
- **Effort:** 3 hours

### Table 5: `activity_logs`
- **Status:** Schema exists, NO route file
- **Action:** Add logging middleware to all write endpoints, expose via `/api/v1/admin/activity`
- **Effort:** 4 hours

---

## 8. Error Handling Standardization

### Current: Inconsistent error responses

```json
// alerts.ts: { "error": "NotFound", "message": "Alert not found" }
// stops.ts: { "error": "ValidationError", "details": [...] }
// vehicles.ts: { "error": "NotFound" }  (no message!)
// dashboard.ts: { "error": "InternalError", "message": "..." }
```

### Proposed: Standardized error envelope

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;       // "NOT_FOUND", "VALIDATION_ERROR", "UNAUTHORIZED"
    message_ar: string; // Arabic message
    message_en: string; // English message
    details?: unknown;  // Validation errors, etc.
  };
}
```

**Effort:** 4 hours to create error utility + 2 hours to apply across all routes.

---

## 9. Dependencies on Other Departments

- **Needs from Mobile Dev:** Unify `transit.ts` and `transit.types.ts` to match backend response shapes
- **Needs from Dashboard:** Define KPI endpoints needed for real dashboard data
- **Provides to Mobile:** Real API endpoints for all transit data (once auth gaps fixed)
- **Provides to DevOps:** Environment variables for production deployment

---

## Estimated Total Effort
- **Critical (auth gaps, null stubs):** 12 hours
- **High (missing endpoints, error standardization):** 16 hours
- **Medium (performance optimization):** 12 hours
- **Low (prayer times, activity logs):** 8 hours
- **Total:** ~48 hours across 20 tasks
