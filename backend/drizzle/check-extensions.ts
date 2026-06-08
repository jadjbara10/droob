import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const r = await sql`SELECT name, default_version, comment FROM pg_available_extensions WHERE name IN ('postgis','postgis_topology','pg_trgm','uuid-ossp','fuzzystrmatch','postgis_tiger_geocoder')`;
  console.log(JSON.stringify(r, null, 2));
  await sql.end();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
