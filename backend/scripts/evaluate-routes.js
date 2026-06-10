/**
 * دروب Droob — Route Evaluation Script (Sprint 1, Task 1.1)
 *
 * Evaluates every route in the database against 4 criteria:
 *   1. has_path_geojson — does the route have a GeoJSON path?
 *   2. path_quality      — is the GeoJSON valid / detailed enough?
 *   3. stop_count        — how many stops are attached via route_stops?
 *   4. origin/dest IDs   — are origin_stop_id and destination_stop_id set?
 *
 * Classification:
 *   ACCURATE     — good path + good stops + has origin/dest
 *   NEEDS-FIX    — has a path but low quality or missing origin/dest
 *   NEEDS-REDRAW — no path at all
 *   MISSING-DATA — no path, no origin/dest, no stops (placeholder route)
 *
 * Output: D:\temp\route_evaluation.csv (UTF-8 BOM for Arabic Excel compat)
 *
 * Run: npx tsx backend/scripts/evaluate-routes.js
 */

import "dotenv/config";
import { db } from "../src/db/index.js";
import { routes, routeStops } from "../drizzle/schema.js";
import { sql } from "drizzle-orm";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// ─── Path Quality Evaluation ────────────────────────────────────────────────

/**
 * Validates a GeoJSON LineString path and returns a quality report.
 * @param {unknown} geojson - The raw path_geojson value from DB (jsonb → parsed object or null)
 * @returns {{ label: string, coordCount: number, issues: string[] }}
 */
function evaluatePathQuality(geojson) {
  const issues = [];

  // No path at all
  if (geojson == null) {
    return { label: "MISSING", coordCount: 0, issues: ["no path_geojson"] };
  }

  // Must be an object
  if (typeof geojson !== "object" || Array.isArray(geojson)) {
    return { label: "INVALID", coordCount: 0, issues: ["not a GeoJSON object"] };
  }

  // Must be a LineString
  if (geojson.type !== "LineString") {
    issues.push(`wrong type: ${geojson.type ?? "undefined"}`);
  }

  // Must have coordinates array
  const coords = geojson.coordinates;
  if (!Array.isArray(coords)) {
    issues.push("missing coordinates array");
    return { label: "BROKEN", coordCount: 0, issues };
  }

  const coordCount = coords.length;

  // Validate coordinate structure
  let invalidCoordCount = 0;
  let nullCoordCount = 0;
  for (let i = 0; i < coords.length; i++) {
    const c = coords[i];
    if (c == null) {
      nullCoordCount++;
      continue;
    }
    if (!Array.isArray(c) || c.length < 2) {
      invalidCoordCount++;
      continue;
    }
    const [lng, lat] = c;
    if (typeof lng !== "number" || typeof lat !== "number" || isNaN(lng) || isNaN(lat)) {
      invalidCoordCount++;
    }
  }

  if (nullCoordCount > 0) issues.push(`${nullCoordCount} null coordinates`);
  if (invalidCoordCount > 0) issues.push(`${invalidCoordCount} invalid coordinates`);

  // Coordinate count checks
  if (coordCount < 2) {
    issues.push(`only ${coordCount} coordinate(s), need ≥ 2`);
  } else if (coordCount < 5) {
    issues.push(`low detail: only ${coordCount} coordinates`);
  }

  // Determine quality label
  if (coordCount === 0 || (coordCount - nullCoordCount - invalidCoordCount) < 2) {
    return { label: "BROKEN", coordCount, issues };
  }
  if (issues.length > 0) {
    return { label: "LOW", coordCount, issues };
  }
  if (coordCount < 5) {
    return { label: "LOW", coordCount, issues: [`low detail: ${coordCount} coords`] };
  }
  if (coordCount < 20) {
    return { label: "OK", coordCount, issues };
  }
  return { label: "GOOD", coordCount, issues };
}

// ─── Classification ─────────────────────────────────────────────────────────

/**
 * Classify a route based on the four evaluation criteria.
 *
 * Decision logic (ordered — first match wins):
 *   MISSING-DATA:  no path AND no origin/dest AND no stops → placeholder
 *   NEEDS-REDRAW:  no path (or broken path) → must generate from scratch
 *   NEEDS-FIX:     has valid path BUT (low quality OR missing origin/dest OR no stops)
 *   ACCURATE:      good/ok path + has origin/dest + has stops
 *
 * @returns {"ACCURATE"|"NEEDS-FIX"|"NEEDS-REDRAW"|"MISSING-DATA"}
 */
function classify(hasPath, pathQuality, stopCount, hasOriginDest) {
  const hasValidPath = hasPath && pathQuality.label !== "BROKEN" && pathQuality.label !== "INVALID";
  const hasGoodPath = hasPath && (pathQuality.label === "GOOD" || pathQuality.label === "OK");
  const hasStops = stopCount >= 2;

  // MISSING-DATA: nothing usable — probably a placeholder
  if (!hasValidPath && !hasOriginDest && !hasStops) {
    return "MISSING-DATA";
  }

  // NEEDS-REDRAW: no usable path
  if (!hasValidPath) {
    return "NEEDS-REDRAW";
  }

  // NEEDS-FIX: has a valid path but something is suboptimal
  if (!hasGoodPath || !hasOriginDest || !hasStops) {
    return "NEEDS-FIX";
  }

  // ACCURATE: everything looks good
  return "ACCURATE";
}

// ─── CSV Export ─────────────────────────────────────────────────────────────

/**
 * Escapes a CSV field — quotes if it contains commas, quotes, or newlines.
 */
function csvEscape(val) {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Converts results array to CSV string with header.
 */
function toCSV(results) {
  const headers = [
    "id",
    "code",
    "name_ar",
    "name_en",
    "mode",
    "is_active",
    "has_path",
    "path_quality",
    "coord_count",
    "path_issues",
    "stop_count",
    "has_origin_dest",
    "origin_stop_id",
    "destination_stop_id",
    "distance_m",
    "classification",
  ];

  const rows = results.map((r) =>
    headers.map((h) => csvEscape(r[h])).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 دروب Droob — Route Evaluation Tool\n");
  console.log("═".repeat(55));

  // 1. Fetch all routes (ordered by code for deterministic output)
  const allRoutes = await db
    .select()
    .from(routes)
    .orderBy(routes.code)
    .execute();

  console.log(`📋 Total routes in database: ${allRoutes.length}`);

  // 2. Fetch stop counts per route via GROUP BY on route_stops
  const stopCountRows = await db
    .select({
      route_id: routeStops.route_id,
      count: sql`COUNT(*)::int`.as("count"),
    })
    .from(routeStops)
    .groupBy(routeStops.route_id)
    .execute();

  const stopCountMap = new Map();
  for (const row of stopCountRows) {
    stopCountMap.set(row.route_id, row.count);
  }

  // 3. Evaluate every route
  const results = [];
  const stats = { ACCURATE: 0, "NEEDS-FIX": 0, "NEEDS-REDRAW": 0, "MISSING-DATA": 0 };
  const byMode = {};

  for (const route of allRoutes) {
    // --- Criterion 1: has_path_geojson ---
    const hasPath = route.path_geojson != null;

    // --- Criterion 2: path quality ---
    const pathQuality = evaluatePathQuality(route.path_geojson);

    // --- Criterion 3: stop count ---
    const stopCount = stopCountMap.get(route.id) ?? 0;

    // --- Criterion 4: origin/destination ---
    const hasOriginDest =
      route.origin_stop_id != null && route.destination_stop_id != null;

    // --- Classify ---
    const classification = classify(hasPath, pathQuality, stopCount, hasOriginDest);

    // Track stats
    stats[classification]++;
    byMode[route.mode] ??= { total: 0, accurate: 0 };
    byMode[route.mode].total++;
    if (classification === "ACCURATE") byMode[route.mode].accurate++;

    results.push({
      id: route.id,
      code: route.code,
      name_ar: route.name_ar,
      name_en: route.name_en,
      mode: route.mode,
      is_active: route.is_active,
      has_path: hasPath,
      path_quality: pathQuality.label,
      coord_count: pathQuality.coordCount,
      path_issues: pathQuality.issues.join("; "),
      stop_count: stopCount,
      has_origin_dest: hasOriginDest,
      origin_stop_id: route.origin_stop_id ?? "",
      destination_stop_id: route.destination_stop_id ?? "",
      distance_m: route.distance ?? "",
      classification,
    });
  }

  // 4. Write CSV to D:\temp
  const csv = toCSV(results);
  const outputPath = "D:\\temp\\route_evaluation.csv";
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, "﻿" + csv, "utf-8"); // BOM for Excel Arabic rendering

  // 5. Print summary
  const total = allRoutes.length;
  const pct = (n) => ((n / total) * 100).toFixed(1);

  console.log(`\n📊 EVALUATION SUMMARY`);
  console.log(`═`.repeat(55));
  console.log(`  ✅ ACCURATE:       ${String(stats["ACCURATE"]).padStart(4)}  (${pct(stats["ACCURATE"])}%)`);
  console.log(`  🔧 NEEDS-FIX:      ${String(stats["NEEDS-FIX"]).padStart(4)}  (${pct(stats["NEEDS-FIX"])}%)`);
  console.log(`  🗺️  NEEDS-REDRAW:   ${String(stats["NEEDS-REDRAW"]).padStart(4)}  (${pct(stats["NEEDS-REDRAW"])}%)`);
  console.log(`  ❌ MISSING-DATA:   ${String(stats["MISSING-DATA"]).padStart(4)}  (${pct(stats["MISSING-DATA"])}%)`);
  console.log(`  ───────────────────────────────`);
  console.log(`  📋 Total:          ${String(total).padStart(4)}`);

  // Per-mode breakdown if multiple modes exist
  const modes = Object.keys(byMode);
  if (modes.length > 1) {
    console.log(`\n📋 By Mode:`);
    for (const mode of modes.sort()) {
      const m = byMode[mode];
      console.log(`  ${mode.padEnd(14)} ${String(m.accurate).padStart(3)}/${m.total} accurate`);
    }
  }

  // Show top issues
  const needsRedraw = results.filter((r) => r.classification === "NEEDS-REDRAW");
  const missingData = results.filter((r) => r.classification === "MISSING-DATA");

  if (needsRedraw.length > 0) {
    console.log(`\n🗺️  NEEDS-REDRAW routes (${needsRedraw.length}):`);
    const preview = needsRedraw.slice(0, 10);
    for (const r of preview) {
      console.log(`   ${r.code.padEnd(8)} ${r.name_ar.substring(0, 40)}`);
    }
    if (needsRedraw.length > 10) {
      console.log(`   ... and ${needsRedraw.length - 10} more (see CSV)`);
    }
  }

  if (missingData.length > 0) {
    console.log(`\n❌ MISSING-DATA routes (${missingData.length}):`);
    const preview = missingData.slice(0, 10);
    for (const r of preview) {
      console.log(`   ${r.code.padEnd(8)} ${r.name_ar.substring(0, 40)}`);
    }
    if (missingData.length > 10) {
      console.log(`   ... and ${missingData.length - 10} more (see CSV)`);
    }
  }

  console.log(`\n📁 Full report saved to: ${outputPath}`);
  console.log(`═`.repeat(55));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Evaluation failed:", err);
  process.exit(1);
});
