/**
 * Import 1,070 routes from droob_all_routes.geojson to Railway production PostgreSQL.
 * Run: cd droob/backend && node src/data/import-all-routes.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const postgres = require("postgres");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

// Transport type → mode
const TYPE_TO_MODE = {
  "سرفيس": "serveece",
  "كوستر": "city_bus",
  "حافله": "city_bus",
  "حافلة": "city_bus",
  "باص": "city_bus",
};

// Mode → default fare (JOD) from official Amman tariffs
const MODE_FARES = {
  serveece: "0.250",
  city_bus: "0.500",
  brt: "0.500",
  intercity: "1.000",
};

// Mode → [peak_headway_min, offpeak_headway_min]
const MODE_HEADWAYS = {
  serveece: [10, 20],
  city_bus: [15, 30],
  brt: [5, 10],
  intercity: [30, 60],
};

// Mode → display color
const MODE_COLORS = {
  serveece: "#00E5A0",
  city_bus: "#3BB0FF",
  brt: "#E31937",
  intercity: "#FF8C42",
};

function calcDistance(coords) {
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

async function main() {
  console.log("🔗 Connecting to production database...");
  const sql = postgres(DATABASE_URL, { max: 10, idle_timeout: 30 });

  try {
    // Read GeoJSON
    const geojsonPath = path.join(__dirname, "..", "..", "..", "..", "data", "merged", "droob_all_routes.geojson");
    console.log(`📂 Reading: ${geojsonPath}`);
    const raw = fs.readFileSync(geojsonPath, "utf-8");
    const geojson = JSON.parse(raw);
    const features = geojson.features;
    console.log(`📊 Features: ${features.length}`);

    // Check current count
    const [{ count: currentCount }] = await sql`SELECT COUNT(*)::int FROM routes`;
    console.log(`📦 Current routes in DB: ${currentCount}`);

    if (currentCount >= 1000) {
      console.log("⚠️  Already have ~1,000+ routes. Dropping and reimporting cleanly...");
      await sql`DELETE FROM route_stops`;
      await sql`DELETE FROM routes`;
      console.log("🗑️  Cleaned existing routes.");
    }

    // Build records
    const routes = [];
    const modeCounts = { serveece: 0, city_bus: 0, brt: 0, intercity: 0 };
    let codeIdx = 0;
    let skipped = 0;

    for (const feat of features) {
      const p = feat.properties;
      const coords = feat.geometry?.coordinates || [];

      if (!coords || coords.length < 2) { skipped++; continue; }

      const tripDir = p.trip_direction || "ذهاب";
      const mode = TYPE_TO_MODE[p.transport_type] || "city_bus";
      const routeName = p.route_name || (p.route_number || "Unknown");

      codeIdx++;
      const id = crypto.randomUUID();
      const prefix = { serveece: "SRV", city_bus: "BUS", brt: "BRT", intercity: "INT" }[mode];
      const dirSuffix = tripDir === "ذهاب" ? "F" : "R";
      const code = `${prefix}-${String(codeIdx).padStart(5, "0")}${dirSuffix}`;

      const distance = calcDistance(coords);
      const baseFare = MODE_FARES[mode];
      const [hp, hop] = MODE_HEADWAYS[mode];
      const color = MODE_COLORS[mode];
      const direction = tripDir === "ذهاب" ? "forward" : "return";

      const pathGeojson = JSON.stringify({
        type: "LineString",
        coordinates: coords,
      });

      routes.push({
        id,
        code,
        name_ar: routeName,
        name_en: routeName,
        mode,
        color,
        distance,
        base_fare: baseFare,
        direction,
        path_geojson: pathGeojson,
        headway_peak: hp,
        headway_offpeak: hop,
        is_active: true,
        has_friday_schedule: true,
        has_ramadan_schedule: mode === "brt" || mode === "city_bus" || mode === "serveece",
      });

      modeCounts[mode]++;
    }

    console.log(`📋 Prepared ${routes.length} routes (${skipped} skipped)`);
    console.log(`   Mode breakdown: ${JSON.stringify(modeCounts)}`);

    // Insert in batches with parameterized queries
    const BATCH = 30;
    let totalInserted = 0;

    for (let i = 0; i < routes.length; i += BATCH) {
      const batch = routes.slice(i, i + BATCH);

      // Build multi-row INSERT with parameterized values
      const columns = ["id","code","name_ar","name_en","mode","color","distance","base_fare","direction","path_geojson","headway_peak","headway_offpeak","is_active","has_friday_schedule","has_ramadan_schedule"];
      const values = [];
      const params = [];
      let pIdx = 1;

      for (const r of batch) {
        const row = [
          r.id, r.code, r.name_ar, r.name_en, r.mode, r.color, r.distance,
          r.base_fare, r.direction, r.path_geojson, r.headway_peak, r.headway_offpeak,
          r.is_active, r.has_friday_schedule, r.has_ramadan_schedule
        ];
        values.push(`(${row.map(() => `$${pIdx++}`).join(",")})`);
        params.push(...row);
      }

      try {
        await sql.unsafe(
          `INSERT INTO routes (${columns.join(",")}) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`,
          params
        );
        totalInserted += batch.length;
      } catch (err) {
        console.error(`  Batch ${i}-${i+BATCH} failed: ${err.message}. Trying row-by-row...`);
        // Fallback: insert one by one
        for (const r of batch) {
          try {
            await sql`
              INSERT INTO routes (id,code,name_ar,name_en,mode,color,distance,base_fare,direction,path_geojson,headway_peak,headway_offpeak,is_active,has_friday_schedule,has_ramadan_schedule)
              VALUES (${r.id},${r.code},${r.name_ar},${r.name_en},${r.mode},${r.color},${r.distance},${r.base_fare},${r.direction},${r.path_geojson},${r.headway_peak},${r.headway_offpeak},${r.is_active},${r.has_friday_schedule},${r.has_ramadan_schedule})
              ON CONFLICT DO NOTHING
            `;
            totalInserted++;
          } catch (e2) {
            skipped++;
          }
        }
      }

      if ((i + BATCH) % 200 === 0 || i + BATCH >= routes.length) {
        console.log(`  Progress: ${Math.min(i + BATCH, routes.length)}/${routes.length}`);
      }
    }

    // Verify
    const [{ count: finalCount }] = await sql`SELECT COUNT(*)::int FROM routes`;
    console.log(`\n📊 Final route count: ${finalCount}`);

    if (finalCount >= 1070) {
      console.log("✅ SUCCESS: 1,070+ routes in production!");
    } else {
      console.log(`⚠️  Got ${finalCount}, expected >= 1070. Check for constraint violations.`);
    }

  } catch (err) {
    console.error("❌ Import failed:", err.message);
    throw err;
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
