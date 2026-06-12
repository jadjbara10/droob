/**
 * FAST import: 219 routes with GeoJSON paths directly (no stop generation per coord)
 * Run: npx tsx src/data/import-all-routes-fast.ts
 */
import "dotenv/config";
import { db } from "../db/index.js";
import { routes, agencies } from "../../drizzle/schema.js";
import { readFileSync } from "fs";

function makeId(input: string): string {
  // Create a deterministic v4-format UUID from a string seed
  let hash = 0;
  for (let i = 0; i < input.length; i++) { hash = ((hash << 5) - hash) + input.charCodeAt(i); hash |= 0; }
  const h = (x: number) => Math.abs(x).toString(16).padStart(8, "0");
  const raw = h(hash) + h(hash ^ 0x11111111) + h(hash ^ 0x22222222) + h(hash ^ 0x33333333) + h(hash ^ 0x44444444);
  // Format as v4 UUID: 8-4-4-4-12
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-4${raw.slice(13,16)}-8${raw.slice(17,20)}-${raw.slice(20,32)}`;
}

async function ensureAgencies() {
  const items: [string, string, string, string][] = [
    ["AG-CITY", "أمانة عمان الكبرى", "GAM City Bus", "city_bus"],
    ["AG-BRT", "الباص السريع", "BRT Jordan", "brt"],
    ["AG-SERV", "سرفيس الأردن", "Jordan Serveece", "serveece"],
    ["AG-INTER", "النقل بين المدن", "Intercity Transport", "intercity"],
  ];
  for (const [code, ar, en, mode] of items) {
    try {
      await db.insert(agencies).values({ id: makeId(code), code, name_ar: ar, name_en: en, mode })
        .onConflictDoNothing();
    } catch {}
  }
  console.log("✅ Agencies ready");
}

async function importRoutesFast() {
  const raw = JSON.parse(readFileSync("./src/data/unified_routes.json", "utf-8"));
  const routeList = raw.routes || raw;
  console.log(`📥 ${routeList.length} routes to import\n`);

  const agencyByMode: Record<string, string> = {
    city_bus: makeId("AG-CITY"), brt: makeId("AG-BRT"),
    serveece: makeId("AG-SERV"), coaster: makeId("AG-CITY"), intercity: makeId("AG-INTER"),
  };
  const colors: Record<string, string> = {
    city_bus: "#0066CC", brt: "#E60026", serveece: "#E07B00", coaster: "#0066CC", intercity: "#6B21A8",
  };

  let imported = 0;
  // Batch insert in groups of 20
  const batch: any[] = [];

  for (const r of routeList) {
    const mode = r.mode === "coaster" ? "city_bus" : r.mode;
    const routeId = makeId(`route-${r.code}`);
    const pathGeojson = r.path_geojson || null;
    const distance = r.distance || (pathGeojson?.coordinates ? Math.round(pathGeojson.coordinates.length * 50) : null);

    batch.push({
      id: routeId, code: r.code || `R-${imported}`,
      name_ar: r.name_ar || "خط", name_en: r.name_en || "Route",
      mode, agency_id: agencyByMode[mode] || agencyByMode.city_bus,
      color: r.color || colors[mode] || "#0066CC",
      origin_stop_id: null, destination_stop_id: null,
      path_geojson: pathGeojson, distance,
      base_fare: String(r.base_fare || (mode === "brt" ? "0.500" : mode === "intercity" ? "1.500" : "0.350")),
      is_active: r.is_active !== false,
      has_friday_schedule: mode === "brt" || mode === "city_bus",
      has_ramadan_schedule: mode === "brt" || mode === "city_bus",
    });

    if (batch.length >= 20) {
      await flushBatch(batch);
      imported += batch.length;
      console.log(`  Routes: ${imported}/${routeList.length}...`);
      batch.length = 0;
    }
  }
  if (batch.length > 0) { await flushBatch(batch); imported += batch.length; }
  console.log(`\n✅ Routes: ${imported} imported (${routeList.length - imported} skipped/duplicate)`);
}

async function flushBatch(batch: any[]) {
  // Insert one by one to skip duplicates (Postgres ON CONFLICT DO NOTHING)
  for (const r of batch) {
    try {
      await db.insert(routes).values(r).onConflictDoNothing();
    } catch (err: any) {
      if (!err.message?.includes("duplicate")) console.error(`  Error ${r.code}: ${err.message?.slice(0, 80)}`);
    }
  }
}

async function main() {
  console.log("🚌 Fast route import (GeoJSON paths only)\n");
  await ensureAgencies();
  await importRoutesFast();
  // Count result
  const all = await db.select({ code: routes.code, name_ar: routes.name_ar, mode: routes.mode }).from(routes);
  const byMode: Record<string, number> = {};
  for (const r of all) { byMode[r.mode] = (byMode[r.mode] || 0) + 1; }
  console.log(`\n📊 Database now has ${all.length} routes:`);
  for (const [m, c] of Object.entries(byMode).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${m}: ${c}`);
  }
  process.exit(0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
