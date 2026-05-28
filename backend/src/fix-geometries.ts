import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

await db.execute(sql`
  UPDATE stops
  SET geom = ST_SetSRID(ST_MakePoint(lng::float, lat::float), 4326)::geography
  WHERE geom IS NULL AND lat IS NOT NULL AND lng IS NOT NULL
`);

console.log("✅ All stop geometries populated");
process.exit(0);