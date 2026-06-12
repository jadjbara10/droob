# 📊 DROOB TECHNOLOGIES — Master Action Plan for Beta Readiness
**Date:** 2026-06-05 | **Last Updated:** 2026-06-10
**Consolidated from:** 7 department audit reports (UX, UI, Backend, Transit, Mobile, Dashboard, DevOps)
**Total findings:** 140+ issues identified across all departments
**Files read:** 67+ source files across mobile, dashboard, backend

---

## Executive Summary

After a comprehensive audit by all 7 departments, Droob is assessed at **63/100 overall readiness**. The app has exceptional documentation, a well-architected backend, and a polished mobile UI design system — but **zero screens are connected to real data**. This single issue blocks all user-facing functionality. Additionally, critical backend security gaps (unauthenticated write endpoints, null-stubbed services) and a dashboard split between two design systems need resolution.

### Overall Scores by Department

| Department | Score | Key Finding |
|------------|-------|-------------|
| 🧭 UX Research | 62/100 (C+) | 88% of mobile screens use 100% mock data |
| 🎨 UI Design | 73/100 (B) | Strong mobile tokens, dashboard has dual design system |
| 🗄️ Backend & DB | 68/100 (B-) | Solid architecture, critical auth gaps on write endpoints |
| 🗺️ Transit & Mapping | 64/100 (C+) | OSRM data exists but not integrated; most routes estimated |
| 📱 Mobile Dev | 58/100 (C) | Beautiful shell, data plumbing disconnected |
| 🖥️ Dashboard Dev | 66/100 (C+) | Strong patterns, inconsistent execution |
| 🔍 QA & DevSecOps | 63/100 (C+) | Good infrastructure, security needs hardening |

---

## 🚀 CLOUD INFRASTRUCTURE STATUS (Updated 2026-06-10)

### ✅ Fully Deployed & Operational 24/7 (No Local Machine Dependency)

```
المستخدم (Android)
    │
    ▼
droob-jo.com ← Cloudflare Worker (droob-site)
    ├── /           → Landing Page
    ├── /download   → GitHub Release APK (تنزيل مباشر)
    └── /privacy    → سياسة الخصوصية
    │
api.droob-jo.com ← Cloudflare Worker (droob-api-proxy)
    │
    ▼
droob-api.fly.dev ← Fly.io (Backend API — Port 3000)
    │
    ▼
droob-osrm.fly.dev ← Fly.io (OSRM — CH Algorithm — Port 5000)
```

### Cloud Components Detail

| Component | Platform | Status | URL |
|-----------|----------|--------|-----|
| Main Website | Cloudflare Worker (`droob-site`) | ✅ 24/7 | `droob-jo.com` |
| APK Download | GitHub Release + Worker redirect | ✅ 24/7 | `droob-jo.com/download` |
| Privacy Policy | Cloudflare Worker | ✅ 24/7 | `droob-jo.com/privacy` |
| API Proxy | Cloudflare Worker (`droob-api-proxy`) | ✅ 24/7 | `api.droob-jo.com` |
| Backend API | Fly.io (`droob-api`) | ✅ 24/7 | `droob-api.fly.dev` |
| OSRM Routing | Fly.io (`droob-osrm`) | ✅ 24/7 | `droob-osrm.fly.dev` |

### Environment Variables (Fly.io)
- `droob-api`: `OSRM_BASE_URL=https://droob-osrm.fly.dev` ✅
- `droob-api`: `PORT=3000` ✅

### Monthly Cost
| Service | Cost |
|---------|------|
| Fly.io (Backend + OSRM) | Free (Hobby Plan — 3 VMs) |
| Cloudflare Workers | Free (100K req/day) |
| Cloudflare DNS | Free |
| GitHub Release (APK) | Free |
| Namecheap (droob-jo.com) | ~$10/year |
| **Total** | **~$0.83/month** |

### Access Credentials
| Service | Details |
|---------|---------|
| Cloudflare Account | `jadjbara10@gmail.com` |
| Cloudflare Account ID | `445395f9fbc91a6f47c5aed960dd67f1` |
| Cloudflare Zone (droob-jo.com) | `c1a602970981d8fda43ce70b5af80afe` |
| Named Tunnel | `droob-api` / ID: `39f963a3-7efb-40cf-80dc-b61b93c7d92b` |

---

## MASTER TASK LIST — Ranked by Priority

### 🔴 CRITICAL (Must Fix Before Beta — 15 tasks, ~65 hours)

| # | Task | Department | Effort | Status | Dependencies |
|---|------|-----------|--------|--------|--------------|
| C1 | **Add authentication to write endpoints** (routes POST/PATCH, stops POST/PATCH, alerts POST/PATCH, emergency POST) | Backend | 1h | ⬜ Pending | None |
| C2 | **Fix push-notifications.ts and payment.ts — import schema instead of `null`** | Backend | 2h | ⬜ Pending | None |
| C3 | **Unify type systems** — merge `transit.ts` into `transit.types.ts`, single source of truth, add transformation layer in api.ts | Mobile | 8h | ⬜ Pending | None |
| C4 | **Connect HomeScreen to real data** — replace NEARBY_STOPS with `useTransitStore`, add GPS, wire navigation handlers, remove fake offline timer | Mobile | 6h | ⬜ Pending | C3 |
| C5 | **Connect TripPlannerScreen to real API** — fix `displayJourneys` to use store data, fix `handleSearch` to use actual coordinates, remove hardcoded fallback | Mobile | 4h | ⬜ Pending | C3 |
| C6 | **Connect SearchScreen to real API** — replace 37 local stops with `stopsApi.list()`, add debounced search | Mobile | 3h | ⬜ Pending | C3 |
| C7 | **Connect DeparturesScreen, AlertsScreen, RouteDetailScreen, StopDetailScreen to real API** | Mobile | 8h | ⬜ Pending | C3 |
| C8 | **Fix emergency alert endpoint** — add authentication + role check before broadcasting | Backend | 0.5h | ⬜ Pending | C1 |
| C9 | **Fix JWT refresh token revocation** — use `refresh_tokens` table, revoke on logout, check on refresh | Backend | 3h | ⬜ Pending | None |
| C10 | **Add role-based access control** — middleware checking user role for admin/dashboard endpoints | Backend | 3h | ⬜ Pending | C1 |
| C11 | **Unify dashboard to single design system (DashboardShell)** — migrate Routes, Stops, Settings, Reports, main dashboard page | Dashboard | 4h | ⬜ Pending | None |
| C12 | **Create missing Charts component / fix broken Analytics import** | Dashboard | 1h | ⬜ Pending | None |
| C13 | **Connect Analytics and Drivers pages to real API** (replace Math.random() and mock arrays) | Dashboard | 6h | ⬜ Pending | None |
| C14 | **Fix main dashboard** — use DashboardShell, render LiveVehicleMap instead of text, wire KPI cards | Dashboard | 3h | ⬜ Pending | C11 |
| C15 | **Add edit + delete to Stops management page** | Dashboard | 2h | ⬜ Pending | None |

### 🟠 HIGH (Should Fix for Beta — 16 tasks, ~50 hours)

| # | Task | Department | Effort | Status | Dependencies |
|---|------|-----------|--------|--------|--------------|
| H1 | **Fix tab bar icons** — use the `icons` map that's defined but unused (always shows 📍) | Mobile | 0.25h | ⬜ Pending | None |
| H2 | **Wire HomeScreen `handleStop` → navigate to StopDetailScreen** | Mobile | 1.5h | ⬜ Pending | C4 |
| H3 | **Wire HomeScreen search focus → navigate to SearchScreen** | Mobile | 1h | ⬜ Pending | C4 |
| H4 | **Remove duplicate REPORT_TYPES and wire CommunityScreen confirm button** | Mobile | 0.5h | ⬜ Pending | None |
| H5 | **Standardize error response format** across all API endpoints | Backend | 4h | ⬜ Pending | None |
| H6 | **Fix CORS production configuration** (comma-separated string → array) | Backend | 0.5h | ⬜ Pending | None |
| H7 | **Remove hardcoded dev JWT secret** from server.ts | Backend | 0.25h | ⬜ Pending | None |
| H8 | **Add PostGIS geometry column** (or at minimum bounding-box pre-filter for nearby stops) | Backend | 4h | ⬜ Pending | None |
| H9 | **Fix WCAG contrast failures** — `serveece` orange (#FF8C00 → #E07B00), `delayed` yellow (#EAB308 → #CA8A04) | UI Design | 0.5h | ⬜ Pending | None |
| H10 | **Add dark mode color palette** to design tokens | UI Design | 4h | ⬜ Pending | None |
| H11 | **Add IBM Plex Sans Arabic web font to dashboard** | UI Design | 0.5h | ⬜ Pending | None |
| H12 | **Remove fake 5-second offline timer** from HomeScreen (shows "غير مباشر" on every load) | Mobile | 0.25h | ⬜ Pending | C4 |
| H13 | **Fix onboarding gradient rendering** — use expo-linear-gradient instead of solid backgroundColor | Mobile | 2h | ⬜ Pending | None |
| H14 | **Implement real GPS via expo-location** across mobile app | Mobile | 4h | ⬜ Pending | C4 |
| H15 | **Connect fleet page polling to real-time WebSocket** for live vehicle positions | Dashboard | 3h | ⬜ Pending | None |
| H16 | **Create standardized API error envelope utility** and apply across all routes | Backend | 6h | ⬜ Pending | H5 |

### 🟡 MEDIUM (Nice to Have — 14 tasks, ~62 hours)

| # | Task | Department | Effort | Status | Dependencies |
|---|------|-----------|--------|--------|--------------|
| M1 | **Enable i18n with `useTranslation()`** on all mobile screens (currently Arabic hardcoded) | Mobile | 6h | ⬜ Pending | None |
| M2 | **Implement offline persistence** — cache last-fetched data in MMKV, queue offline reports | Mobile | 12h | ⬜ Pending | C4-C7 |
| M3 | **Deploy OSRM as service and integrate with trip planner** for road-network walk routing | Transit | 20h | ✅ **DONE** | None |
| M4 | **Add route path validation** — snap estimated coordinates to OSM roads, fix outliers | Transit | 8h | ⬜ Pending | M3 ✅ |
| M5 | **Create GPS simulator** for testing vehicle tracking without real hardware | Transit | 4h | ⬜ Pending | None |
| M6 | **Create beta invite system** (schema + API + dashboard UI) | Dashboard | 8h | ⬜ Pending | None |
| M7 | **Create community corrections review interface** in dashboard | Dashboard | 12h | ⬜ Pending | None |
| M8 | **Add coverage gate to CI** — fail PR if coverage drops below threshold | DevOps | 2h | ⬜ Pending | None |
| M9 | **Add security scan to CI** — `npm audit --audit-level=high` + semgrep | DevOps | 2h | ⬜ Pending | None |
| M10 | **Create missing API endpoints** — PATCH /me, POST /reset-password, DELETE route/stop/vehicle | Backend | 6h | ⬜ Pending | None |
| M11 | **Add Redis SCAN** (replace blocking KEYS) and pipeline vehicle location queries | Backend | 3h | ⬜ Pending | None |
| M12 | **Build real-time monitoring dashboard** — WebSocket-connected live map + alerts feed | Dashboard | 16h | ⬜ Pending | H15 |
| M13 | **Implement pull-to-refresh calling real API** across all mobile screens | Mobile | 2h | ⬜ Pending | C4-C7 |
| M14 | **Add analytics events** — track search, trip plan, route view to measure feature usage | Mobile | 4h | ⬜ Pending | None |

### 🟢 LOW (Post-Beta — 12 tasks, ~72 hours)

| # | Task | Department | Effort | Status |
|---|------|-----------|--------|--------|
| L1 | Migrate from Leaflet WebView to react-native-maps (MapLibre GL) | Mobile | 40h | ⬜ Pending |
| L2 | Add social login (Google, Apple) to AuthScreen | Mobile | 8h | ⬜ Pending |
| L3 | Implement fare calculation from fare_rules table | Backend | 4h | ⬜ Pending |
| L4 | Create prayer times cron job + API | Backend | 4h | ⬜ Pending |
| L5 | Create activity log viewer in dashboard | Dashboard | 4h | ⬜ Pending |
| L6 | Add light mode to dashboard (currently dark-only) | Dashboard | 6h | ⬜ Pending |
| L7 | E2E testing with Detox | DevOps | 12h | ⬜ Pending |
| L8 | Load testing with k6 (500 concurrent users) | DevOps | 12h | ⬜ Pending |
| L9 | Add Sentry + Crashlytics monitoring | DevOps | 12h | ⬜ Pending |
| L10 | Generate actual route path data for all 405 documented routes | Transit | 40h | ⬜ Pending |
| L11 | Enable OTA updates via expo-updates | DevOps | 4h | ⬜ Pending |
| L12 | iOS build + App Store submission | Mobile | 16h | ⬜ Pending |

---

## 🏗️ COMPLETED TASKS (Infrastructure — Outside Original Audit Scope)

These tasks were completed as part of the cloud deployment effort, separate from the code audit tasks above:

| # | Task | Date Completed | Details |
|---|------|---------------|---------|
| INF-1 | Docker cleanup | 2026-06-10 | Removed 4.1 GB unused resources |
| INF-2 | Deploy OSRM to Fly.io | 2026-06-10 | `droob-osrm.fly.dev` — CH algorithm, Jordan data |
| INF-3 | Deploy Backend to Fly.io | 2026-06-10 | `droob-api.fly.dev` — Fastify, Port 3000 |
| INF-4 | Create Cloudflare Worker (site) | 2026-06-10 | `droob-site` on `droob-jo.com/*` |
| INF-5 | Create Cloudflare Worker (API proxy) | 2026-06-10 | `droob-api-proxy` on `api.droob-jo.com/*` → Fly.io |
| INF-6 | Direct APK download | 2026-06-10 | `droob-jo.com/download` via GitHub Release |
| INF-7 | Link Backend to OSRM | 2026-06-10 | `OSRM_BASE_URL=https://droob-osrm.fly.dev` |
| INF-8 | Privacy policy page | 2026-06-10 | `droob-jo.com/privacy` |

---

## Implementation Sequence (Dependency Order)

### Week 1: Foundation
```
Day 1-2: Backend Security (C1, C2, C8, C9, C10, H6, H7)
Day 3-4: Type Consolidation (C3) + Dashboard Unification (C11, C12, C14)
Day 5: Quick Wins (H1, H4, H9, H11, H12, H13)
```

### Week 2: Connect Data
```
Day 1-2: HomeScreen + TripPlannerScreen real data (C4, C5, H2, H3)
Day 3-4: Remaining screens (C6, C7) + GPS (H14)
Day 5: Dashboard real data (C13, C15)
```

### Week 3: Polish
```
Day 1-2: Error standardization (H5, H16) + Missing endpoints (M10)
Day 3-4: CI/CD improvements (M8, M9) + Offline mode (M2)
Day 5: i18n (M1) + Analytics events (M14)
```

### Week 4: Advanced Features
```
Day 1-2: Route path validation with OSRM (M4 — M3 is DONE ✅)
Day 3-4: Beta invite system (M6) + Community review (M7)
Day 5: Real-time dashboard (M12, H15) + GPS simulator (M5)
```

---

## Success Criteria Verification

| Criteria | Current Status | Required Action | After Fix |
|----------|---------------|-----------------|-----------|
| Zero mock data in production paths | ❌ 88% mock | C4-C7: Connect all screens | ✅ |
| OTP authentication with real SMS | ❌ Email-only auth | M10: Add phone OTP flow | 🟡 |
| All 12 governorates have transit data | 🟡 Partial (Amman-focused) | Seed all governorates | 🟡 |
| OSRM routes correctly for any Jordan pair | ✅ **Deployed on Fly.io** | M4: Validate route paths | ✅ |
| Dashboard shows live vehicle positions | ❌ Text placeholder | C14: LiveVehicleMap | ✅ |
| Community corrections flow end-to-end | ❌ Mock-only | M7: Review interface | ✅ |
| Test coverage ≥ 80% on critical paths | ❌ ~60% | M8: Coverage gate + new tests | 🟡 |
| Security audit passed | ❌ 4 critical findings | C1, C2, C8, C9: Auth fixes | ✅ |
| CI/CD deploys on merge to main | ✅ Working | M9: Add security scans | ✅ |
| Beta invite system functional | ❌ Not built | M6: Build | ✅ |
| AdMob integrated but not intrusive | 🟡 Components exist, IDs unknown | Verify production AdMob IDs | 🟡 |
| App loads from Google Play Internal Track | 🟡 EAS builds work, listing incomplete | Complete store listing | 🟡 |
| **Cloud infrastructure 24/7** | ✅ **Fully operational** | — | ✅ |
| **APK downloadable from website** | ✅ **Working** | — | ✅ |

---

## Total Effort Summary

| Priority | Tasks | Done | Remaining | Hours |
|----------|-------|------|-----------|-------|
| 🔴 Critical | 15 | 0 | 15 | 65 |
| 🟠 High | 16 | 0 | 16 | 50 |
| 🟡 Medium | 14 | 1 | 13 | 42 |
| 🟢 Low | 12 | 0 | 12 | 72 |
| 🏗️ Infrastructure | 8 | 8 | 0 | — |
| **Total** | **65** | **9** | **56** | **~229** |

### By Department

| Department | Hours Remaining |
|------------|----------------|
| Mobile Development | 82 |
| Backend & Database | 49 |
| Dashboard Development | 35 |
| Transit & Mapping | 12 (M3 done, -20h) |
| UI Design | 15 |
| DevOps & QA | 26 |
| Cross-cutting (coordination) | 14 |

---

## ⚠️ Important Notes

1. **The app runs fully in the cloud** — no local machine dependency for production
2. **OSRM is deployed and working** — M3 is complete, M4 (route validation) can now proceed
3. **Named Tunnel `droob-api`** is not used in production (production uses Workers → Fly.io)
4. **R2 not enabled** on Cloudflare — GitHub Release is the alternative for APK hosting
5. **Local development** still uses PM2 (Backend on :3001, OSRM on :5000)

**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
**Droob Technologies — 7-Department Virtual Company Audit**
