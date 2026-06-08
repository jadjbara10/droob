/**
 * Import OSRM-snapped paths into PostgreSQL route table
 * Run: npx tsx src/data/import-osrm-paths.ts
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { db } from "../db/index.js";
import { routes } from "../../drizzle/schema.js";
import { eq, sql } from "drizzle-orm";

async function main() {
  const raw = JSON.parse(
    readFileSync("../mobile/src/config/generated-route-paths-osrm.json", "utf-8")
  );
  const osrmData = raw.paths || raw;
  console.log(`OSRM routes loaded: ${osrmData.length}`);

  // First, get all DB routes for matching
  const allRoutes = await db.select({
    id: routes.id, code: routes.code, name_ar: routes.name_ar,
  }).from(routes);
  console.log(`DB routes: ${allRoutes.length}`);

  let updated = 0;
  let skipped = 0;

  for (const r of osrmData) {
    if (!r.coords || r.coords.length < 2) { skipped++; continue; }

    // Build GeoJSON LineString: convert [lat,lng] → [lng,lat]
    const coords = r.coords.map(([lat, lng]: [number, number]) => [lng, lat]);
    const geojson = JSON.stringify({ type: "LineString", coordinates: coords });

    // Match by route code (exact or partial)
    const osrmCode = r.id.toUpperCase().replace(/_/g, "-");
    const match = allRoutes.find(
      (db) => db.code === osrmCode || db.code.startsWith(osrmCode)
    );

    if (match) {
      await db.update(routes)
        .set({ path_geojson: geojson } as any)
        .where(eq(routes.id, match.id));
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Updated: ${updated}, Skipped (no match): ${skipped}`);

  const count = await db.execute(sql`SELECT count(*) FROM routes WHERE path_geojson IS NOT NULL`);
  console.log(`Routes with path_geojson: ${count.rows[0].count}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
