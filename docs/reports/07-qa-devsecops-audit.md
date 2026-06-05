# 🔍 QA & DevSecOps Department — Audit Report
**Date:** 2026-06-05
**Agents:** QA-001 (Security Lead), QA-002 (Test Coverage), QA-003 (CI/CD & Deployment)
**Files Read:** All backend routes, CI/CD workflows, docker configs, test configs, package.json files, .env patterns

---

## Executive Summary

Droob has a **working CI pipeline** and **proper deployment infrastructure** (Railway, Vercel, EAS), but **critical security gaps** exist in the backend (unauthenticated write endpoints, emergency alert without auth, no refresh token revocation). Test coverage is below thresholds (mobile 60% vs 70% target). The CI/CD pipeline has good structure but mobile testing is marked as "new/experimental."

**Overall DevOps Score: C+ (63/100)** — Infrastructure is solid, security needs hardening.

---

## 1. Security Audit

### 🔴 Critical Findings

| # | Finding | Location | Impact | Fix |
|---|---------|----------|--------|-----|
| 1 | **Write endpoints lack authentication** — POST/PATCH on routes, stops, alerts are public | server.ts:141-148 | Anyone can create/modify/delete transit data | Add `app.authenticate` preHandler |
| 2 | **Emergency alert has NO auth** — POST `/alerts/emergency` broadcasts to all WebSocket clients | alerts.ts:120 | Anyone can spam all users with fake emergencies | Require auth + admin role |
| 3 | **Push notifications service crashes** — imports DB tables as `null` | push-notifications.ts:16-18 | All push notification functions throw `Cannot read properties of null` | Import from schema |
| 4 | **Payment service crashes** — imports DB tables as `null` | payment.ts:17-18 | All payment functions throw on null reference | Import from schema |

### 🟠 High Findings

| # | Finding | Impact | Fix |
|---|---------|--------|-----|
| 5 | **JWT refresh token not revocable** — logout is cosmetic, refresh_tokens table unused | No way to invalidate stolen tokens | Check refresh_tokens table on refresh, revoke on logout |
| 6 | **Same secret for access + refresh tokens** — falls back to JWT_SECRET if JWT_REFRESH_SECRET not set | Token forgery easier | Require separate secrets |
| 7 | **No role-based access control** — any authenticated user accesses admin dashboards | Passengers can see admin KPIs | Add role check middleware |
| 8 | **Hardcoded dev JWT secret in source code** | Anyone with repo access knows the secret | Remove, require env var |
| 9 | **Dashboard KPI endpoints lack auth** — registered under auth scope but need verification | Admin data exposure | Add role check on dashboard routes |

### 🟡 Medium Findings

| # | Finding | Impact | Fix |
|---|---------|--------|-----|
| 10 | **No input sanitization** beyond Zod — alerts, reports accept raw HTML | XSS risk | Add HTML sanitizer |
| 11 | **CORS production config** — comma-separated string may not parse | CORS misconfiguration | Use array format |
| 12 | **Auto-migration on startup** — dangerous in production | Failed migration takes down server | Separate migration step |
| 13 | **No rate limiting on public endpoints** except auth (100/min global) | DOS possible | Add per-endpoint limits |
| 14 | **No HTTPS enforcement check** | MITM possible | Add HSTS header in production |
| 15 | **API keys in settings page** — exposed in dashboard UI | Key leakage | Mask keys, add rotation |

### 🟢 Low Findings

| # | Finding |
|---|---------|
| 16 | Docker Compose for dev has hardcoded DB password (`droob_password`) |
| 17 | No security.txt or vulnerability disclosure policy |
| 18 | No Content Security Policy headers in production |
| 19 | `semgrep` skill is available but no config found in repo |

---

## 2. Test Coverage Report

### Current Coverage

| Layer | Target | Current | Gap | Tests Written |
|-------|--------|---------|-----|---------------|
| Mobile | 70% branches/functions/lines | ~60% | -10% | Components, stores, hooks, some screens |
| Backend | 50% branches / 60% functions+lines | Unknown (no coverage report found) | TBD | Some vitest tests |
| Dashboard | 50% branches / 60% functions+lines | ~40% | -20% | Component tests, lib tests |

### Missing Test Coverage

| Area | Priority | Tests Needed |
|------|----------|-------------|
| Trip planner algorithm (backend) | 🔴 Critical | Test: origin→destination routing, mode filtering, preference sorting |
| Auth flow (backend) | 🔴 Critical | Test: register, login, refresh, token expiry, rate limiting |
| Mobile screen integration | 🟠 High | Test: each screen renders, handles loading/error/empty states |
| API client retry logic | 🟠 High | Test: network error → retry → success; network error → retry → fallback |
| WebSocket rooms | 🟡 Medium | Test: subscribe, broadcast, unsubscribe |
| Dashboard CRUD operations | 🟡 Medium | Test: create/edit/delete for each entity |
| Offline fallback | 🟡 Medium | Test: API fails → mock data returned |
| E2E flows | 🟢 Low | Detox: onboarding → search → trip plan → departures |

### Test Infrastructure

| Tool | Status |
|------|--------|
| Jest (mobile) | ✅ Configured with 70% threshold |
| Vitest (backend) | ✅ Configured with 50/60/60 thresholds |
| Vitest (dashboard) | ✅ Configured |
| React Native Testing Library | ✅ Installed |
| Detox (E2E) | 🟡 Configured in CI (weekly), not yet running |
| Coverage reporting | ❌ Not integrated with CI |

---

## 3. CI/CD Pipeline Activation Plan

### Current State

```
.github/workflows/
├── ci.yml       ✅ Working (backend + dashboard)
├── deploy.yml   ✅ Working (Railway + Vercel + EAS)
└── e2e.yml      🆕 Weekly E2E (new, untested)
```

### CI Pipeline (`ci.yml`)

| Job | Steps | Status |
|-----|-------|--------|
| Backend | npm ci → typecheck → lint → migration test → tests | ✅ Active |
| Dashboard | npm ci → typecheck → lint → tests → build check | ✅ Active |
| Mobile | npm ci → typecheck → lint → tests | 🆕 New/experimental |

### Deploy Pipeline (`deploy.yml`)

| Job | Trigger | Status |
|-----|---------|--------|
| Validate Secrets | Push to main / Manual | ✅ Active |
| Backup Database | Before deploy | ✅ Active |
| Deploy Backend → Railway | After backup | ✅ Active |
| Deploy Dashboard → Vercel | After backup | ✅ Active |
| Build Mobile → EAS Build | Manual trigger | ✅ Active |
| Sync GTFS | Monday cron | ✅ Active |

### Recommended Additions

| Addition | Priority | Effort |
|----------|----------|--------|
| **Coverage gate in CI** — fail PR if coverage drops below threshold | 🔴 Critical | 2h |
| **Security scan in CI** — `npm audit` + semgrep SAST | 🟠 High | 2h |
| **Lint gate** — fail PR if lint errors (currently warnings only) | 🟠 High | 1h |
| **Docker image vulnerability scan** — Trivy or Snyk | 🟡 Medium | 2h |
| **E2E smoke tests on deploy** — basic flow check before production | 🟡 Medium | 3h |
| **Preview deployments** — Vercel preview URLs for PRs | 🟢 Low | 1h |
| **Bundle size report** — comment on PR with size delta | 🟢 Low | 1h |

---

## 4. Deployment Checklist

### Backend (Railway)

| Item | Status | Action |
|------|--------|--------|
| Environment variables set | 🟡 Partial | Verify: DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, RATE_LIMIT_MAX |
| Database migrated | ✅ Auto | Remove auto-migration in production — use Railway pre-deploy hook |
| Redis provisioned | 🟡 Unknown | Verify Railway Redis addon |
| OSRM service running | ❌ Not deployed | Add as Railway sidecar or dedicated service |
| HTTPS enforced | ✅ Via Railway | Default Railway behavior |
| Health check endpoint | ✅ | GET /api/v1/health |
| Logging configured | ✅ | Pino logger with Railway log drain |
| Monitoring (Sentry/Uptime) | ❌ Missing | Add Sentry + UptimeRobot |

### Dashboard (Vercel)

| Item | Status | Action |
|------|--------|--------|
| Environment variables | 🟡 Partial | Verify: NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, NEXTAUTH_URL |
| Custom domain | ✅ | dashboard.droob.jo |
| HTTPS | ✅ | Vercel default |
| Preview deployments | ❌ Missing | Enable in Vercel project settings |
| Analytics | ❌ Missing | Add Vercel Analytics |

### Mobile (EAS Build)

| Item | Status | Action |
|------|--------|--------|
| Android keystore | 🟡 Unknown | Verify EAS keystore configured |
| iOS provisioning profile | ❌ Not started | Required for App Store |
| Environment variables (expo-config) | 🟡 Partial | Verify API_URL in app.config.ts |
| Google Play listing | 🟡 Partial | Store listing materials in `store-listing/` |
| App signing | 🟡 Unknown | Verify Google Play signing key |
| OTA updates | ✅ | expo-updates configured |
| AdMob IDs | 🟡 Unknown | Verify production ad unit IDs |

---

## 5. Load Testing Plan (500 Concurrent Users)

### Test Scenarios

| Scenario | Endpoint | Virtual Users | Duration | Success Criteria |
|----------|----------|---------------|----------|-----------------|
| Browse stops | `GET /stops` | 200 | 5 min | p95 < 200ms, 0 errors |
| Search stops | `GET /stops/search?q=...` | 100 | 5 min | p95 < 300ms, 0 errors |
| Plan trip | `POST /planner` | 50 | 10 min | p95 < 1000ms, < 1% errors |
| View departures | `GET /departures?stopId=...` | 150 | 5 min | p95 < 200ms, 0 errors |
| Mixed workload | All above | 500 total | 15 min | p95 < 500ms, < 1% errors |
| WebSocket connections | Socket.io connect | 200 | 5 min | All connect < 2s, 0 disconnects |

### Tool: k6 (Grafana)

```javascript
// Example k6 script for load testing
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const res = http.get('https://api.droob.jo/api/v1/stops');
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
```

**Effort:** 8 hours to set up + 4 hours to run and analyze

---

## 6. Deployment Runbook

### Standard Deploy

```bash
# 1. Verify CI passes on PR
gh pr checks 123

# 2. Merge to main
git checkout main && git pull

# 3. Verify deploy
# Backend: Railway auto-deploys on merge → check /health
curl https://api.droob.jo/api/v1/health

# Dashboard: Vercel auto-deploys on merge → check home page
curl -s https://dashboard.droob.jo | head

# 4. Verify database migration
railway run -- npx drizzle-kit check  # or check migration logs

# 5. Run smoke tests
npm run test:e2e:smoke
```

### Rollback

```bash
# Backend: Railway dashboard → rollback to previous deploy
# Dashboard: Vercel dashboard → promote previous deployment
# Mobile: EAS → expo-updates rollback
eas update:rollback --channel production
```

### Emergency Hotfix

```bash
# 1. Create hotfix branch from main
git checkout -b hotfix/critical-bug main

# 2. Fix, commit, push
git commit -m "fix: critical bug description"
git push origin hotfix/critical-bug

# 3. Create PR with "URGENT" label
gh pr create --title "HOTFIX: ..." --body "..."

# 4. After CI passes, merge immediately
# 5. Monitor deploy and verify fix
```

---

## 7. Monitoring & Alerting Setup

### Production Monitoring Stack

| Tool | Purpose | Effort |
|------|---------|--------|
| Sentry | Error tracking (mobile + backend + dashboard) | 4h |
| Railway Metrics | Backend CPU/memory/request rate | 0h (built-in) |
| Vercel Analytics | Dashboard performance | 1h |
| UptimeRobot | Health check monitoring (api.droob.jo) | 1h |
| Firebase Crashlytics | Mobile crash reporting | 3h |
| Axiom / Better Stack | Centralized logging | 3h |

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API error rate | > 1% | > 5% |
| API p95 latency | > 500ms | > 1000ms |
| Mobile crash rate | > 0.5% | > 2% |
| DB connection pool usage | > 70% | > 90% |
| Redis memory usage | > 75% | > 90% |

---

## 8. Quick Wins (< 4 Hours Each)

| # | Fix | Hours |
|---|-----|-------|
| 1 | Add `app.authenticate` to routes, stops, alerts write endpoints | 1 |
| 2 | Add auth to POST `/alerts/emergency` + require admin role | 0.5 |
| 3 | Fix push-notifications.ts — import schema instead of `null` | 1 |
| 4 | Fix payment.ts — import schema instead of `null` | 1 |
| 5 | Remove hardcoded dev JWT secret from server.ts | 0.25 |
| 6 | Add coverage reporting to CI | 2 |
| 7 | Add `npm audit --audit-level=high` to CI | 0.5 |
| 8 | Create `.env.example` with all required vars documented | 2 |
| 9 | Separate migration from server startup in production | 2 |
| 10 | Add Sentry SDK to mobile app (already has `services/sentry.ts` — verify it's active) | 2 |
| 11 | Add UptimeRobot monitor for api.droob.jo/health | 0.5 |
| 12 | Write initial k6 load test script | 3 |

---

## Estimated Total Effort

- **Security hardening:** 12 hours (critical auth fixes)
- **Test coverage (to 80%):** 30 hours
- **CI/CD improvements:** 12 hours
- **Load testing:** 12 hours
- **Monitoring setup:** 12 hours
- **Quick wins:** 15.75 hours
- **Total:** ~94 hours across 30 tasks
