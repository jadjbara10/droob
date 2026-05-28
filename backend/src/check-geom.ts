import { db } from "./db/index.js";

const r = await db.execute(
  `SELECT column_name, data_type, udt_name 
   FROM information_schema.columns 
   WHERE table_name = 'stops' AND column_name = 'geom'`
);
console.log("Column info:", JSON.stringify(r.rows, null, 2));

// Also check a sample row to see the actual value
const s = await db.execute(`SELECT id, name_en, pg_typeof(geom) as geom_type, geom::text as geom_text FROM stops WHERE geom IS NOT NULL LIMIT 1`);
console.log("Sample:", JSON.stringify(s.rows, null, 2));

process.exit(0);