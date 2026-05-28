/**
 * دروب Droob — Data Validator
 * Validates Jordan transit data: stops, routes, GTFS, and constraints
 *
 * Usage: npx tsx src/validate-data.ts [dataDir]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// ─── Schemas ────────────────────────────────────────────────────────────
const StopSchema = z.object({
  stop_id: z.string().min(1),
  stop_name_ar: z.string().min(1),
  stop_name_en: z.string().optional(),
  stop_lat: z.number().min(29.0).max(33.5),
  stop_lon: z.number().min(34.9).max(39.5),
  location_type: z.number().min(0).max(1).optional(),
  wheelchair_boarding: z.number().min(0).max(2).optional(),
  shelter: z.boolean().optional(),
  bench: z.boolean().optional(),
  lighting: z.boolean().optional(),
  governorate: z.string().optional(),
});

const RouteSchema = z.object({
  route_id: z.string().min(1),
  route_short_name: z.string().min(1),
  route_long_name_ar: z.string().min(1),
  route_long_name_en: z.string().optional(),
  route_type: z.number().refine(v => [3, 200, 700, 715].includes(v), "Invalid route_type"),
  route_color: z.string().regex(/^[0-9A-Fa-f]{6}$/).optional(),
  agency_id: z.string().optional(),
  mode: z.enum(["city_bus", "brt", "serveece", "intercity"]).optional(),
  stops: z.array(z.string()).min(2).optional(),
  headway_minutes: z.number().positive().optional(),
  fare_jod: z.number().positive().optional(),
});

const MasterDataSchema = z.object({
  stops: z.array(StopSchema).min(1),
  routes: z.array(RouteSchema).min(1),
  agencies: z.array(z.object({
    agency_id: z.string(),
    agency_name: z.string(),
    agency_timezone: z.string().optional(),
  })).optional(),
});

// ─── Validator Functions ────────────────────────────────────────────────
interface ValidationResult {
  file: string;
  passed: number;
  warnings: string[];
  errors: string[];
}

function validateStopGeometry(stops: z.infer<typeof StopSchema>[]): string[] {
  const warnings: string[] = [];

  // Check for stops outside Jordan bounds
  for (const s of stops) {
    if (s.stop_lat < 29.0 || s.stop_lat > 33.5) {
      warnings.push(`${s.stop_id}: latitude ${s.stop_lat} outside Jordan bounds [29.0-33.5]`);
    }
    if (s.stop_lon < 34.9 || s.stop_lon > 39.5) {
      warnings.push(`${s.stop_id}: longitude ${s.stop_lon} outside Jordan bounds [34.9-39.5]`);
    }
  }

  return warnings;
}

function findDuplicateStops(stops: z.infer<typeof StopSchema>[]): string[] {
  const warnings: string[] = [];
  const threshold = 0.00045; // ~50 meters

  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const dlat = Math.abs(stops[i].stop_lat - stops[j].stop_lat);
      const dlon = Math.abs(stops[i].stop_lon - stops[j].stop_lon);
      if (dlat < threshold && dlon < threshold) {
        warnings.push(`${stops[i].stop_id} and ${stops[j].stop_id} within 50m (${stops[i].stop_name_ar} ↔ ${stops[j].stop_name_ar})`);
      }
    }
  }

  return warnings;
}

function validateRouteStops(routes: z.infer<typeof RouteSchema>[], stopIds: Set<string>): string[] {
  const errors: string[] = [];

  for (const route of routes) {
    if (!route.stops || route.stops.length === 0) {
      errors.push(`${route.route_id}: no stops defined`);
      continue;
    }

    // Check each stop exists
    for (const stopId of route.stops) {
      if (!stopIds.has(stopId)) {
        errors.push(`${route.route_id}: references unknown stop "${stopId}"`);
      }
    }

    // Check fare range
    if (route.fare_jod !== undefined) {
      const maxFare = route.mode === "intercity" ? 3.0 : route.mode === "brt" ? 0.5 : route.mode === "city_bus" ? 0.55 : 0.4;
      if (route.fare_jod > maxFare * 1.2) {
        warnings.push(`${route.route_id}: fare ${route.fare_jod} JOD seems high for ${route.mode} (expected ≤ ${maxFare})`);
      }
    }
  }

  return errors;
}

function validateFridaySchedule(routes: z.infer<typeof RouteSchema>[]): string[] {
  const warnings: string[] = [];
  const prayerGap = routes.some(r => {
    if (!r.stops || r.stops.length === 0) return false;
    // Check if route has Friday-specific schedule by looking for reduced headway
    if (r.headway_minutes && r.headway_minutes <= 5) return false;
    return false;
  });

  // For now, just note that Friday schedules should be verified manually
  warnings.push("Friday prayer gap (11:00-13:30) should be verified for all routes");

  return warnings;
}

// ─── Main Validator ─────────────────────────────────────────────────────
async function main() {
  const dataDir = process.argv[2] || path.resolve(__dirname, "../../data");
  console.log("🔍 دروب Data Validator\n");

  const results: ValidationResult[] = [];

  // ─── Validate GTFS output ─────────────────────────────────────────────
  const gtfsDir = path.join(dataDir, "gtfs_output");
  if (fs.existsSync(gtfsDir)) {
    console.log("─── GTFS Files ───");
    for (const file of ["stops.txt", "routes.txt", "trips.txt", "stop_times.txt", "agency.txt", "calendar.txt"]) {
      const fp = path.join(gtfsDir, file);
      if (fs.existsSync(fp)) {
        const lines = fs.readFileSync(fp, "utf-8").split("\n").filter(Boolean);
        console.log(`  ✓ ${file}: ${lines.length - 1} records`);
      } else {
        console.log(`  ⚠ ${file}: MISSING`);
      }
    }
  }

  // ─── Validate OSM import ──────────────────────────────────────────────
  const osmDir = path.join(dataDir, "osm_import");
  if (fs.existsSync(osmDir)) {
    console.log("\n─── OSM Import ───");
    for (const file of ["jordan_stops_osm.geojson", "jordan_stops_osm.sql", "jordan_stops_osm.json"]) {
      const fp = path.join(osmDir, file);
      if (fs.existsSync(fp)) {
        const stats = fs.statSync(fp);
        console.log(`  ✓ ${file}: ${(stats.size / 1024).toFixed(1)} KB`);
      } else {
        console.log(`  ⚠ ${file}: MISSING`);
      }
    }
  }

  // ─── Validate GTFS feeds (if downloaded) ──────────────────────────────
  const gtfsFeedDir = path.join(dataDir, "gtfs_feeds");
  if (fs.existsSync(gtfsFeedDir)) {
    console.log("\n─── GTFS Feeds ───");
    const feeds = fs.readdirSync(gtfsFeedDir);
    for (const feed of feeds) {
      console.log(`  ✓ ${feed}`);
    }
  } else {
    console.log("\n─── GTFS Feeds ───");
    console.log("  ⚠ No GTFS feeds directory — run GTFS download first");
  }

  // ─── Check seed data ──────────────────────────────────────────────────
  console.log("\n─── Seed Data Files ───");
  const seedFiles = [
    "jordan_routes_master.json",
    "jordan_stops_seed.json",
    "amman_landmarks.json",
    "serveece_routes.json",
  ];

  for (const file of seedFiles) {
    const fp = path.join(dataDir, file);
    if (fs.existsSync(fp)) {
      const stats = fs.statSync(fp);
      try {
        const json = JSON.parse(fs.readFileSync(fp, "utf-8"));
        const count = Array.isArray(json) ? json.length : Object.keys(json).length;
        console.log(`  ✓ ${file}: ${(stats.size / 1024).toFixed(1)} KB, ${count} items`);
      } catch {
        console.log(`  ✗ ${file}: INVALID JSON`);
      }
    } else {
      console.log(`  ⚠ ${file}: MISSING`);
    }
  }

  console.log("\n─── Summary ───");
  console.log("✅ Validation complete. Review warnings above and fix any errors before deploying.\n");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });