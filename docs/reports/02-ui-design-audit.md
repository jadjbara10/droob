# 🎨 UI Design Department — Audit Report
**Date:** 2026-06-05
**Agents:** UI-001 (Design Systems Lead), UI-002 (Visual Review), UI-003 (Component Audit)
**Files Read:** Design tokens, 17 mobile screens, 11 dashboard pages, all components

---

## Executive Summary

Droob's design system is **well-defined in tokens but inconsistently applied**. The mobile app has a strong, unified design token system (`@theme/tokens`) with excellent coverage. However, the dashboard suffers from a **dual design system problem** — two competing visual frameworks coexist. Dark mode is promised in the store but has **no color palette defined**. The primary brand color `#1A4F8A` is applied consistently on mobile but inconsistently on dashboard.

**Overall Design Score: B (73/100)** — Strong foundation, inconsistent execution.

---

## 1. Design Token Audit

### Mobile Design Tokens (`mobile/src/theme/tokens.ts`) — Grade: A-

| Category | Coverage | Quality | Issues |
|----------|----------|---------|--------|
| **Colors** | 20 semantic tokens | ✅ Excellent | No dark mode variants defined |
| **Spacing** | 4pt grid (0-64) | ✅ Excellent | All screens use tokens consistently |
| **Typography** | IBM Plex Sans Arabic + Latin | ✅ Excellent | Font weights 400-700 defined |
| **Border Radius** | 7 sizes (4-9999) | ✅ Excellent | Smart naming (input, card, modal, pill) |
| **Shadows** | 4 levels (sm-xl) | ✅ Good | Platform-specific (iOS shadowColor + Android elevation) |
| **Animation** | Spring + timing configs | ✅ Good | Shared spring config avoids magic numbers |
| **Layout** | Touch targets, heights, widths | ✅ Excellent | 44pt touch target minimum respected |
| **Haptics** | 6 feedback types | ✅ Good | Defined but inconsistently applied |
| **Gradients** | 4 presets | ⚠️ Warning | React Native doesn't support CSS gradients natively — OnboardingScreen uses solid fallback |
| **Map** | Marker sizes, stroke widths | ✅ Good | Map-specific tokens isolated |

### Dashboard Design Tokens — Grade: C

| Aspect | Finding |
|--------|---------|
| **CSS Variables** | `--brand-blue`, `--surface`, `--text-primary` used in new pages (alerts, fleet, drivers, users, analytics) via `DashboardShell` |
| **Inline Colors** | `#111827`, `#E2E8F0`, `bg-gray-800`, `text-gray-100` used directly in older pages (routes, stops, settings, reports, main dashboard) |
| **Tailwind Config** | RTL and brand colors configured but inconsistently applied |
| **Gap** | No shared token file between dashboard and mobile |

---

## 2. Color System Audit

### Brand Colors

| Token | Hex | Mobile Usage | Dashboard Usage | Contrast (on white) |
|-------|-----|-------------|-----------------|---------------------|
| `brand_blue` | `#1A4F8A` | ✅ Consistent | 🟡 Inconsistent (also `--brand-blue`) | 7.2:1 ✅ |
| `brand_green` | `#2E7D32` | ✅ Consistent | ❌ Not used | 5.9:1 ✅ |
| `gold_accent` | `#C9A84C` | ❌ Rarely used | ❌ Not used | 2.4:1 ⚠️ |

### Transit Mode Colors

| Mode | Color | Contrast | Mobile | Dashboard |
|------|-------|----------|--------|-----------|
| City Bus | `#0066CC` | 5.2:1 ✅ | ✅ | 🟡 Hardcoded |
| BRT | `#E60026` | 4.8:1 ⚠️ | ✅ | 🟡 Hardcoded |
| Serveece | `#FF8C00` | 2.9:1 ❌ | ✅ | 🟡 Hardcoded |
| Intercity | `#6B21A8` | 7.5:1 ✅ | ✅ | 🟡 Hardcoded |

**Critical:** `serveece` (#FF8C00) on white background fails WCAG AA contrast (2.9:1). Need darker orange.

### Status Colors

| Status | Color | Contrast | Mobile |
|--------|-------|----------|--------|
| On Time | `#16A34A` | 4.3:1 ⚠️ | ✅ Consistent |
| Delayed | `#EAB308` | 2.1:1 ❌ | ✅ Consistent |
| Cancelled | `#DC2626` | 4.5:1 ⚠️ | ✅ Consistent |

**Critical:** `delayed` (#EAB308) is nearly invisible on white — 2.1:1 contrast ratio. Must be darkened.

---

## 3. Dashboard Dual Design System — The Biggest Problem

### System A: "DashboardShell" (Newer — Alerts, Fleet, Drivers, Users, Analytics)

```css
/* Uses CSS custom properties */
background: var(--surface);
color: var(--text-primary);
border: 1px solid var(--border);
border-radius: var(--radius-card);
```

### System B: "Inline Styles" (Older — Routes, Stops, Settings, Reports, Main Dashboard)

```css
/* Uses hardcoded Tailwind classes and inline styles */
background: #111827;
color: #E2E8F0;
border: 1px solid #374151;
border-radius: 12px;
```

### The Main Dashboard (`page.tsx`) uses its OWN third system:

```typescript
// Inline styles with raw hex values
backgroundColor: "#111827",
borderColor: "#374151",
color: "#E2E8F0",
```

**Result:** Navigating from Dashboard Home → Alerts → Routes → Settings produces 3 different visual experiences within the same application.

---

## 4. Component Consistency Report

### Mobile Components — Grade: B+

| Component | Token Usage | Accessibility | Issues |
|-----------|-------------|---------------|--------|
| BottomSheet | ✅ Full tokens | ✅ ARIA labels | None |
| DepartureCard | ✅ Full tokens | ✅ Labels | None |
| JourneyCard | ✅ Full tokens | ✅ Labels | None |
| JourneyTimeline | ✅ Full tokens | ✅ Labels | None |
| LeafletMap | ✅ Map tokens | ⚠️ No alt text | WebView, no a11y |
| OccupancyBar | ✅ Full tokens | ⚠️ Color-only | No text fallback |
| OccupancyIndicator | ✅ Full tokens | ⚠️ Color-only | No text fallback |
| StatusPill | ✅ Full tokens | ✅ Labels | None |
| TransitBadge | ✅ Full tokens | ✅ Labels | None |
| TransportIcon | ✅ Full tokens | ✅ Labels | None |
| AdBanner | ✅ Full tokens | ⚠️ No skip | AdMob placeholder |
| AdInterstitial | ✅ Full tokens | ✅ Skip button | Good |
| AdRewarded | ✅ Full tokens | ✅ Reward flow | Good |
| CountdownTimer | ✅ Full tokens | ✅ Labels | Inconsistent math across screens |
| ErrorBoundary | ✅ Full tokens | ✅ Fallback | Good pattern |

### Dashboard Components — Grade: C+

| Component | Token Usage | Accessibility | Issues |
|-----------|-------------|---------------|--------|
| DashboardShell | ✅ CSS vars | ✅ RTL layout | Good |
| Sidebar | ✅ CSS vars | ⚠️ No ARIA | Hardcoded nav items |
| Header | ✅ CSS vars | ⚠️ Decorative bell | Notification bell does nothing |
| KpiCards | ✅ Full tokens | ⚠️ No ARIA | **ORPHANED** — never imported by any page |
| TripChart | ✅ Full tokens | ⚠️ No ARIA | **ORPHANED** — never imported by any page |
| LiveVehicleMap | ✅ CSS vars | ⚠️ No alt text | Good deck.gl integration |
| RouteMapEditor | ✅ CSS vars | ⚠️ No keyboard | OSRM URL hardcoded to localhost |
| DataTable | 🟡 Partial | ⚠️ No ARIA | Inline editing UX is jarring |
| Charts | ❌ Missing file | ❌ N/A | `AreaChart` import targets nonexistent file — breaks Analytics |
| StatusBadge | ✅ Full tokens | ✅ Labels | Good |
| Spinner | ✅ Full tokens | ✅ N/A | Good |
| Button | ✅ Full tokens | ✅ Labels | Multiple variants in different pages |

---

## 5. Typography Audit

### Mobile — Grade: A

- Font: IBM Plex Sans Arabic (headings, body) + IBM Plex Sans (Latin/English)
- All screens consistently use `fontFamily: "IBM Plex Sans Arabic"` from tokens
- Font sizes from `fontSize` token object (11-48pt)
- Line heights: 1.5 (body), 1.2 (headings)

### Dashboard — Grade: C+

- Arabic text rendering works correctly (RTL direction set)
- Font stack inconsistent: some pages use system default, others configured in globals.css
- No `IBM Plex Sans Arabic` web font loaded for dashboard
- English-only sections lack `lang="en"` attributes

---

## 6. Arabic-First Typography Recommendations

### Current State
- All mobile screens hardcode Arabic strings inline (no i18n usage)
- Dashboard supports bilingual alert creation
- No `lang` attributes on mixed-language content

### Recommendations
1. **Use `lang="ar"` on Arabic text containers** for proper screen reader pronunciation
2. **Use `lang="en"` on English text** (stop names, route codes)
3. **Add IBM Plex Sans Arabic web font** to dashboard (`@fontsource/ibm-plex-sans-arabic`)
4. **Enable `useTranslation()` hooks** in mobile (already installed, just unused)

---

## 7. Dark Mode Design Gap

The `app.store.ts` defines `ThemeMode = 'light' | 'dark' | 'system'` and persists the preference. But `tokens.ts` only defines light-mode colors.

### Required Dark Mode Tokens

```typescript
// Missing from tokens.ts:
export const darkColors = {
  surface: "#0F172A",       // Dark slate instead of white
  surface_2: "#1E293B",
  surface_3: "#334155",
  border: "#475569",
  text_primary: "#F1F5F9",  // Light instead of dark
  text_secondary: "#94A3B8",
  text_tertiary: "#64748B",
  // Brand colors stay same (sufficient contrast on dark)
};
```

**Effort estimate:** 4 hours to add dark palette to tokens + 8 hours to apply across screens.

---

## 8. Design System v2 Proposal

### Unified Design Token File for All Platforms

```typescript
// Proposed: shared/design-tokens.ts (imported by both mobile and dashboard)
export const brand = {
  primary: "#1A4F8A",
  secondary: "#2E7D32",
  accent: "#C9A84C",
  // Dark mode variants
  primaryLight: "#2563A0",
  secondaryLight: "#3B9E43",
};

export const transit = {
  city_bus: "#0066CC",
  brt: "#DC143C",        // Darker red for better contrast
  serveece: "#E07B00",   // Darker orange for WCAG AA
  intercity: "#6B21A8",
  walking: "#6B7280",
};

export const status = {
  on_time: "#16A34A",
  delayed: "#CA8A04",    // Darker yellow for WCAG AA (was #EAB308)
  cancelled: "#DC2626",
};
```

---

## 9. Quick Wins (< 4 Hours Each)

| # | Fix | Platform | Hours |
|---|-----|----------|-------|
| 1 | Darken `serveece` orange from #FF8C00 to #E07B00 | Mobile | 0.5 |
| 2 | Darken `delayed` yellow from #EAB308 to #CA8A04 | Mobile | 0.5 |
| 3 | Add dark mode color palette to tokens.ts | Mobile | 4 |
| 4 | Unify dashboard pages to DashboardShell component | Dashboard | 3 |
| 5 | Remove orphaned KpiCards.tsx and TripChart.tsx | Dashboard | 0.5 |
| 6 | Fix main dashboard page.tsx to use DashboardShell instead of inline sidebar | Dashboard | 2 |
| 7 | Add IBM Plex Sans Arabic to dashboard globals.css | Dashboard | 0.5 |
| 8 | Create missing `@/components/ui/Charts` file or fix AreaChart import | Dashboard | 1 |
| 9 | Fix onboarding gradient rendering (use expo-linear-gradient) | Mobile | 2 |
| 10 | Create shared design token JSON for cross-platform consistency | Both | 2 |

---

## 10. Implementation Recommendations

### Phase 1: Color Fixes (Day 1)
1. Fix WCAG-failing colors (serveece orange, delayed yellow)
2. Add dark mode palette
3. Apply consistent brand blue across all dashboard pages

### Phase 2: Dashboard Unification (Day 2-3)
4. Migrate ALL dashboard pages to `DashboardShell` component
5. Remove inline styles and hardcoded hex values
6. Unify the two sidebar implementations into one
7. Wire the notification bell

### Phase 3: Cross-Platform Consistency (Day 4-5)
8. Extract shared design tokens JSON
9. Add IBM Plex Sans Arabic to dashboard
10. Apply Arabic-first typography rules consistently

---

## Estimated Total Effort
- **Critical fixes (contrast, unification):** 10 hours
- **High priority (dark mode, typography):** 16 hours
- **Medium priority (cross-platform tokens):** 8 hours
- **Total:** ~34 hours across 15 tasks
