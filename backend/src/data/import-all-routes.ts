/**
 * Import ALL 219 routes + 1039 stops from unified JSON into PostgreSQL
 * Run: npx tsx src/data/import-all-routes.ts
 */
import "dotenv/config";
import { db } from "../db/index.js";
import { stops, routes, routeStops, agencies } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { readFileSync } from "fs";

const GOV_MAP: Record<string, string> = {
  العاصمة: "عمان", عمان: "عمان", الزرقاء: "الزرقاء", إربد: "إربد",
  البلقاء: "البلقاء", مادبا: "مادبا", الكرك: "الكرك", الطفيلة: "الطفيلة",
  معان: "معان", العقبة: "العقبة", جرش: "جرش", عجلون: "عجلون", المفرق: "المفرق",
};

function makeId(input: string): string {
  // Create a deterministic UUID-like ID from a string
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function importAllStops() {
  const raw = JSON.parse(readFileSync("./src/data/unified_stops.json", "utf-8"));
  const stopList = raw.stops || raw;
  console.log(`📥 Found ${stopList.length} stops in unified data`);

  let imported = 0;
  let skipped = 0;

  for (const s of stopList) {
    const stopId = makeId(`stop-${s.code || s.name_ar}`);
    const gov = GOV_MAP[s.governorate] || "عمان";

    try {
      // Check if stop exists
      const existing = await db.select({ id: stops.id }).from(stops).where(eq(stops.code, s.code || s.name_ar)).limit(1);
      if (existing.length > 0) { skipped++; continue; }

      await db.insert(stops).values({
        id: stopId,
        code: s.code || s.name_ar?.slice(0, 20) || `ST-${imported}`,
        name_ar: s.name_ar || "محطة",
        name_en: s.name_en || "Stop",
        lat: s.lat || 31.95,
        lng: s.lng || 35.91,
        governorate: gov,
        city: s.city || null,
        is_terminal: s.is_terminal || false,
        has_shelter: s.has_shelter || false,
        has_lighting: s.has_lighting || false,
        has_accessibility: s.has_accessibility || false,
        has_ticket_machine: s.has_ticket_machine || false,
        has_ac: false,
        photo_url: s.photo_url || null,
      });
      imported++;
      if (imported % 100 === 0) console.log(`  Stops: ${imported} imported...`);
    } catch (err: any) {
      if (err.code === "23505") { skipped++; continue; } // Duplicate code
      console.error(`  Stop error: ${s.code}: ${err.message?.slice(0, 80)}`);
      skipped++;
    }
  }
  console.log(`✅ Stops: ${imported} imported, ${skipped} skipped`);
}

async function importAllRoutes() {
  const raw = JSON.parse(readFileSync("./src/data/unified_routes.json", "utf-8"));
  const routeList = raw.routes || raw;
  console.log(`📥 Found ${routeList.length} routes in unified data`);

  // Ensure we have an agency for each mode
  const agencyIds: Record<string, string> = {
    city_bus: makeId("agency-city-bus"),
    brt: makeId("agency-brt"),
    serveece: makeId("agency-serveece"),
    coaster: makeId("agency-coaster"),
    intercity: makeId("agency-intercity"),
  };

  const modeAgencyNames: Record<string, [string, string, string]> = {
    city_bus: ["city_bus", "أمانة عمان الكبرى", "GAM - Bus"],
    brt: ["brt", "الباص السريع", "BRT Jordan"],
    serveece: ["serveece", "سرفيس الأردن", "Jordan Serveece"],
    coaster: ["city_bus", "كوستر الأردن", "Jordan Coaster"],
    intercity: ["intercity", "النقل بين المدن", "Intercity Transport"],
  };

  for (const [mode, id] of Object.entries(agencyIds)) {
    const [m, ar, en] = modeAgencyNames[mode];
    try {
      await db.insert(agencies).values({
        id, code: `AG-${mode.toUpperCase()}`, name_ar: ar, name_en: en, mode: m,
      }).onConflictDoNothing();
    } catch {}
  }

  let imported = 0;
  let skipped = 0;

  for (const r of routeList) {
    const routeId = makeId(`route-${r.code}`);
    const mode = r.mode === "coaster" ? "city_bus" : r.mode;
    const agencyId = agencyIds[r.mode] || agencyIds.city_bus;
    const color = r.color || (mode === "brt" ? "#E60026" : mode === "city_bus" ? "#0066CC" : mode === "serveece" ? "#FF8C00" : "#6B21A8");

    try {
      // Check if route code exists
      const existing = await db.select({ id: routes.id }).from(routes).where(eq(routes.code, r.code)).limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const pathGeojson = r.path_geojson || null;
      const distance = r.distance || null;
      const baseFare = r.base_fare ? String(r.base_fare) : (mode === "brt" ? "0.500" : mode === "intercity" ? "1.500" : "0.350");

      await db.insert(routes).values({
        id: routeId,
        code: r.code || `R-${imported}`,
        name_ar: r.name_ar || "خط",
        name_en: r.name_en || "Route",
        mode,
        agency_id: agencyId,
        color,
        origin_stop_id: null,
        destination_stop_id: null,
        path_geojson: pathGeojson,
        distance,
        base_fare: baseFare,
        is_active: r.is_active !== false,
        has_friday_schedule: mode === "brt" || mode === "city_bus",
        has_ramadan_schedule: mode === "brt" || mode === "city_bus",
      });

      // Import route stops from GeoJSON coordinates
      if (pathGeojson && pathGeojson.coordinates) {
        const coords = pathGeojson.coordinates;
        let seq = 0;
        for (const coord of coords) {
          const [lng, lat] = coord;
          const stopCode = `${r.code}-S${seq.toString().padStart(3, "0")}`;
          const stopId = makeId(stopCode);

          // Insert or find stop
          try {
            await db.insert(stops).values({
              id: stopId,
              code: stopCode,
              name_ar: `${r.name_ar} - محطة ${seq + 1}`,
              name_en: `${r.name_en || "Route"} Stop ${seq + 1}`,
              lat, lng,
              governorate: "عمان",
              is_terminal: seq === 0 || seq === coords.length - 1,
              has_shelter: seq === 0 || seq === coords.length - 1,
              has_lighting: true,
              has_accessibility: seq === 0,
              has_ticket_machine: false,
              has_ac: false,
            }).onConflictDoNothing();
          } catch {}

          // Insert route-stop junction
          try {
            await db.insert(routeStops).values({
              route_id: routeId,
              stop_id: stopId,
              seq,
              is_boarding_zone: mode === "serveece",
            }).onConflictDoNothing();
          } catch {}
          seq++;
        }
      }

      imported++;
      if (imported % 50 === 0) console.log(`  Routes: ${imported} imported...`);
    } catch (err: any) {
      if (err.code === "23505") { skipped++; continue; }
      console.error(`  Route error: ${r.code}: ${err.message?.slice(0, 100)}`);
      skipped++;
    }
  }
  console.log(`✅ Routes: ${imported} imported, ${skipped} skipped`);
}

async function main() {
  console.log("🚌 Starting full route + stop import...\n");
  await importAllStops();
  console.log("");
  await importAllRoutes();
  console.log("\n✅ Done! Restart the backend to see all routes.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
