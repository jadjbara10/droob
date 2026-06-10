const postgres = require('postgres');
const fs = require('fs');
const crypto = require('crypto');

function makeId(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) { hash = ((hash << 5) - hash) + input.charCodeAt(i); hash |= 0; }
  const h = (x) => Math.abs(x).toString(16).padStart(8, "0");
  const raw = h(hash) + h(hash ^ 0x11111111) + h(hash ^ 0x22222222) + h(hash ^ 0x33333333) + h(hash ^ 0x44444444);
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-4${raw.slice(13,16)}-8${raw.slice(17,20)}-${raw.slice(20,32)}`;
}

const MODE_MAP = { 'سرفيس': 'serveece', 'كوستر': 'coaster', 'حافله': 'bus' };

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 5 });

  const data = JSON.parse(fs.readFileSync('/app/src/data/unified_routes.json', 'utf8'));
  const routes = data.routes || data;
  console.log('Total routes in file:', routes.length);

  // Delete existing routes without paths first, then import fresh
  const existing = await sql`SELECT COUNT(*)::int FROM routes`;
  console.log('Existing routes:', existing[0].count);

  // Import each route as forward + create return
  let imported = 0, returns = 0, skipped = 0;

  for (const r of routes) {
    const code = r.code || 'R-' + makeId(r.name_ar || 'unknown').slice(0, 8);
    const nameAr = r.name_ar || 'خط';
    const nameEn = r.name_en || 'Route';
    const mode = MODE_MAP[r.mode] || r.mode || 'city_bus';
    const color = r.color || '#0066CC';
    const geojson = r.path_geojson;

    if (!geojson || !geojson.coordinates || geojson.coordinates.length < 2) {
      skipped++;
      continue;
    }

    // Create forward route
    const fwdId = makeId(code + '-fwd');
    try {
      await sql`
        INSERT INTO routes (id, code, name_ar, name_en, mode, color, path_geojson, distance, base_fare, is_active, direction)
        VALUES (${fwdId}, ${code}, ${nameAr}, ${nameEn}, ${mode}, ${color}, ${geojson}::jsonb, ${r.distance || null}, ${r.base_fare || '0.350'}, true, 'forward')
        ON CONFLICT DO NOTHING
      `;

      // Create return route with reversed coordinates
      const retId = makeId(code + '-ret');
      const revCoords = [...geojson.coordinates].reverse();
      const retGeojson = { type: 'LineString', coordinates: revCoords };

      await sql`
        INSERT INTO routes (id, code, name_ar, name_en, mode, color, path_geojson, distance, base_fare, is_active, direction, return_route_id)
        VALUES (${retId}, ${code}, ${nameAr + ' (عودة)'}, ${nameEn + ' (Return)'}, ${mode}, ${color}, ${retGeojson}::jsonb, ${r.distance || null}, ${r.base_fare || '0.350'}, true, 'return', ${fwdId})
        ON CONFLICT DO NOTHING
      `;

      // Link forward to return
      await sql`UPDATE routes SET return_route_id = ${retId} WHERE id = ${fwdId}`;

      imported++;
      returns++;
      if (imported % 50 === 0) console.log('  Progress:', imported, '/', routes.length);
    } catch(e) {
      skipped++;
    }
  }

  const total = await sql`SELECT COUNT(*)::int FROM routes`;
  const dirs = await sql`SELECT direction, COUNT(*)::int FROM routes GROUP BY direction`;
  console.log('Done! Total routes:', total[0].count);
  dirs.forEach(d => console.log('  ' + d.direction + ': ' + d.count));

  await sql.end();
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
