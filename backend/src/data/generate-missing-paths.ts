/**
 * 🔧 دروب Droob — OSRM Path Generator for Routes Missing GeoJSON
 *
 * Generates road-matched GeoJSON LineString paths for routes that don't have them.
 * Uses OSRM routing engine (port 5000) with Jordan OSM data.
 *
 * Strategy (per route):
 *   1. Parse waypoints from route name (e.g., "أ ↔ ب ↔ ج" → 3 waypoints)
 *   2. Look up each waypoint's coordinates from the stops database
 *   3. Use originStop/destinationStop from the route if available
 *   4. Route through waypoints via OSRM in sequence
 *   5. Merge legs into a single GeoJSON LineString
 *   6. Update the database
 *
 * Run: npx tsx src/data/generate-missing-paths.ts
 */

import "dotenv/config";
import { db } from "../db/index.js";
import { routes, stops } from "../../drizzle/schema.js";
import { eq, isNull, ilike } from "drizzle-orm";

const OSRM_BASE = process.env.OSRM_BASE_URL || "http://localhost:5000";
const BATCH_DELAY_MS = 200; // Polite delay between OSRM requests

// ─── Types ─────────────────────────────────────────────────────────────────

interface Waypoint {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteRecord {
  id: string;
  code: string;
  name_ar: string;
  mode: string;
  origin_stop_id: string | null;
  destination_stop_id: string | null;
  originStop?: { name_ar: string; lat: number; lng: number } | null;
  destinationStop?: { name_ar: string; lat: number; lng: number } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Parse waypoint names from Arabic route name like "الجبيحة ↔ المدينة الرياضية ↔ الشميساني" */
function parseWaypointNames(nameAr: string): string[] {
  return nameAr
    .split(/\s*[↔→>-]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Find a stop by name (tries exact match first, then partial) */
async function findStop(name: string): Promise<{ lat: number; lng: number } | null> {
  // Try exact match
  const exact = await db
    .select({ lat: stops.lat, lng: stops.lng, name_ar: stops.name_ar })
    .from(stops)
    .where(ilike(stops.name_ar, name))
    .limit(1);

  if (exact.length > 0) return { lat: Number(exact[0].lat), lng: Number(exact[0].lng) };

  // Try partial match (name contains our term)
  const partial = await db
    .select({ lat: stops.lat, lng: stops.lng, name_ar: stops.name_ar })
    .from(stops)
    .where(ilike(stops.name_ar, `%${name}%`))
    .limit(1);

  if (partial.length > 0) {
    console.log(`    ⚡ Fuzzy match: "${name}" → "${partial[0].name_ar}"`);
    return { lat: Number(partial[0].lat), lng: Number(partial[0].lng) };
  }

  return null;
}

/** Call OSRM to route between sequential waypoints */
async function routeViaOSRM(waypoints: Waypoint[]): Promise<{
  coordinates: Array<[number, number]>; // [lng, lat] for GeoJSON
  distance: number;
  duration: number;
} | null> {
  if (waypoints.length < 2) return null;

  // Build OSRM URL: /route/v1/driving/lng1,lat1;lng2,lat2;...
  const coordsStr = waypoints
    .map((w) => `${w.lng},${w.lat}`)
    .join(";");

  const url = `${OSRM_BASE}/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) return null;
    const data = await response.json() as any;
    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    return {
      coordinates: route.geometry.coordinates as Array<[number, number]>,
      distance: route.distance,
      duration: route.duration,
    };
  } catch (err) {
    console.error(`    ❌ OSRM error: ${(err as Error).message}`);
    return null;
  }
}

/** Sleep helper for rate limiting */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Main Pipeline ────────────────────────────────────────────────────────

async function main() {
  console.log("🧭 دروب — OSRM Path Generator for Routes Missing GeoJSON\n");

  // 1. Fetch all routes WITHOUT path_geojson
  const routesNoPath = await db
    .select()
    .from(routes)
    .where(isNull(routes.path_geojson))
    .execute();

  console.log(`📋 Found ${routesNoPath.length} routes without paths\n`);

  if (routesNoPath.length === 0) {
    console.log("✅ All routes already have paths!");
    return;
  }

  let generated = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const route of routesNoPath) {
    const name = route.name_ar;
    console.log(`🔀 [${route.code}] ${name} (${route.mode})`);

    // 2. Build waypoints list
    const waypointNames = parseWaypointNames(name);
    const waypoints: Waypoint[] = [];

    for (const wpName of waypointNames) {
      const stop = await findStop(wpName);
      if (stop) {
        waypoints.push({ name: wpName, lat: stop.lat, lng: stop.lng });
      } else {
        console.log(`    ⚠️  Could not find stop: "${wpName}"`);
      }
    }

    // 3. If we have < 2 waypoints from name parsing, try origin/destination from DB
    if (waypoints.length < 2) {
      // Fetch origin/dest from the route with joins
      const [routeWithStops] = await db.query.routes.findMany({
        where: eq(routes.id, route.id),
        with: { originStop: true, destinationStop: true },
        limit: 1,
      });

      const r = routeWithStops as any;
      if (r?.originStop?.lat && r?.destinationStop?.lat) {
        waypoints.length = 0; // clear potentially bad single waypoint
        waypoints.push({
          name: r.originStop.name_ar || "Origin",
          lat: Number(r.originStop.lat),
          lng: Number(r.originStop.lng),
        });
        waypoints.push({
          name: r.destinationStop.name_ar || "Destination",
          lat: Number(r.destinationStop.lat),
          lng: Number(r.destinationStop.lng),
        });
        console.log(`    📍 Using origin→dest from DB`);
      }
    }

    if (waypoints.length < 2) {
      console.log(`    ❌ Not enough waypoints (${waypoints.length}), skipping`);
      failed++;
      failures.push(`${route.code}: insufficient waypoints`);
      continue;
    }

    console.log(`    🗺️  Waypoints: ${waypoints.map((w) => w.name).join(" → ")}`);

    // 4. Route via OSRM
    const result = await routeViaOSRM(waypoints);

    if (!result) {
      console.log(`    ❌ OSRM routing failed`);
      failed++;
      failures.push(`${route.code}: OSRM routing failed`);
      continue;
    }

    // 5. Build GeoJSON LineString
    const geojson = {
      type: "LineString" as const,
      coordinates: result.coordinates,
    };

    // 6. Calculate approximate distance from coords if OSRM provided it
    const distanceMeters = Math.round(result.distance);

    // 7. Update database
    try {
      await db
        .update(routes)
        .set({
          path_geojson: geojson as any,
          distance: distanceMeters,
          updated_at: new Date(),
        })
        .where(eq(routes.id, route.id))
        .execute();

      console.log(`    ✅ Generated! ${result.coordinates.length} pts, ${(distanceMeters / 1000).toFixed(1)}km, ${Math.round(result.duration / 60)}min`);
      generated++;

      // Polite delay between requests
      await sleep(BATCH_DELAY_MS);
    } catch (err) {
      console.log(`    ❌ DB update failed: ${(err as Error).message}`);
      failed++;
      failures.push(`${route.code}: DB update failed`);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log(`\n═══════════════════════════════════════`);
  console.log(`📊 SUMMARY`);
  console.log(`   ✅ Generated: ${generated}`);
  console.log(`   ❌ Failed:    ${failed}`);
  console.log(`   📋 Total:     ${routesNoPath.length}`);

  if (failures.length > 0) {
    console.log(`\n⚠️  Failures:`);
    failures.forEach((f) => console.log(`   - ${f}`));
  }

  // Verify final count
  const remaining = await db
    .select()
    .from(routes)
    .where(isNull(routes.path_geojson))
    .execute();

  console.log(`\n🔍 Routes still without paths: ${remaining.length}`);

  // Count with paths
  const allRoutes = await db.select().from(routes).execute();
  const withPath = allRoutes.filter((r) => r.path_geojson != null).length;
  console.log(`🗺️  Total routes with paths: ${withPath} / ${allRoutes.length}`);
}

main().catch(console.error);
