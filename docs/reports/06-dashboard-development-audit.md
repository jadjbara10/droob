# 🖥️ Dashboard Development Department — Audit Report
**Date:** 2026-06-05
**Agents:** DASH-001 (Feature Completeness), DASH-002 (Real Data Integration), DASH-003 (Monitoring/Design)
**Files Read:** All 11 dashboard pages, 15 components, 2 lib files, API hooks

---

## Executive Summary

The Droob dashboard has **strong architectural patterns** (API hooks with polling, mutation wrappers, RTL-first layout, deck.gl maps), but suffers from a **dual-design-system migration in progress**, **two entirely mock-data pages** (Analytics, Drivers), and several **dead interactive elements**. The real API layer (`lib/api.ts` + `lib/hooks.ts`) is well-built and most management pages use it correctly. The main dashboard page (`page.tsx`) is the biggest offender — it has its own inline sidebar, hardcoded styles, and doesn't use the shared `DashboardShell` component.

**Overall Dashboard Score: C+ (66/100)** — Good bones, inconsistent execution.

---

## 1. Dashboard Feature Completeness Audit

| Page | Real API? | CRUD Complete? | Loading States | Error States | Empty States | Overall |
|------|-----------|----------------|----------------|--------------|--------------|---------|
| Home (KPIs) | 🟡 Hybrid | N/A | ❌ None | ❌ None | ❌ None | **60%** |
| Alerts | ✅ Real (create/broadcast) | 🟡 No edit/delete | ✅ Spinner | ✅ Banner | ✅ "No alerts" | **70%** |
| Analytics | 🔴 100% Mock | N/A | ❌ None | ❌ Broken import | ❌ None | **10%** |
| Drivers | 🔴 100% Mock | 🟡 Add only | ✅ Skeleton | ✅ Toast | ❌ None | **30%** |
| Fleet | ✅ Real API + polling | 🟡 Add only (no edit) | ✅ Skeleton | ✅ Error card | ✅ "No vehicles" | **65%** |
| Routes | ✅ Real API | 🟡 Inline edit (no delete) | ✅ Skeleton | ✅ Error card | ✅ "No routes" | **70%** |
| Stops | ✅ Real API | 🔴 Add only (no edit/delete!) | ✅ Skeleton | ✅ Error card | ❌ None | **40%** |
| Settings | ✅ Real API | 🟡 Save works, danger zone dead | ✅ Save spinner | ✅ Toast | N/A | **55%** |
| Users | ✅ Real API | ✅ Full CRUD | ✅ Skeleton | ✅ Toast | ✅ "No users" | **85%** |
| Reports | ✅ Real API (export) + Mock charts | 🟡 Export only (no filter) | ✅ Spinner | ❌ None | ❌ None | **40%** |
| Login | ✅ Real JWT auth | 🟡 No forgot password | ✅ Button spinner | ✅ Error message | N/A | **85%** |

---

## 2. Critical Dashboard Issues

### 🔴 Issue 1: Analytics Page is Broken
- `AreaChart` import from `@/components/ui/Charts` targets a **nonexistent file** — crashes on render
- All 4 data sections use `Math.random()` — different numbers every refresh
- Time range buttons (7d/30d/90d) are decorative only
- **Fix:** Create Charts component + connect to real API hooks that already exist (`useDailyStats`, `useRetentionCohorts`)

### 🔴 Issue 2: Dual Design System
Two visual systems coexist, creating visual whiplash:
- **System A (newer):** `DashboardShell` + CSS variables — used by Alerts, Fleet, Drivers, Users, Analytics
- **System B (older):** Inline styles + Tailwind classes — used by Routes, Stops, Settings, Reports
- **System C (orphaned):** Main dashboard `page.tsx` — its own inline styles with hardcoded `#111827`

### 🔴 Issue 3: Dual Sidebar
Main dashboard has its own inline sidebar (6 nav items) separate from `DashboardShell`'s sidebar (9 nav items). Fleet, Alerts, and Analytics pages are unreachable from the main dashboard.

### 🟠 Issue 4: Main Dashboard Map is Text, Not a Map
The "Live Map" card shows `"{n} مركبة نشطة"` as plain text instead of rendering `LiveVehicleMap` component (which exists and works on the Fleet page).

### 🟠 Issue 5: Stops Management — Cannot Edit or Delete
The most-used management feature has no edit/delete buttons. API supports PATCH/DELETE but UI doesn't expose them.

### 🟠 Issue 6: Orphaned Components
`KpiCards.tsx` and `TripChart.tsx` are fully built but never imported by any page. The main dashboard re-implements these with inline code.

---

## 3. Real-time Monitoring Dashboard Design

### Current State
- No WebSocket connection from dashboard
- "Last updated 3 seconds ago" is a static string
- Fleet page uses `useApiPolling` (15s interval) — works but not truly real-time

### Proposed: Live Monitoring Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  🟢 Live Monitor — آخر تحديث: قبل 3 ثواني                │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 🚌 24    │ │ 👥 1.2k  │ │ ⚠️ 3     │ │ ⏱️ 92%   │  │
│  │ مركبات   │ │ ركاب     │ │ تنبيهات  │ │ التزام    │  │
│  │ نشطة     │ │ اليوم    │ │ نشطة     │ │ بالمواعيد │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────┤
│  🗺️ Live Vehicle Map (deck.gl)                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │  ○ ○ ○  (vehicle markers moving in real-time)       ││
│  │  ─── BRT1 (red corridor)                            ││
│  │  ─── Bus 7 (blue route)                             ││
│  └─────────────────────────────────────────────────────┘│
├──────────────────────────┬──────────────────────────────┤
│  📊 رحلات اليوم (بالساعة) │  ⚠️ آخر التنبيهات            │
│  ▂▃▅█▇▅▃▂               │  🟡 BRT1 تأخير 10 دقائق      │
│                          │  🔴 محطة الجاردنز مغلقة      │
├──────────────────────────┴──────────────────────────────┤
│  📋 حالة الخطوط                                         │
│  BRT1 ████████████████░░ 85% ✅                         │
│  ٧    ██████████░░░░░░░░ 55% 🟡                         │
│  S03  ██████████████████░ 92% ✅                         │
└─────────────────────────────────────────────────────────┘
```

**Implementation:** 16 hours — Connect `LiveVehicleMap` to main dashboard, add WebSocket for real-time position updates, wire KPI cards to `useKpis()` hook.

---

## 4. Beta Invite Management System Design

### Requirements
- Generate invite codes (single-use or multi-use)
- Track code usage (who redeemed, when)
- Set expiry dates
- Email invites to specific addresses
- Dashboard to view/manage invites

### Database Schema Addition

```sql
CREATE TABLE beta_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,        -- e.g., "DROOB-BETA-001"
  type TEXT NOT NULL DEFAULT 'single', -- single | multi
  max_uses INT,                     -- NULL = unlimited
  current_uses INT DEFAULT 0,
  invited_email TEXT,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE beta_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID REFERENCES beta_invites(id),
  user_id UUID REFERENCES users(id),
  redeemed_at TIMESTAMP DEFAULT now()
);
```

**Effort:** 8 hours (schema + API + dashboard UI page)

---

## 5. Community Corrections Review Interface Design

### Workflow
```
User submits correction → Appears in dashboard "Pending Reviews" queue
→ Editor reviews: sees original data vs proposed change
→ Editor: ✅ Approve (auto-applies to DB) | ❌ Reject (with reason)
→ User gets push notification of outcome
```

### Dashboard UI

```
┌─────────────────────────────────────────────────────────┐
│  📝 مراجعة تصحيحات المجتمع                        (12)  │
├─────────────────────────────────────────────────────────┤
│  فلترة: [الكل ▼] [معلق ▼] [تم ▼] [مرفوض ▼]            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │ 🟡 معلق — تصحيح اسم محطة                            ││
│  │ من: أحمد محمود — قبل ٣ ساعات                        ││
│  │                                                     ││
│  │ الأصل:       "دوار الوaha"                          ││
│  │ المُقترَح:    "دوار الواحة"                          ││
│  │                                                     ││
│  │ المحطة: ST-AM-0011  │  الخط: —                      ││
│  │                                                     ││
│  │ [✅ اعتماد]  [❌ رفض]  [💬 تعليق]                    ││
│  └─────────────────────────────────────────────────────┘│
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Effort:** 12 hours (API endpoints + dashboard page)

---

## 6. Analytics & Reporting Dashboard Plan

### Reports Needed

| Report | Data Source | Chart Type | Effort |
|--------|------------|------------|--------|
| Daily Active Users | `users.last_login_at` | Line chart (7d/30d) | 3h |
| Trips by Hour | `trips.departure_time` | Bar chart | 3h |
| Top Stops (by searches/departures) | `activity_logs` | Horizontal bar | 3h |
| Route Health (% on-time) | `trips.status` | Heatmap (route × hour) | 4h |
| Community Engagement | `community_reports` | Counter + trend | 2h |
| Revenue (ads) | `ad_events` | Line chart | 3h |
| Fleet Utilization | `vehicles.is_active` + `trips` | Gauge chart | 3h |
| User Growth | `users.created_at` | Cumulative line | 2h |

**Total:** 23 hours

---

## 7. Quick Wins (< 4 Hours Each)

| # | Fix | Hours |
|---|-----|-------|
| 1 | Unify all pages to use `DashboardShell` — migrate Routes, Stops, Settings, Reports, main dashboard | 3 |
| 2 | Wire main dashboard map to render `LiveVehicleMap` component | 1.5 |
| 3 | Create missing `@/components/ui/Charts` file (or remove broken AreaChart import from Analytics) | 1 |
| 4 | Connect Analytics page to real API hooks (replace Math.random()) | 3 |
| 5 | Add edit + delete buttons to Stops table (pattern from Users page) | 2 |
| 6 | Remove dead "Export"/"Refresh" buttons on main dashboard or wire them | 0.5 |
| 7 | Add confirmation dialog to Settings "Reset System" button | 0.75 |
| 8 | Fix route status mapping (is_active → "on_time" is wrong, should check real-time status) | 2 |
| 9 | Wire notification bell in Header to navigate to /alerts | 1 |
| 10 | Connect Analytics time range buttons to actual data filtering | 2 |

---

## Estimated Total Effort
- **Critical fixes (unification, broken pages):** 12 hours
- **Monitoring dashboard:** 16 hours
- **Beta invite system:** 8 hours
- **Community review interface:** 12 hours
- **Analytics & reporting:** 23 hours
- **Quick wins:** 16.75 hours
- **Total:** ~88 hours across 25 tasks
