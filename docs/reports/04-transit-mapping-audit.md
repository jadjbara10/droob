# 🗺️ Transit & Mapping Department — Audit Report
**Date:** 2026-06-05
**Agents:** TM-001 (Transit Data Lead), TM-002 (Map Rendering), TM-003 (OSRM/GPS)
**Files Read:** route-paths.ts, transport.config.ts, OSRM graph files, map components, transit data configs

---

## Executive Summary

Droob has a **solid transit data foundation** with real OSRM routing data for Jordan, well-structured route path coordinates (including BRT1 from official ArcGIS), and thoughtful mode-specific configurations. However, most route paths use **estimated coordinates** rather than real GIS data, the map rendering uses **Leaflet via WebView** (suboptimal for React Native), and the trip planner backend uses **Haversine straight-line routing** instead of OSRM road-network routing.

**Overall Transit Score: C+ (64/100)** — Good data foundation, routing not road-aware.

---

## 1. Transit Data Quality Report

### Data Inventory

| Data Type | Count | Source | Accuracy |
|-----------|-------|--------|----------|
| Governorates | 12/12 | Official | ✅ 100% |
| Stops (seeded) | 33 in DB, 454 in config, 134 in docs | Mixed | 🟡 Partial |
| Routes | 23 in DB, 11 with paths, 405 documented | Mixed | 🟡 Partial |
| Route paths (polylines) | 11 drawn, BRT1 from ArcGIS | ArcGIS + estimation | 🟡 1 real, 10 estimated |
| OSRM graph | Full Jordan OSM extract (30MB PBF) | OpenStreetMap | ✅ Road-accurate |
| Schedules | Seeded sample | Manual | 🟡 Minimal |
| Vehicles | Seeded sample | Manual | 🟡 Minimal |

### Route Path Quality Assessment

| Route | Source | Points | Quality | Notes |
|-------|--------|--------|---------|-------|
| BRT1 | ArcGIS Transportation_Service | 25 | ✅ Excellent | Official GIS — EPSG:28191 converted to WGS84 |
| BRT2 | Estimated | 4 | ❌ Poor | 4 points — straight-line approximation |
| Bus 7 | Estimated | 7 | 🟡 Fair | Amman geography estimate |
| Bus 15 | Estimated | 7 | 🟡 Fair | Estimated |
| Bus 25 | Estimated | 5 | 🟡 Fair | Estimated |
| Bus 30 | Estimated | 9 | 🟡 Fair | Estimated |
| Serv Hussayn | Estimated | 9 | 🟡 Fair | Estimated |
| Serv Sweifieh | Estimated | 8 | 🟡 Fair | Estimated |
| Serv Abdoun | Estimated | 5 | 🟡 Fair | Estimated |
| Intercity Irbid | Estimated | 7 | 🟡 Fair | Estimated |
| Intercity Aqaba | Estimated | 10 | 🟡 Fair | Estimated |

### Critical Gap: 394 routes documented but no path data

The `route-paths.ts` file references `serveece-routes.ts` (306 serveece routes) and `bus-stops.ts` (454 stops) but these are commented out. The 405 documented routes from ArcGIS exist only in documentation — most have no coordinate data in the app.

---

## 2. Map Rendering Optimization Plan

### Current Architecture

```
React Native → WebView → Leaflet.js (loaded from CDN)
```

**Problems:**
1. **WebView adds 500ms-2s load time** — Leaflet JS/CSS must download from CDN on every cold start
2. **No native map gestures** — Pan/zoom feel "web-like" compared to Mapbox/Google Maps SDK
3. **Offline map tiles not supported** — Map tiles require internet; no tile caching
4. **Bridge latency** — Every marker update goes RN → WebView bridge → JS → DOM

### Recommended Architecture

```
React Native → react-native-maps (Mapbox GL) + offline MBTiles
              → MapLibre GL (open-source fork, no API key needed)
```

**Benefits:**
- Native performance (60fps pan/zoom)
- Offline tile support via MBTiles
- No CDN dependency
- Cluster rendering built-in
- Proper React component tree for markers (no bridge)

**Migration effort:** 40 hours (replace LeafletMap component, migrate all marker/polyline rendering)

---

## 3. Route Drawing Algorithm Review

### Current: Haversine Straight-Line Routing

```typescript
// trip-planner.ts (backend) — application-level Haversine
function haversineMeters(lat1, lng1, lat2, lng2) { ... }
// No road-network routing — just straight-line distances
```

The trip planner:
1. Finds nearby stops via Haversine distance (straight line)
2. Matches origin/destination to route stop sequences
3. Returns stops along the route in sequence order
4. Does NOT use OSRM for walk legs — uses fixed 80m/min walking speed

**Problem:** Walking legs are straight-line distances, not actual street-network paths. An 80m straight-line walk might be 200m by sidewalk.

### Recommended: OSRM Integration

```typescript
// Replace: straight-line walk distance
const walkDist = haversineMeters(fromLat, fromLng, stopLat, stopLng);

// With: OSRM foot routing
const walkRoute = await fetch(
  `http://osrm:5000/route/v1/foot/${fromLng},${fromLat};${stopLng},${stopLat}?overview=full`
);
const walkDist = walkRoute.routes[0].distance;
```

**OSRM server already exists** — `docker/osrm/` contains full Jordan graph. Needs to be running as a service.

---

## 4. OSRM Integration Plan

### Current State
- ✅ Jordan OSM PBF downloaded (30MB) — `docker/osrm/jordan-latest.osm.pbf`
- ✅ OSRM graph pre-processed — all `.osrm.*` files present
- ✅ Docker config exists — `docker/docker-compose.yml`
- ❌ OSRM server NOT running in production
- ❌ Trip planner does NOT use OSRM for routing

### Integration Steps

| Step | Description | Effort |
|------|-------------|--------|
| 1 | Deploy OSRM as Railway sidecar or dedicated service | 4h |
| 2 | Add OSRM client to backend (walk routing for trip planner) | 4h |
| 3 | Add OSRM client to backend (car routing for vehicle path snapping) | 2h |
| 4 | Create `GET /api/v1/osrm/route?from=&to=&mode=` endpoint | 3h |
| 5 | Switch trip planner walking legs from Haversine to OSRM foot | 3h |
| 6 | Add route polyline snapping (snap drawn routes to OSM roads) | 4h |

**Total:** 20 hours

---

## 5. GPS Simulator Design

### Purpose
Test vehicle tracking without real GPS hardware. Feed simulated vehicle positions along route paths to validate the real-time map.

### Design

```
GPS Simulator Service
  ├── Load route paths from route-paths.ts (11 routes with coords)
  ├── For each "active vehicle":
  │   ├── Interpolate position along polyline at configurable speed
  │   ├── POST /api/v1/vehicles/location { vehicleId, lat, lng, bearing, speed }
  │   └── Repeat every 2-5 seconds
  └── Control panel:
      ├── Start/stop simulation
      ├── Set simulation speed (1x, 2x, 5x, 10x)
      └── Select which routes have active vehicles
```

**Implementation:** Python script or Node.js service (4 hours)

---

## 6. Route Accuracy Verification Method

### Proposed: < 1% Error Target

1. **For BRT routes (fixed stations):** Compare ArcGIS coordinates against OSM road centerline. Station positions should be within 10m of actual platforms.

2. **For city bus routes:** Snap route path coordinates to OSM roads using OSRM match service. Flag any point > 50m from nearest road.

3. **For serveece routes:** Crowdsource verification — users report "bus took different route" → admin reviews and updates path.

4. **Automated check:**
```python
def verify_route_accuracy(route_coords: list[tuple[float, float]]) -> dict:
    """
    Snap each coordinate to nearest OSM road.
    Return: { "accuracy_pct": 95.2, "outliers": [(lat, lng, distance_m), ...] }
    Target: < 1% of points > 50m from road = acceptable
    """
```

**Effort:** 8 hours for verification script + 16 hours for manual correction of all 11 routes.

---

## 7. Quick Wins (< 4 Hours Each)

| # | Fix | Hours |
|---|-----|-------|
| 1 | Start OSRM Docker container and verify it responds to route requests | 1 |
| 2 | Add OSRM health check to backend `/health` endpoint | 0.5 |
| 3 | Fix route-paths.ts BRT2 — it has only 4 points, add intermediate coordinates | 2 |
| 4 | Add mode-specific color legend consistency (tokens.ts vs transport.config.ts vs route-paths.ts all define colors differently) | 1 |
| 5 | Create simple GPS simulator script (Node.js) | 4 |
| 6 | Import commented-out serveece-routes.ts data | 3 |
| 7 | Add route path validation (check all coords within Jordan bounds 29-33.5°N, 35-39.5°E) | 1 |

---

## Estimated Total Effort
- **OSRM integration:** 20 hours
- **Route path improvement:** 24 hours
- **Map migration (Leaflet → MapLibre):** 40 hours
- **GPS simulator:** 4 hours
- **Verification tooling:** 8 hours
- **Total:** ~96 hours across 20 tasks
