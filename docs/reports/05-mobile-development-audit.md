# 📱 Mobile Development Department — Audit Report
**Date:** 2026-06-05
**Agents:** MOB-001 (Mock Removal Lead), MOB-002 (API Integration), MOB-003 (Performance), MOB-004 (Offline/Tests)
**Files Read:** All 17 screens, 12 components, 3 stores, 5 services, 2 type files, navigation, theme, i18n, configs

---

## Executive Summary

The Droob mobile app is a **well-designed prototype** with strong component architecture, design token usage, and error boundaries — but **88% of screens use 100% hardcoded mock data**. The Zustand stores and API client are fully functional and connected to the real backend, but screens deliberately bypass them. Two incompatible type systems (`transit.ts` vs `transit.types.ts`) create a structural barrier preventing real data from reaching the UI.

**Overall Mobile Score: C (58/100)** — Beautiful shell, data plumbing is disconnected.

---

## 1. Mock Data Removal Plan

### Every Mock Identified (by screen)

| Screen | Mock Data | Lines | Replacement API |
|--------|-----------|-------|-----------------|
| HomeScreen | `NEARBY_STOPS` (8 stops), `QUICK_CHIPS` (5), `MOCK_USER_LOCATION`, 5s offline timer | 60-77, 504-509 | `useTransitStore.fetchNearbyStops()` + `expo-location` |
| TripPlannerScreen | `MOCK_JOURNEYS` (3), `MOCK_STOPS` (7), `LEG_COORDS` (72 lines), `quickStops` (6) | 109-317, 757-766 | `useTransitStore.planJourney()` + real API results |
| SearchScreen | 37 local stops | Full file | `stopsApi.list({ q })` — real PostgreSQL ILIKE search |
| DeparturesScreen | `MOCK_DEPARTURES` (7) fallback | ~330-340 | `useTransitStore.fetchDepartures()` |
| AlertsScreen | 5 mock alerts | Full file | `useTransitStore.fetchAlerts()` |
| CommunityScreen | 4 mock reports, duplicate types | Full file | `reportsApi.list()` + `reportsApi.create()` |
| NavigationScreen | Fully static — emoji map, decremented ETA | Full file | Real GPS + `expo-location` tracking |
| RouteDetailScreen | Mock route/stops/vehicles | Full file | `routesApi.getById()` + `routesApi.getStops()` |
| StopDetailScreen | 5 mock departures | Full file | `departuresApi.getForStop()` |
| RoutesScreen | Config data (`ALL_ROUTE_PATHS`) | Full file | `routesApi.list()` |
| SavedRoutesScreen | 3 mock routes, 2 mock stops | Full file | Store `favoriteRoutes` + `favoriteStops` |
| JourneyDetailScreen | Mock fallback | Full file | Navigation param `journey` from trip planner |
| MapScreen | Mock landmarks | Full file | Real stops from store |
| OnboardingScreen | Static slides | Full file | ✅ Acceptable (static content) |
| AuthScreen | Real API | — | ✅ Already connected |
| ProfileScreen | Partial store | Mixed | ✅ Mostly connected |
| DeparturesBoardScreen | Mock (ORPHANED — not imported) | Full file | 🗑️ Delete or merge with DeparturesScreen |

### Mock Removal Priority

| Priority | Screens | Effort |
|----------|---------|--------|
| 🔴 Critical | HomeScreen, TripPlannerScreen, SearchScreen, DeparturesScreen | 16h |
| 🟠 High | RouteDetailScreen, StopDetailScreen, AlertsScreen | 8h |
| 🟡 Medium | RoutesScreen, CommunityScreen, JourneyDetailScreen, NavigationScreen, MapScreen | 12h |
| 🟢 Low | SavedRoutesScreen, DeparturesBoardScreen (delete) | 2h |

**Total mock removal:** 38 hours

---

## 2. Type System Consolidation

### The Problem

Two type files define overlapping but incompatible types:

| `types/transit.ts` (LEGACY) | `types/transit.types.ts` (CANONICAL) |
|----------------------------|--------------------------------------|
| `Journey.totalDurationMinutes` | Backend returns `totalDuration` |
| `Journey.fareAmount` | Backend returns `totalFare` |
| `JourneyLeg.durationMinutes` | Backend returns `durationMinutes` ✅ |
| `TransitStop.distance?` | Backend returns `distance_m?` |
| `Departure.occupancy: "low"/"medium"/"high"` | Backend returns `"empty"/"partial"/"full"` |
| Used by: TripPlannerScreen, HomeScreen, JourneyCard | Used by: JourneyDetailScreen, transit.store.ts, api-client |

### The Explicit Fallback

```typescript
// TripPlannerScreen.tsx line 636-640
const displayJourneys = useMemo(() => {
  if (storeJourneys.length > 0) {
    // For now fall back to mocks since the store Journey differs from
    // the JourneyCard's expected shape.
    return MOCK_JOURNEYS;  // ← NEVER uses real data
  }
  return MOCK_JOURNEYS;
}, [storeJourneys, fromLabel, toLabel]);
```

### Solution: Single Source of Truth

1. **Make `transit.types.ts` the canonical source** (already declared in types/index.ts)
2. **Update all screens to import from `@/types`** (which re-exports transit.types.ts)
3. **Add transformation layer in api.ts** — map backend response shapes to canonical types
4. **Remove `types/transit.ts`** legacy file after migration
5. **Add Zod schemas** to validate API responses match types

**Effort:** 8 hours

---

## 3. Screen-by-Screen Integration Plan

| Screen | Current Data Source | Target Data Source | Integration Steps |
|--------|---------------------|-------------------|-------------------|
| HomeScreen | Inline mocks | `useTransitStore` + GPS | 1. Replace NEARBY_STOPS with `store.stops` <br> 2. Replace QUICK_CHIPS with `store.favoriteStops` <br> 3. Add `expo-location` for real GPS <br> 4. Wire `handleStop` → `navigation.navigate("StopDetail")` <br> 5. Wire search → `navigation.navigate("Search")` <br> 6. Remove 5s fake offline timer |
| TripPlannerScreen | MOCK_JOURNEYS | `useTransitStore.planJourney()` | 1. Fix `displayJourneys` to use store data <br> 2. Wire `handleSearch` to use actual from/to coordinates <br> 3. Remove hardcoded Amman center in API call <br> 4. Generate polylines from API journey legs |
| SearchScreen | 37 local stops | `stopsApi.list({ q })` | 1. Import `stopsApi` from api-client <br> 2. Add debounced search (300ms) <br> 3. Show loading skeleton <br> 4. Save recent to MMKV |
| DeparturesScreen | Mock fallback | `departuresApi.getForStop()` | 1. Remove fallback condition <br> 2. Show real countdown based on `departureTime` <br> 3. Add empty state for no departures |
| AlertsScreen | 5 mock alerts | `alertsApi.list()` | 1. Replace MOCK_ALERTS with API call <br> 2. Add pull-to-refresh calling API <br> 3. Mark-as-read via API |
| CommunityScreen | Local state only | `reportsApi` | 1. Load from `reportsApi` (needs list endpoint added) <br> 2. Submit via `reportsApi.create()` <br> 3. Wire confirm button <br> 4. Fix duplicate REPORT_TYPES |
| NavigationScreen | Static prototype | GPS + ETA calculation | 1. Import `expo-location` for background tracking <br> 2. Calculate real ETA based on position vs destination <br> 3. Show actual map with current position marker <br> 4. Step-by-step instructions from journey legs |
| RouteDetailScreen | Mock route | `routesApi.getById()` | 1. Fetch route, stops, schedule from API <br> 2. Replace mock vehicles with real `vehiclesApi.list()` <br> 3. Add favorite toggle synced to backend |
| StopDetailScreen | Mock departures | `departuresApi.getForStop()` | 1. Fetch real departures <br> 2. Real countdown timers based on scheduled times <br> 3. Amenity icons from stop object |
| RoutesScreen | Config data | `routesApi.list()` | 1. Fetch from API with mode/governorate filters <br> 2. Add pagination/infinite scroll <br> 3. Search debounced |
| SavedRoutesScreen | Mock | Store favorites | 1. Read from `transitStore.favoriteRoutes` <br> 2. Read from `transitStore.favoriteStops` <br> 3. Persist to MMKV |
| AuthScreen | Real API ✅ | — | Add password visibility toggle + forgot password flow |
| ProfileScreen | Store ✅ | — | Add PATCH profile to backend |
| JourneyDetailScreen | Mock fallback | Navigation params | Already receives journey via navigation — just remove mock fallback |

---

## 4. Performance Optimization Plan

### Bundle Size (Current: ~25-35MB estimated for Android)

| Optimization | Savings | Effort |
|-------------|---------|--------|
| Tree-shake unused dependencies | ~5MB | 2h |
| Compress assets (PNG → WebP) | ~3MB | 1h |
| Remove Leaflet CDN dependency (use MapLibre native) | ~8MB | 40h |
| Enable Hermes bytecode precompilation | ~2MB | 1h |
| Lazy-load screens (React.lazy + Suspense) | Initial load -40% | 4h |
| **Target bundle: < 15MB** | | |

### Map Load Time (Current: 1-3s for WebView + Leaflet CDN)

| Optimization | Target | Effort |
|-------------|--------|--------|
| Preload WebView on app start | -500ms | 2h |
| Cache Leaflet JS/CSS locally (no CDN) | -1000ms | 3h |
| Migrate to react-native-maps (MapLibre) | -1500ms | 40h |
| **Target: < 800ms** | | |

### Render Performance

| Issue | Screen | Fix | Effort |
|-------|--------|-----|--------|
| Unnecessary re-renders | HomeScreen | `React.memo` on StopCard (already done ✅), add to other sub-components | 1h |
| FlatList not virtualized | RoutesScreen | Use `getItemLayout` for fixed-height items | 1h |
| Animated components without `useNativeDriver` | Multiple | Enable native driver where possible | 2h |
| Map markers recalculated on every render | HomeScreen, TripPlannerScreen | `useMemo` with stable deps (already done for HomeScreen ✅) | 0.5h |

---

## 5. Error Handling & Offline Mode Strategy

### Current State

- `ErrorBoundary` wraps every screen and major component ✅
- `api.ts` has `withOfflineFallback()` pattern ✅
- `OfflineError` and `isNetworkError()` utilities ✅
- `useNetworkStatus` hook exists ✅
- MMKV storage configured (stub in Expo Go) 🟡

### Gaps

| Gap | Fix |
|-----|-----|
| **Offline data not persisted** | Cache last-fetched stops/routes/alerts in MMKV for offline display |
| **No sync queue** | Queue community reports created offline, sync when online |
| **No offline indicator** | Replace fake 5s timer with real `NetInfo` listener |
| **No stale-while-revalidate** | Show cached data immediately, refresh in background |
| **MMKV stub in Expo Go** | Replace with real `react-native-mmkv` in production build |

**Effort:** 12 hours

---

## 6. Test Coverage Plan

### Current Coverage: ~60% (per jest.config.js threshold: 70%)

### Critical Path Tests Needed

| Test | Priority | Effort |
|------|----------|--------|
| TripPlannerScreen: displays real journeys from API | 🔴 Critical | 3h |
| HomeScreen: renders nearby stops from store | 🔴 Critical | 2h |
| SearchScreen: debounced search returns results | 🔴 Critical | 2h |
| DeparturesScreen: shows countdown timers | 🟠 High | 2h |
| AuthScreen: login flow success/error | 🟠 High | 2h |
| transit.store: planJourney calls API and sets state | 🟠 High | 2h |
| transit.store: fetchNearbyStops filters by location | 🟠 High | 1h |
| api-client: retries GET on network error | 🟡 Medium | 2h |
| api-client: sets auth token in headers | 🟡 Medium | 1h |
| Navigation: tab icons render correctly | 🟡 Medium | 1h |
| Offline: withOfflineFallback returns mock data | 🟡 Medium | 2h |

**Target 80% coverage on critical paths:** ~20 hours of test writing

---

## 7. Quick Wins (< 4 Hours Each)

| # | Fix | Hours |
|---|-----|-------|
| 1 | Fix tab bar icons — use defined `icons` map instead of hardcoded 📍 | 0.25 |
| 2 | Wire HomeScreen `handleStop` to navigate to StopDetailScreen | 1.5 |
| 3 | Wire HomeScreen search focus to navigate to SearchScreen | 1 |
| 4 | Remove fake 5-second offline timer in HomeScreen | 0.25 |
| 5 | Remove duplicate REPORT_TYPES entries in CommunityScreen | 0.1 |
| 6 | Add `onPress` to CommunityScreen confirm button | 0.1 |
| 7 | Fix TripPlannerScreen `handleSearch` to use actual from/to coordinates | 2 |
| 8 | Fix TripPlannerScreen `displayJourneys` to use store data | 2 |
| 9 | Connect SearchScreen to real `stopsApi.list()` | 3 |
| 10 | Connect AlertsScreen to real `alertsApi.list()` | 2 |
| 11 | Replace JourneyDetailScreen hardcoded colors with design tokens | 1 |
| 12 | Wire "Start Navigation" button to navigate to NavigationScreen | 1 |
| 13 | Remove orphaned DeparturesBoardScreen or merge into DeparturesScreen | 2 |
| 14 | Add MMKV production config (remove Expo Go stub) | 0.5 |

---

## Estimated Total Effort

- **Mock removal:** 38 hours
- **Type consolidation:** 8 hours
- **Performance optimization:** 50 hours
- **Error handling + offline:** 12 hours
- **Test coverage:** 20 hours
- **Quick wins:** 16.5 hours
- **Total:** ~144 hours across 45 tasks
