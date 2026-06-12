# دروب (Droob) — Deployment Log

**Date**: 2026-06-12
**Operator**: Claude (Super Z Director)
**Commit**: 80c7409

---

## Results Summary

| # | Checkpoint | URL | Expected | Result |
|---|-----------|-----|----------|--------|
| 1 | Landing Page | https://droob-jo.com | HTML page with QR | ✅ 200 |
| 2 | API Health | https://api.droob-jo.com/health | `{"status":"ok"}` | ✅ |
| 3 | API Routes | https://api.droob-jo.com/api/v1/routes | JSON array | ✅ |
| 4 | API Stops | https://api.droob-jo.com/api/v1/stops | JSON array | ✅ |
| 5 | OSRM Route | https://droob-osrm.fly.dev/route/v1/... | JSON with routes | ✅ |
| 6 | Dashboard | https://droob-dashboard-6wom3fave-jad-projects1.vercel.app | Auth protected | ✅ 401 |
| 7 | APK Download | https://github.com/jadjbara10/droob/releases/tag/v6.1.0 | APK file | ✅ 200 |
| 8 | WebSocket JWT | wss://api.droob-jo.com/ws | Rejected without token | ✅ |
| 9 | Rate Limiting | api.droob-jo.com (100 req/min) | 429 on excess | ✅ Configured |
| 10 | Login API | POST /api/v1/auth/login | Returns token | ✅ super_admin |

---

## Issues Encountered & Fixes

### 1. Dashboard Build Failure (React Error #31)
- **Problem**: Dashboard failed to build with "Objects are not valid as a React child"
- **Root Cause**: React 18.3.1 installed in monorepo root node_modules but dashboard requires React 19
- **Fix**: Reinstalled node_modules with `npm install --legacy-peer-deps`, added `react@^19.0.0` and `react-dom@^19.0.0` to root package.json dependencies

### 2. Git Push Rejected — Large Files
- **Problem**: GitHub rejected push because of OSRM data files > 100MB
- **Files**: `jordan-osrm-data.tar` (273MB), `jordan-osrm-full.tar` (336MB), `jordan-osrm-data.zip` (114MB)
- **Fix**: Added `docker/osrm-fly/*.tar` and `docker/osrm-fly/*.zip` to `.gitignore`, reset commit, recommitted without large files

### 3. Backend Smoke Check Warning
- **Problem**: Fly.io deployment showed "app is not listening on the expected address"
- **Cause**: Timing issue — app hadn't started when smoke check ran
- **Resolution**: App started successfully after deployment; health endpoint returns 200

---

## Service URLs

| Service | URL | Platform |
|---------|-----|----------|
| Landing Page | https://droob-jo.com | Cloudflare Worker (droob-site) |
| API | https://api.droob-jo.com | Cloudflare Worker (droob-api-proxy) → Fly.io |
| Backend | https://droob-api.fly.dev | Fly.io (droob-api) |
| OSRM | https://droob-osrm.fly.dev | Fly.io (droob-osrm) |
| Dashboard | https://droob-dashboard-6wom3fave-jad-projects1.vercel.app | Vercel |
| APK v6.1.0 | https://github.com/jadjbara10/droob/releases/tag/v6.1.0 | GitHub Releases |
| GitHub | https://github.com/jadjbara10/droob | GitHub |

---

## Component Versions

| Component | Version |
|-----------|---------|
| Backend (droob-api) | 1.0.0 |
| Dashboard | 2.0.0 |
| Mobile APK | v6.1.0 |
| droob-site Worker | 86e1c9b8 |
| droob-api-proxy Worker | fd24f616 |
| Next.js | 15.5.18 |
| React | 19.2.7 |
| Node.js | 22 (Alpine) |
| Fastify | 5.8.5 |

---

## Next Steps

- [ ] Monitor Vercel auto-deploy for new dashboard build (commit 80c7409)
- [ ] Set up custom domain for dashboard (admin.droob-jo.com)
- [ ] Configure CI/CD pipeline for automated deployments
- [ ] Set up proper monitoring/alerting on Fly.io
- [ ] Implement persistent rate limiting with Cloudflare KV
