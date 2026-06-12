/**
 * Bulk seed — reads unified-transit-data.json and inserts ALL governorates
 * No PostGIS dependency. Run: npx tsx drizzle/seed-all.ts
 */
import { db } from "../src/db/index.js";
import { stops, routes, governorates } from "./schema.js";
import { readFileSync } from "fs";
import { join } from "path";

interface UnifiedStop {
  id?: string; name_ar?: string; name_en?: string;
  lat?: number; lng?: number;
  governorate_ar?: string; governorate?: string;
  transport_type?: string;
  is_terminal?: boolean;
  station_class?: string;
  source_file?: string;
}

interface UnifiedRoute {
  id?: string; name_ar?: string; name_en?: string;
  transport_type?: string; mode?: string;
  color?: string;
  governorate_ar?: string;
  fare?: number; fare_min?: number; fare_max?: number;
  distance?: number;
  headway_peak?: number; headway_offpeak?: number;
  first_departure?: string; last_departure?: string;
  path_geojson?: any;
  route_number?: string;
  company_name?: string;
}

async function seed() {
  console.log("🌱 Droob Bulk Seed — All Governorates\n");

  // ── Load unified data ──
  const dataPath = join(import.meta.dirname, "..", "src", "data", "unified-transit-data.json");
  console.log(`📂 Loading: ${dataPath}`);
  const raw = readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw);
  // Flatten grouped dicts (keys: brt, bus, service, coaster, etc.)
  const unifiedStops: UnifiedStop[] = Object.values(data.stops || {}).flat() as UnifiedStop[];
  const unifiedRoutes: UnifiedRoute[] = Object.values(data.routes || {}).flat() as UnifiedRoute[];
  console.log(`   Stops: ${unifiedStops.length}, Routes: ${unifiedRoutes.length}`);

  // ── Governorates (add any missing) ──
  const govMap: Record<string, string> = {};
  const allGovs = await db.select().from(governorates);
  for (const g of allGovs) govMap[g.name_ar] = g.id;
  console.log(`   Governorates: ${allGovs.length}`);

  // ── Seed Stops (batch of 100) ──
  console.log("\n📍 Seeding stops...");
  let stopsAdded = 0, stopsSkipped = 0;
  for (let i = 0; i < unifiedStops.length; i += 100) {
    const batch = unifiedStops.slice(i, i + 100).map((s, idx) => ({
      code: s.id || `STOP-${i + idx}`,
      name_ar: s.name_ar || "محطة",
      name_en: s.name_en || "Stop",
      lat: s.lat || 31.95,
      lng: s.lng || 35.93,
      governorate: s.governorate_ar || s.governorate || "العاصمة",
      is_terminal: s.is_terminal || false,
      is_landmark: false,
      has_shelter: false,
      has_lighting: false,
      has_accessibility: false,
      has_ticket_machine: false,
      has_ac: false,
    }));
    try {
      for (const s of batch) {
        try {
          await db.insert(stops).values(s).onConflictDoNothing();
          stopsAdded++;
        } catch { stopsSkipped++; }
      }
    } catch { stopsSkipped += batch.length; }
    if (i % 500 === 0) console.log(`   ... ${i}/${unifiedStops.length} (added: ${stopsAdded})`);
  }
  console.log(`   ✅ Stops: ${stopsAdded} added, ${stopsSkipped} skipped`);

  // ── Seed Routes (batch of 50) ──
  console.log("\n🚌 Seeding routes...");
  let routesAdded = 0, routesSkipped = 0;
  for (let i = 0; i < unifiedRoutes.length; i += 50) {
    const batch = unifiedRoutes.slice(i, i + 50).map((r, idx) => ({
      code: r.id || r.route_number || `ROUTE-${i + idx}`,
      name_ar: r.name_ar || "خط",
      name_en: r.name_en || "Route",
      mode: r.transport_type || r.mode || "city_bus",
      color: r.color || "#0066CC",
      base_fare: r.fare ? String(r.fare) : "0.350",
      fare_min: r.fare_min ? String(r.fare_min) : null,
      fare_max: r.fare_max ? String(r.fare_max) : null,
      distance: r.distance || null,
      headway_peak: r.headway_peak || null,
      headway_offpeak: r.headway_offpeak || null,
      first_departure: r.first_departure || null,
      last_departure: r.last_departure || null,
      path_geojson: r.path_geojson || null,
      is_active: true,
    }));
    try {
      for (const r of batch) {
        try {
          await db.insert(routes).values(r).onConflictDoNothing();
          routesAdded++;
        } catch { routesSkipped++; }
      }
    } catch { routesSkipped += batch.length; }
    if (i % 250 === 0) console.log(`   ... ${i}/${unifiedRoutes.length} (added: ${routesAdded})`);
  }
  console.log(`   ✅ Routes: ${routesAdded} added, ${routesSkipped} skipped`);

  // ── Summary ──
  const stopCount = await db.select().from(stops);
  const routeCount = await db.select().from(routes);
  console.log(`\n🎯 Done! Database now has:`);
  console.log(`   📍 ${stopCount.length} stops`);
  console.log(`   🚌 ${routeCount.length} routes`);
  console.log(`   🏛️ ${allGovs.length} governorates`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
