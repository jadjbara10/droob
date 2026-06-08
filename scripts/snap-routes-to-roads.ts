// ============================================================================
// دروب (Droob) — OSRM Road-Snapping for Route Paths
//
// Reads generated-route-paths.json, calls the local OSRM service at
// http://localhost:5000 for each route, and outputs road-following polylines
// as generated-route-paths-osrm.json.
//
// Usage: npx tsx scripts/snap-routes-to-roads.ts
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OSRM_BASE = "http://localhost:5000";
const OSRM_TIMEOUT_MS = 15000;
const MAX_COORDS_PER_REQUEST = 100; // OSRM safety limit

// ─── Types ─────────────────────────────────────────────────────────────────

interface RoutePath {
  id: string;
  name: string;
  color: string;
  coords: Array<[number, number]>; // [lat, lng]
}

interface GeneratedOutput {
  generated_at: string;
  total: number;
  seed_routes: number;
  paths: RoutePath[];
}

interface OsrmResponse {
  code: string;
  routes: Array<{
    geometry: {
      type: "LineString";
      coordinates: Array<[number, number]>; // [lng, lat]
    };
    distance: number;
    duration: number;
  }>;
  waypoints: Array<{ location: [number, number] }>;
}

// ─── Polyline / Coordinate helpers ─────────────────────────────────────────

/** Format coords [lat, lng] → "lng,lat;lng,lat;..." for OSRM URL */
function coordsToOsrmParam(coords: Array<[number, number]>): string {
  return coords.map(([lat, lng]) => `${lng},${lat}`).join(";");
}

/** OSRM returns [lng, lat]; we store [lat, lng] */
function osrmCoordsToLatLng(coords: Array<[number, number]>): Array<[number, number]> {
  return coords.map(([lng, lat]) => [lat, lng]);
}

/** Compute straight-line segment length (km) between two coords [lat,lng] */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Reduce densely-sampled coordinates by removing points that are too close */
function decimateCoords(
  coords: Array<[number, number]>,
  minDistKm: number = 0.02
): Array<[number, number]> {
  if (coords.length <= 2) return coords;
  const result: Array<[number, number]> = [coords[0]];
  for (let i = 1; i < coords.length - 1; i++) {
    const prev = result[result.length - 1];
    const dist = haversineKm(prev[0], prev[1], coords[i][0], coords[i][1]);
    if (dist >= minDistKm) {
      result.push(coords[i]);
    }
  }
  // Always keep the last point
  result.push(coords[coords.length - 1]);
  return result;
}

// ─── HTTP helper ───────────────────────────────────────────────────────────

async function fetchOsrm(url: string): Promise<OsrmResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`OSRM HTTP ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as OsrmResponse;
    if (data.code !== "Ok") {
      throw new Error(`OSRM error: ${data.code}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Snapping ──────────────────────────────────────────────────────────────

/**
 * Snap a single route's coordinates to the road network via OSRM.
 * Falls back to original straight-line coords on any failure.
 */
async function snapRoute(
  route: RoutePath,
  stats: { snapped: number; failed: number }
): Promise<RoutePath> {
  const { id, name, color, coords } = route;

  if (coords.length < 2) {
    console.warn(`  ${id}: Skipped (fewer than 2 coords)`);
    stats.failed++;
    return route;
  }

  // Decimate coordinates to avoid OSRM URL length limits
  const decimated = decimateCoords(coords);

  // Split into batches if too many coordinates
  let allSnapped: Array<[number, number]> = [];
  let batchSuccess = true;

  for (let i = 0; i < decimated.length; i += MAX_COORDS_PER_REQUEST) {
    const batch = decimated.slice(i, i + MAX_COORDS_PER_REQUEST);
    if (batch.length < 2) {
      // Single point — append original
      allSnapped.push(batch[0]);
      continue;
    }

    try {
      const osrmParam = coordsToOsrmParam(batch);
      const url = `${OSRM_BASE}/route/v1/driving/${osrmParam}?overview=full&geometries=geojson&continue_straight=true`;
      const data = await fetchOsrm(url);

      const snappedCoords = data.routes[0].geometry.coordinates;
      const latLngSnapped = osrmCoordsToLatLng(snappedCoords);

      allSnapped.push(...latLngSnapped);
    } catch (err: any) {
      console.warn(`  ${id} batch ${i / MAX_COORDS_PER_REQUEST}: OSRM failed — ${err.message}`);
      batchSuccess = false;
      // Fall back: append original batch coords for this batch
      allSnapped.push(...batch);
    }
  }

  if (!batchSuccess) {
    console.warn(`  ${id}: Partial OSRM failure — some segments use original coords`);
  }

  // Deduplicate consecutive identical points
  const deduped: Array<[number, number]> = [];
  for (const c of allSnapped) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev[0] !== c[0] || prev[1] !== c[1]) {
      deduped.push(c);
    }
  }

  if (deduped.length < 2) {
    console.warn(`  ${id}: Snapped path empty, using original`);
    stats.failed++;
    return route;
  }

  stats.snapped++;
  console.log(`  ${id}: Snapped ${coords.length} → ${deduped.length} points`);
  return { id, name, color, coords: deduped };
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const scriptDir = path.resolve(__dirname);
  const inputPath = path.resolve(scriptDir, "..", "mobile", "src", "config", "generated-route-paths.json");
  const outputPath = path.resolve(scriptDir, "..", "mobile", "src", "config", "generated-route-paths-osrm.json");

  // Read input
  const raw = JSON.parse(fs.readFileSync(inputPath, "utf-8")) as GeneratedOutput;
  console.log(`Loaded ${raw.paths.length} route paths from ${inputPath}\n`);

  const stats = { snapped: 0, failed: 0 };
  const snappedPaths: RoutePath[] = [];

  for (const route of raw.paths) {
    const snapped = await snapRoute(route, stats);
    snappedPaths.push(snapped);
    // Small delay to avoid overwhelming OSRM
    await new Promise((r) => setTimeout(r, 100));
  }

  // Build output
  const output: GeneratedOutput = {
    generated_at: new Date().toISOString(),
    total: snappedPaths.length,
    seed_routes: raw.seed_routes,
    paths: snappedPaths,
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\nDone! Snapped ${stats.snapped} routes (${stats.failed} fallbacks).`);
  console.log(`Output: ${outputPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
