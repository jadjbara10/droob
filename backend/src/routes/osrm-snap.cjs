/**
 * OSRM Route Snapping Script
 * Fixes route paths by snapping coordinates to real roads via OSRM.
 * Run: node backend/src/routes/osrm-snap.cjs
 */
const postgres = require('postgres');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:DyHNJjVhvGySkXgVdgXpaivfxLCOdpru@acela.proxy.rlwy.net:32787/railway';
const OSRM_BASE = 'https://droob-osrm.fly.dev';

/**
 * Snap a set of coordinates to real roads using OSRM /route
 * Uses waypoints sampling to stay within OSRM limits (max ~100 waypoints)
 */
async function snapToRoads(coords, maxWaypoints = 80) {
  // Sample coordinates to stay within OSRM limits
  const sample = [];
  const step = Math.max(1, Math.floor(coords.length / maxWaypoints));
  for (let i = 0; i < coords.length; i += step) {
    sample.push(coords[i]);
  }
  // Always include last point
  if (sample[sample.length - 1] !== coords[coords.length - 1]) {
    sample.push(coords[coords.length - 1]);
  }

  // Build OSRM request: lng,lat;lng,lat;...
  const coordStr = sample.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coordStr}?geometries=geojson&overview=full&steps=false`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates,
        distance: Math.round(route.distance),
        duration: Math.round(route.duration)
      };
    }
  } catch (e) {
    console.error('OSRM request failed:', e.message);
  }
  return null;
}

async function main() {
  const sql = postgres(DATABASE_URL, { max: 5 });

  try {
    // Find routes to fix: < 50 points or no distance
    const toFix = await sql`
      SELECT id, code, name_ar, mode, direction,
        path_geojson,
        jsonb_array_length(path_geojson->'coordinates') as pts,
        distance
      FROM routes
      WHERE path_geojson IS NOT NULL
        AND (jsonb_array_length(path_geojson->'coordinates') < 50 OR distance IS NULL OR distance = 0)
      ORDER BY jsonb_array_length(path_geojson->'coordinates') ASC
      LIMIT 20
    `;

    console.log(`Found ${toFix.length} routes to fix via OSRM`);

    let fixed = 0, failed = 0;
    for (const r of toFix) {
      try {
        const geojson = typeof r.path_geojson === 'string' ? JSON.parse(r.path_geojson) : r.path_geojson;
        const coords = geojson?.coordinates || [];

        if (coords.length < 2) {
          console.log(`  SKIP ${r.code}: < 2 coordinates`);
          failed++;
          continue;
        }

        // Convert [lng,lat] to [[lng,lat],...] format for OSRM
        const snapped = await snapToRoads(coords, 80);

        if (snapped) {
          const newGeojson = JSON.stringify({ type: 'LineString', coordinates: snapped.coordinates });
          await sql`
            UPDATE routes
            SET path_geojson = ${newGeojson}::jsonb,
                distance = ${snapped.distance}
            WHERE id = ${r.id}
          `;
          console.log(`  ✅ ${r.code}: ${r.pts}→${snapped.coordinates.length} pts, dist=${snapped.distance}m`);
          fixed++;
        } else {
          console.log(`  ❌ ${r.code}: OSRM no match (${r.pts} pts)`);
          failed++;
        }

        // Rate limit: 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.error(`  ERROR ${r.code}:`, e.message);
        failed++;
      }
    }

    console.log(`\nDone: ${fixed} fixed, ${failed} failed`);

    // Also recalculate distances for routes with null distance
    const noDist = await sql`
      UPDATE routes SET distance =
        ST_Length(ST_GeomFromGeoJSON(path_geojson::text)::geography)
      WHERE distance IS NULL AND path_geojson IS NOT NULL
    `;
    console.log(`Recalculated distance for ${noDist.count} routes`);

    await sql.end();
  } catch (e) {
    console.error(e);
    await sql.end();
    process.exit(1);
  }
}

main();
