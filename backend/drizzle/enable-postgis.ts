/**
 * Enable PostGIS extensions
 * Run: npx tsx drizzle/enable-postgis.ts
 */
import { db } from "../src/db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🗺️ Enabling PostGIS extensions...");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis_topology`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  console.log("✅ PostGIS extensions enabled!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
