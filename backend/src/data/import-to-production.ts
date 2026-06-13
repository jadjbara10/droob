/**
 * Import 1,070 routes from droob_all_routes.geojson to Railway production PostgreSQL.
 * Run: cd droob && npx tsx backend/src/data/import-to-production.ts
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import crypto from "crypto";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Production database (same as .env)
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required. Run: DATABASE_URL=\"postgresql://...\" npx tsx backend/src/data/import-to-production.ts");
  process.exit(1);
}

// Transport type → mode mapping
const TYPE_TO_MODE: Record<string, string> = {
  "سرفيس": "serveece",
  "كوستر": "city_bus",
  "حافله": "city_bus",
  "حافلة": "city_bus",
  "باص": "city_bus",
};

// Mode → default fare
const MODE_FARES: Record<string, number> = {
  serveece: 0.250,
  city_bus: 0.500,
  brt: 0.500,
  intercity: 1.000,
};

// Mode → default headway (peak, offpeak minutes)
const MODE_HEADWAYS: Record<string, [number, number]> = {
  serveece: [10, 20],
  city_bus: [15, 30],
  brt: [5, 10],
  intercity: [30, 60],
};

// Amman bounding box for validation
const AMMAN_BOUNDS = {
  minLng: 35.75, maxLng: 36.10,
  minLat: 31.70, maxLat: 32.05,
};

interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: {
    source?: string;
    route_number?: string;
    route_name?: string;
    direction?: string;
    start_route?: string;
    end_route?: string;
    company?: string;
    transport_type?: string;
    trip_direction?: string;
    objectid?: number;
  };
}

interface RouteRecord {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  mode: string;
  color: string;
  distance: number;
  base_fare: string;
  direction: string;
  return_route_id: string | null;
  path_geojson: string;
  first_departure: string | null;
  last_departure: string | null;
  headway_peak: number | null;
  headway_offpeak: number | null;
  is_active: boolean;
  has_friday_schedule: boolean;
  has_ramadan_schedule: boolean;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateCode(mode: string, index: number, tripDir: string): string {
  const prefix = mode === "serveece" ? "SRV" : mode === "city_bus" ? "BUS" : mode === "brt" ? "BRT" : "INT";
  const dir = tripDir === "ذهاب" ? "F" : "R";
  return `${prefix}-${String(index).padStart(4, "0")}${dir}`;
}

function toEnglishName(arabicName: string): string {
  // Transliterate common patterns for English name
  return arabicName
    .replace(/باص/g, "Bus")
    .replace(/سرفيس/g, "Serveece")
    .replace(/مجمع/g, "Complex")
    .replace(/محطة/g, "Station")
    .replace(/شارع/g, "St.")
    .replace(/ميدان/g, "Square")
    .replace(/دوار/g, "Roundabout")
    .replace(/مستشفى/g, "Hospital")
    .replace(/جامعة/g, "University")
    .replace(/مسجد/g, "Mosque")
    .replace(/جسر/g, "Bridge")
    .replace(/نفق/g, "Tunnel")
    .trim();
}

function validateCoordinates(coords: number[][]): { valid: boolean; reason?: string } {
  if (!coords || coords.length < 2) {
    return { valid: false, reason: "Less than 2 coordinates" };
  }
  for (const [lng, lat] of coords) {
    if (typeof lng !== "number" || typeof lat !== "number") continue;
    if (lng < AMMAN_BOUNDS.minLng || lng > AMMAN_BOUNDS.maxLng ||
        lat < AMMAN_BOUNDS.minLat || lat > AMMAN_BOUNDS.maxLat) {
      // Just warn, don't reject — some intercity routes go outside Amman
    }
  }
  return { valid: true };
}

function calculateDistance(coords: number[][]): number {
  // Haversine distance in meters
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLng/2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  return Math.round(total);
}

function getModeColor(mode: string): string {
  const colors: Record<string, string> = {
    serveece: "#00E5A0",  // Green
    city_bus: "#3BB0FF",  // Blue
    brt: "#E31937",       // Red
    intercity: "#FF8C42", // Orange
  };
  return colors[mode] || "#3BB0FF";
}

async function main() {
  console.log("🔗 Connecting to production database...");
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("✅ Connected.");

  try {
    // Read GeoJSON
    const geojsonPath = join(__dirname, "..", "..", "..", "..", "data", "merged", "droob_all_routes.geojson");
    console.log(`📂 Reading ${geojsonPath}...`);
    const raw = readFileSync(geojsonPath, "utf-8");
    const geojson = JSON.parse(raw);
    const features: GeoJSONFeature[] = geojson.features;
    console.log(`📊 Found ${features.length} features.`);

    // Count current routes
    const { rows: [{ count: currentCount }] } = await client.query("SELECT COUNT(*) FROM routes");
    console.log(`📦 Current routes in DB: ${currentCount}`);

    if (parseInt(currentCount) >= 1070) {
      console.log("✅ Already have 1,070+ routes. Skipping import.");
    } else {
      // Delete existing routes to re-import cleanly
      console.log("🗑️  Cleaning existing routes...");
      await client.query("DELETE FROM route_stops");
      await client.query("DELETE FROM routes");
      console.log("✅ Cleaned.");

      // Build route records
      const routes: RouteRecord[] = [];
      const stats = { imported: 0, skipped: 0, errors: 0 };
      const modeCounts: Record<string, number> = {};
      let codeIndex = 0;

      // Track forward→return pairs
      const forwardRoutes: Map<string, string> = new Map(); // route_number + start → forward_id

      // First pass: create forward routes
      for (const feat of features) {
        const p = feat.properties;
        const coords = feat.geometry?.coordinates || [];

        if (coords.length < 2) {
          stats.skipped++;
          continue;
        }

        const tripDir = p.trip_direction || "ذهاب";
        const transportType = p.transport_type || "";
        const mode = TYPE_TO_MODE[transportType] || "city_bus";
        const routeNumber = p.route_number || `UNKNOWN-${stats.imported}`;
        const routeName = p.route_name || routeNumber;

        codeIndex++;
        const id = generateUUID();
        const code = generateCode(mode, codeIndex, tripDir);

        const pathGeojson = JSON.stringify({
          type: "LineString",
          coordinates: coords,
        });

        const distance = calculateDistance(coords);
        const baseFare = MODE_FARES[mode] || 0.500;
        const [headwayPeak, headwayOffpeak] = MODE_HEADWAYS[mode] || [20, 40];
        const color = getModeColor(mode);
        const direction = tripDir === "ذهاب" ? "forward" : "return";

        // Generate English name
        const nameEn = toEnglishName(routeName);

        const route: RouteRecord = {
          id,
          code,
          name_ar: routeName,
          name_en: nameEn || routeName,
          mode,
          color,
          distance,
          base_fare: baseFare.toFixed(3),
          direction,
          return_route_id: null,
          path_geojson: pathGeojson,
          first_departure: mode === "brt" ? "06:00" : null,
          last_departure: mode === "brt" ? "22:00" : null,
          headway_peak: headwayPeak,
          headway_offpeak: headwayOffpeak,
          is_active: true,
          has_friday_schedule: true,
          has_ramadan_schedule: mode === "brt" || mode === "city_bus",
        };

        routes.push(route);
        modeCounts[mode] = (modeCounts[mode] || 0) + 1;
        stats.imported++;
      }

      // Bulk insert
      console.log(`💾 Inserting ${routes.length} routes...`);

      const BATCH_SIZE = 100;
      for (let i = 0; i < routes.length; i += BATCH_SIZE) {
        const batch = routes.slice(i, i + BATCH_SIZE);
        const values: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        for (const r of batch) {
          values.push(`(${[
            paramIdx++, paramIdx++, paramIdx++, paramIdx++, paramIdx++,
            paramIdx++, paramIdx++, paramIdx++, paramIdx++, paramIdx++,
            paramIdx++, paramIdx++, paramIdx++, paramIdx++, paramIdx++,
            paramIdx++, paramIdx++, paramIdx++, paramIdx++, paramIdx++,
          ].map(n => `$${n}`).join(",")})`);

          params.push(
            r.id, r.code, r.name_ar, r.name_en, r.mode,
            null, // agency_id
            r.color, null, null, // origin_stop_id, destination_stop_id
            r.distance, r.base_fare, null, null, // fare_min, fare_max
            r.is_active, r.has_friday_schedule, r.has_ramadan_schedule,
            r.headway_peak, r.headway_offpeak,
            r.first_departure, r.last_departure,
            r.direction, r.return_route_id,
            r.path_geojson
          );
        }

        const sql = `
          INSERT INTO routes (
            id, code, name_ar, name_en, mode,
            agency_id, color, origin_stop_id, destination_stop_id,
            distance, base_fare, fare_min, fare_max,
            is_active, has_friday_schedule, has_ramadan_schedule,
            headway_peak, headway_offpeak,
            first_departure, last_departure,
            direction, return_route_id,
            path_geojson
          ) VALUES ${values.join(",")}
        `;

        await client.query(sql, params);

        if ((i + BATCH_SIZE) % 500 === 0 || i + BATCH_SIZE >= routes.length) {
          console.log(`  Progress: ${Math.min(i + BATCH_SIZE, routes.length)}/${routes.length}`);
        }
      }

      console.log(`✅ Import complete!`);
      console.log(`   Total imported: ${stats.imported}`);
      console.log(`   Skipped: ${stats.skipped}`);
      console.log(`   Mode breakdown: ${JSON.stringify(modeCounts)}`);
    }

    // Verify
    const { rows: [{ count: finalCount }] } = await client.query("SELECT COUNT(*) FROM routes");
    console.log(`\n📊 Final route count: ${finalCount}`);

    if (parseInt(finalCount) >= 1070) {
      console.log("✅ VERIFIED: 1,070+ routes in production database!");
    } else {
      console.log(`⚠️  Expected 1,070+, got ${finalCount}`);
    }

  } catch (err) {
    console.error("❌ Import failed:", err);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
