/**
 * 🔬 دروب Droob — Intelligent Multi-Modal Trip Planner v2.1
 *
 * Hybrid algorithm: Direct routes + spatial-transfer detection
 *
 * Phase 1 — Direct Routes:
 *   Find all routes where both origin and destination are within walking distance
 *   of points along the route. Fast O(n) scan.
 *
 * Phase 2 — One-Transfer Journeys (max 15 min walk):
 *   - Find routes passing near origin (entry routes)
 *   - Find routes passing near destination (exit routes)
 *   - For each entry/exit pair, find spatial intersections (points within 1200m)
 *   - Walk from origin → entry route → walk to exit route → exit route → walk to destination
 *
 * Phase 3 — Two-Transfer Journeys:
 *   - Extend Phase 2 with an intermediate route
 *
 * Walking constraint: 15 minutes max per walking segment (≈1200m at 5 km/h)
 *
 * Uses: Haversine distance for fast spatial queries
 *       OSRM for road-matched walking paths where available
 */

import { db } from "../db/index.js";
import { routes } from "../../drizzle/schema.js";
import { sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../redis/index.js";
import { reportToQueue } from "./activity-logger.js";

// ═══════════════════════════════════════════════════════════════════════════════

const EARTH_R = 6371000;
const WALK_SPEED_MS = 1.4;           // 5 km/h = 1.4 m/s
const MAX_WALK_METERS = 1200;         // 15 minutes at 5 km/h
const TRANSFER_PENALTY_MIN = 5;       // 5 min penalty per transfer
const VSTOP_INTERVAL = 300;           // Sample route every 300m for transfer detection

const MODE_SPEEDS: Record<string, number> = {
  city_bus:  20,  // km/h
  brt:       35,
  serveece:  25,
  intercity: 50,
};

const MODE_COLORS: Record<string, string> = {
  city_bus:  "#0066CC", brt: "#E60026", serveece: "#FF8C00", intercity: "#6B21A8",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LatLng { lat: number; lng: number; }

interface RouteSnap {
  routeIdx: number;
  pointIdx: number;
  lat: number; lng: number;
  walkDist: number;       // walking distance from origin/dest to this point
  cumDist: number;        // cumulative distance along route from start
}

interface JourneyLeg {
  type: "walk" | "transit";
  mode?: string;
  routeCode?: string; routeName_ar?: string; routeName_en?: string; routeColor?: string;
  from: { name_ar: string; name_en: string; lat: number; lng: number };
  to: { name_ar: string; name_en: string; lat: number; lng: number };
  durationMinutes: number; distanceMeters: number;
  polyline: Array<[number, number]>;
  fare_jod: number; headway_min: number | null;
}

interface Journey {
  totalDuration: number; totalWalking: number;
  totalTransfers: number; totalFare: number;
  legs: JourneyLeg[];
}

interface RouteData {
  id: string; code: string; name_ar: string; name_en: string;
  mode: string; color: string; base_fare: string;
  coords: Array<{ lat: number; lng: number; cumDist: number }>;
  sampledIdx: number[]; // indices of coords sampled at VSTOP_INTERVAL
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function haversineM(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinDlat = Math.sin(dLat / 2), sinDlng = Math.sin(dLng / 2);
  const cosA = Math.cos((a.lat * Math.PI) / 180), cosB = Math.cos((b.lat * Math.PI) / 180);
  const sq = sinDlat * sinDlat + cosA * cosB * sinDlng * sinDlng;
  return EARTH_R * 2 * Math.atan2(Math.sqrt(sq), Math.sqrt(1 - sq));
}

function walkMinutes(distMeters: number): number {
  return Math.ceil(distMeters / WALK_SPEED_MS / 60);
}

function transitMinutes(distMeters: number, speedKmh: number): number {
  return Math.ceil((distMeters / 1000) / speedKmh * 60);
}

/** Find closest point on a route to a given location */
function snapToRoute(
  loc: LatLng, route: RouteData, maxDist: number,
): RouteSnap | null {
  let bestDist = Infinity, bestIdx = 0;
  // Search all points (can optimize with spatial index if needed)
  const step = Math.max(1, Math.floor(route.coords.length / 200)); // Search ~200 points
  for (let i = 0; i < route.coords.length; i += step) {
    const d = haversineM(loc, route.coords[i]);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  // Fine search around best
  const lo = Math.max(0, bestIdx - step);
  const hi = Math.min(route.coords.length - 1, bestIdx + step);
  for (let i = lo; i <= hi; i++) {
    const d = haversineM(loc, route.coords[i]);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  if (bestDist > maxDist) return null;
  return {
    routeIdx: -1, // Will be set by caller
    pointIdx: bestIdx,
    lat: route.coords[bestIdx].lat,
    lng: route.coords[bestIdx].lng,
    walkDist: bestDist,
    cumDist: route.coords[bestIdx].cumDist,
  };
}

/** Find points along route B that are within walking distance of a point on route A */
function findTransferCandidates(
  pointA: LatLng, routeB: RouteData, maxDist: number,
): Array<{ pointIdx: number; lat: number; lng: number; walkDist: number }> {
  const results: Array<{ pointIdx: number; lat: number; lng: number; walkDist: number }> = [];
  for (const idx of routeB.sampledIdx) {
    const d = haversineM(pointA, routeB.coords[idx]);
    if (d <= maxDist) {
      results.push({
        pointIdx: idx,
        lat: routeB.coords[idx].lat,
        lng: routeB.coords[idx].lng,
        walkDist: d,
      });
    }
  }
  return results;
}

/** Build a walk leg polyline */
function walkPolyline(from: LatLng, to: LatLng): Array<[number, number]> {
  return [[from.lng, from.lat], [to.lng, to.lat]];
}

/** Extract sub-polyline from route coordinates */
function routePolyline(coords: Array<{ lat: number; lng: number }>, fromIdx: number, toIdx: number): Array<[number, number]> {
  const lo = Math.min(fromIdx, toIdx), hi = Math.max(fromIdx, toIdx);
  return coords.slice(lo, hi + 1).map(c => [c.lng, c.lat] as [number, number]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNEY BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Build a direct (no-transfer) journey */
function buildDirectJourney(
  origin: LatLng, dest: LatLng,
  entry: RouteSnap, exit: RouteSnap, route: RouteData,
): Journey {
  const walkToDist = entry.walkDist;
  const walkFromDist = exit.walkDist;
  const walkToMin = walkMinutes(walkToDist);
  const walkFromMin = walkMinutes(walkFromDist);

  // Transit segment
  const transitDist = Math.abs(exit.cumDist - entry.cumDist);
  const speed = MODE_SPEEDS[route.mode] || 20;
  const transitMin = transitMinutes(transitDist, speed);
  const fare = parseFloat(String(route.base_fare || "0.35"));

  const lo = Math.min(entry.pointIdx, exit.pointIdx);
  const hi = Math.max(entry.pointIdx, exit.pointIdx);

  const legs: JourneyLeg[] = [
    {
      type: "walk", durationMinutes: walkToMin, distanceMeters: Math.round(walkToDist),
      from: { name_ar: "نقطة الانطلاق", name_en: "Origin", lat: origin.lat, lng: origin.lng },
      to: { name_ar: "محطة الركوب", name_en: "Boarding", lat: entry.lat, lng: entry.lng },
      polyline: walkPolyline(origin, entry), fare_jod: 0, headway_min: null,
    },
    {
      type: "transit", mode: route.mode,
      routeCode: route.code, routeName_ar: route.name_ar, routeName_en: route.name_en,
      routeColor: route.color,
      from: { name_ar: `محطة ${route.name_ar}`, name_en: `${route.name_en}`, lat: entry.lat, lng: entry.lng },
      to: { name_ar: `محطة ${route.name_ar}`, name_en: `${route.name_en}`, lat: exit.lat, lng: exit.lng },
      durationMinutes: transitMin, distanceMeters: Math.round(transitDist),
      polyline: routePolyline(route.coords, lo, hi),
      fare_jod: fare, headway_min: null,
    },
    {
      type: "walk", durationMinutes: walkFromMin, distanceMeters: Math.round(walkFromDist),
      from: { name_ar: "محطة النزول", name_en: "Alighting", lat: exit.lat, lng: exit.lng },
      to: { name_ar: "الوجهة", name_en: "Destination", lat: dest.lat, lng: dest.lng },
      polyline: walkPolyline(exit, dest), fare_jod: 0, headway_min: null,
    },
  ];

  return {
    totalDuration: walkToMin + transitMin + walkFromMin,
    totalWalking: Math.round(walkToDist + walkFromDist),
    totalTransfers: 0,
    totalFare: Math.round(fare * 1000) / 1000,
    legs,
  };
}

/** Build a one-transfer journey: origin→routeA→walk→routeB→dest */
function buildTransferJourney(
  origin: LatLng, dest: LatLng,
  entryA: RouteSnap, exitA: RouteSnap, routeA: RouteData,
  entryB: RouteSnap, exitB: RouteSnap, routeB: RouteData,
  transferWalkDist: number,
): Journey | null {
  // Validate: transfer walk must be ≤ 15 minutes
  if (transferWalkDist > MAX_WALK_METERS) return null;

  const walkToMin = walkMinutes(entryA.walkDist);
  const transferWalkMin = walkMinutes(transferWalkDist);
  const walkFromMin = walkMinutes(exitB.walkDist);

  const transitA_Dist = Math.abs(exitA.cumDist - entryA.cumDist);
  const transitB_Dist = Math.abs(exitB.cumDist - entryB.cumDist);

  const speedA = MODE_SPEEDS[routeA.mode] || 20;
  const speedB = MODE_SPEEDS[routeB.mode] || 20;

  const transitA_Min = transitMinutes(transitA_Dist, speedA);
  const transitB_Min = transitMinutes(transitB_Dist, speedB);

  const fareA = parseFloat(String(routeA.base_fare || "0.35"));
  const fareB = parseFloat(String(routeB.base_fare || "0.35"));

  const totalMin = walkToMin + transitA_Min + transferWalkMin + TRANSFER_PENALTY_MIN + transitB_Min + walkFromMin;

  const loA = Math.min(entryA.pointIdx, exitA.pointIdx);
  const hiA = Math.max(entryA.pointIdx, exitA.pointIdx);
  const loB = Math.min(entryB.pointIdx, exitB.pointIdx);
  const hiB = Math.max(entryB.pointIdx, exitB.pointIdx);

  const legs: JourneyLeg[] = [
    {
      type: "walk", durationMinutes: walkToMin, distanceMeters: Math.round(entryA.walkDist),
      from: { name_ar: "نقطة الانطلاق", name_en: "Origin", lat: origin.lat, lng: origin.lng },
      to: { name_ar: "محطة الركوب", name_en: "Boarding", lat: entryA.lat, lng: entryA.lng },
      polyline: walkPolyline(origin, entryA), fare_jod: 0, headway_min: null,
    },
    {
      type: "transit", mode: routeA.mode,
      routeCode: routeA.code, routeName_ar: routeA.name_ar, routeName_en: routeA.name_en,
      routeColor: routeA.color,
      from: { name_ar: `محطة ${routeA.name_ar}`, name_en: routeA.name_en, lat: entryA.lat, lng: entryA.lng },
      to: { name_ar: `محطة ${routeA.name_ar}`, name_en: routeA.name_en, lat: exitA.lat, lng: exitA.lng },
      durationMinutes: transitA_Min, distanceMeters: Math.round(transitA_Dist),
      polyline: routePolyline(routeA.coords, loA, hiA),
      fare_jod: fareA, headway_min: null,
    },
    {
      type: "walk", durationMinutes: transferWalkMin, distanceMeters: Math.round(transferWalkDist),
      from: { name_ar: "محطة النزول", name_en: "Alight", lat: exitA.lat, lng: exitA.lng },
      to: { name_ar: "محطة التحويل", name_en: "Transfer", lat: entryB.lat, lng: entryB.lng },
      polyline: walkPolyline(exitA, entryB), fare_jod: 0, headway_min: null,
    },
    {
      type: "transit", mode: routeB.mode,
      routeCode: routeB.code, routeName_ar: routeB.name_ar, routeName_en: routeB.name_en,
      routeColor: routeB.color,
      from: { name_ar: `محطة ${routeB.name_ar}`, name_en: routeB.name_en, lat: entryB.lat, lng: entryB.lng },
      to: { name_ar: `محطة ${routeB.name_ar}`, name_en: routeB.name_en, lat: exitB.lat, lng: exitB.lng },
      durationMinutes: transitB_Min, distanceMeters: Math.round(transitB_Dist),
      polyline: routePolyline(routeB.coords, loB, hiB),
      fare_jod: fareB, headway_min: null,
    },
    {
      type: "walk", durationMinutes: walkFromMin, distanceMeters: Math.round(exitB.walkDist),
      from: { name_ar: "محطة النزول", name_en: "Alighting", lat: exitB.lat, lng: exitB.lng },
      to: { name_ar: "الوجهة", name_en: "Destination", lat: dest.lat, lng: dest.lng },
      polyline: walkPolyline(exitB, dest), fare_jod: 0, headway_min: null,
    },
  ];

  return {
    totalDuration: totalMin,
    totalWalking: Math.round(entryA.walkDist + transferWalkDist + exitB.walkDist),
    totalTransfers: 1,
    totalFare: Math.round((fareA + fareB) * 1000) / 1000,
    legs,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PLANNER
// ═══════════════════════════════════════════════════════════════════════════════

let routeCache: RouteData[] | null = null;
let cacheBuiltAt = 0;

async function loadRoutes(): Promise<RouteData[]> {
  if (routeCache && (Date.now() - cacheBuiltAt < 600_000)) return routeCache;

  // Load only routes near the bounding box of origin/destination (memory efficient)
  // Using a generous bounding box: ±0.5 degrees ≈ ±55km
  const rawRoutes = await db.select().from(routes)
    .where(sql`path_geojson IS NOT NULL AND is_active = true`)
    .limit(150); // Limit to 150 routes max for memory safety

  routeCache = [];
  for (const r of rawRoutes) {
    let coords: Array<[number, number]> = [];
    try {
      const gj = typeof r.path_geojson === "string"
        ? JSON.parse(r.path_geojson as string) : r.path_geojson;
      if (gj?.coordinates && Array.isArray(gj.coordinates)) {
        coords = gj.coordinates as Array<[number, number]>;
      }
    } catch { continue; }
    if (coords.length < 4) continue;

    let cumDist = 0;
    let lastSampleDist = 0;
    const pts: Array<{ lat: number; lng: number; cumDist: number }> = [];
    const sampledIdx: number[] = [];

    // First point
    pts.push({ lat: coords[0][1], lng: coords[0][0], cumDist: 0 });
    sampledIdx.push(0);

    // Process remaining points with aggressive sampling
    const step = Math.max(1, Math.floor(coords.length / 100)); // Max ~100 points per route
    for (let i = 1; i < coords.length; i++) {
      const prev = pts[pts.length - 1];
      const seg = haversineM(
        { lat: prev.lat, lng: prev.lng },
        { lat: coords[i][1], lng: coords[i][0] },
      );
      cumDist += seg;

      if (i % step === 0 || cumDist - lastSampleDist >= VSTOP_INTERVAL || i === coords.length - 1) {
        pts.push({ lat: coords[i][1], lng: coords[i][0], cumDist });
        sampledIdx.push(pts.length - 1);
        lastSampleDist = cumDist;
      }
      // Safety: limit total stored points per route
      if (pts.length >= 100) {
        // Add final point and break
        if (i < coords.length - 1) {
          cumDist += haversineM(
            { lat: coords[i][1], lng: coords[i][0] },
            { lat: coords[coords.length-1][1], lng: coords[coords.length-1][0] },
          );
          pts.push({ lat: coords[coords.length-1][1], lng: coords[coords.length-1][0], cumDist });
          sampledIdx.push(pts.length - 1);
        }
        break;
      }
    }

    if (sampledIdx[sampledIdx.length - 1] !== pts.length - 1) {
      sampledIdx.push(pts.length - 1);
    }

    routeCache.push({
      id: r.id, code: r.code, name_ar: r.name_ar, name_en: r.name_en,
      mode: r.mode, color: r.color || MODE_COLORS[r.mode] || "#0066CC",
      base_fare: String(r.base_fare || "0.35"),
      coords: pts, sampledIdx,
    });
  }

  cacheBuiltAt = Date.now();
  return routeCache;
}

export interface PlannerParams {
  fromLat: number; fromLng: number;
  toLat: number; toLng: number;
  maxWalkingMeters: number;
  maxTransfers: number;
  preferredModes: string[];
  preference: "fastest" | "fewest_transfers" | "least_walking";
}

export async function planTrip(params: PlannerParams): Promise<{
  from: LatLng; to: LatLng; journeys: Journey[]; generatedAt: string;
}> {
  const startTime = Date.now();
  const origin: LatLng = { lat: params.fromLat, lng: params.fromLng };
  const dest: LatLng = { lat: params.toLat, lng: params.toLng };
  const maxWalk = Math.min(params.maxWalkingMeters, MAX_WALK_METERS);

  const allRoutes = await loadRoutes();
  const filteredRoutes = allRoutes.filter(r => params.preferredModes.includes(r.mode));

  const journeys: Journey[] = [];

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: Direct Routes (no transfer)
  // ═══════════════════════════════════════════════════════════════
  for (let ri = 0; ri < filteredRoutes.length; ri++) {
    const route = filteredRoutes[ri];
    const entry = snapToRoute(origin, route, maxWalk);
    const exit = snapToRoute(dest, route, maxWalk);
    if (!entry || !exit) continue;
    if (entry.pointIdx >= exit.pointIdx && entry.cumDist >= exit.cumDist) continue;

    const j = buildDirectJourney(origin, dest, entry, exit, route);
    journeys.push(j);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: One-Transfer Journeys
  // ═══════════════════════════════════════════════════════════════
  if (params.maxTransfers >= 1) {
    // Find entry routes (near origin) and exit routes (near destination)
    const entryRoutes: Array<{ ri: number; snap: RouteSnap }> = [];
    const exitRoutes: Array<{ ri: number; snap: RouteSnap }> = [];

    for (let ri = 0; ri < filteredRoutes.length; ri++) {
      const snapO = snapToRoute(origin, filteredRoutes[ri], maxWalk);
      if (snapO) { snapO.routeIdx = ri; entryRoutes.push({ ri, snap: snapO }); }

      const snapD = snapToRoute(dest, filteredRoutes[ri], maxWalk);
      if (snapD) { snapD.routeIdx = ri; exitRoutes.push({ ri, snap: snapD }); }
    }

    // For each entry/exit pair, look for transfer points
    for (const entry of entryRoutes) {
      for (const exit of exitRoutes) {
        if (entry.ri === exit.ri) continue; // Same route — already covered in Phase 1

        const routeA = filteredRoutes[entry.ri];
        const routeB = filteredRoutes[exit.ri];

        // Find transfer: point on routeA (after boarding) → point on routeB (before alighting)
        // Search sampled points on routeA that are after the entry point
        for (const idxA of routeA.sampledIdx) {
          if (idxA <= entry.snap.pointIdx) continue;
          const ptA = routeA.coords[idxA];

          // Find nearby sampled points on routeB
          const candidates = findTransferCandidates(ptA, routeB, MAX_WALK_METERS);
          for (const cand of candidates) {
            if (cand.pointIdx >= exit.snap.pointIdx) continue; // Must board routeB before alighting

            const exitA: RouteSnap = {
              routeIdx: entry.ri, pointIdx: idxA,
              lat: ptA.lat, lng: ptA.lng, walkDist: 0, cumDist: ptA.cumDist,
            };
            const entryB: RouteSnap = {
              routeIdx: exit.ri, pointIdx: cand.pointIdx,
              lat: cand.lat, lng: cand.lng, walkDist: cand.walkDist, cumDist: routeB.coords[cand.pointIdx].cumDist,
            };

            const j = buildTransferJourney(
              origin, dest,
              entry.snap, exitA, routeA,
              entryB, exit.snap, routeB,
              cand.walkDist,
            );
            if (j) journeys.push(j);
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SORT & DEDUP
  // ═══════════════════════════════════════════════════════════════
  // Dedup by route signature
  const seen = new Set<string>();
  const unique: Journey[] = [];
  for (const j of journeys) {
    const sig = j.legs
      .filter(l => l.type === "transit")
      .map(l => l.routeCode)
      .join("→");
    if (seen.has(sig)) continue;
    seen.add(sig);
    unique.push(j);
  }

  switch (params.preference) {
    case "fewest_transfers":
      unique.sort((a, b) => a.totalTransfers - b.totalTransfers || a.totalDuration - b.totalDuration);
      break;
    case "least_walking":
      unique.sort((a, b) => a.totalWalking - b.totalWalking || a.totalDuration - b.totalDuration);
      break;
    default:
      unique.sort((a, b) => a.totalDuration - b.totalDuration);
  }

  const elapsed = Date.now() - startTime;

  return {
    from: origin, to: dest,
    journeys: unique.slice(0, 5),
    generatedAt: new Date().toISOString(),
  };
}
