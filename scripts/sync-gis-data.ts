/**
 * دروب — GIS Data Sync Script
 * Downloads ALL 405 transit routes + 454 bus stops from Amman GIS portal
 * and generates TypeScript data files for the mobile app.
 *
 * Usage: npx tsx scripts/sync-gis-data.ts
 *
 * Source: ammancitygis.gov.jo ArcGIS FeatureServer (via proxy)
 * Proxy: https://www.ammancitygis.gov.jo/DotNet/proxy.ashx?{url}
 */

const PROXY = "https://www.ammancitygis.gov.jo/DotNet/proxy.ashx?";
const BASE = "https://www.ammancitygis.gov.jo/arcgis/rest/services/Transportation_Service/FeatureServer";

interface GisRoute {
  name: string;
  company: string;
  type: string;
  payment: number;
  number: string;
  start: string;
  end: string;
  coords: Array<[number, number]>;
}

interface GisStop {
  id: string;
  lat: number;
  lng: number;
}

async function fetchJson(url: string): Promise<any> {
  const fullUrl = PROXY + encodeURIComponent(url);
  const resp = await fetch(fullUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function getAllRoutes(): Promise<{ routes: GisRoute[]; meta: any }> {
  console.log("📡 Downloading all 405 transit routes...");
  const allRoutes: GisRoute[] = [];

  for (let offset = 0; offset < 405; offset += 100) {
    const url = `${BASE}/5/query?f=json&where=1=1&returnGeometry=true&outFields=ROUTE_NAME,COMANY_NAME,TRANSPORTATION_TYPE,PAYMENT_JD,ROUTE_NUMBER,START_ROUTE,END_ROUTE&outSR=4326&resultOffset=${offset}&resultRecordCount=100`;
    const data = await fetchJson(url);

    for (const f of data.features || []) {
      const simplified: Array<[number, number]> = [];
      for (const path of f.geometry?.paths || []) {
        const step = Math.max(1, Math.floor(path.length / 25));
        for (let i = 0; i < path.length; i += step) {
          simplified.push([+path[i][1].toFixed(5), +path[i][0].toFixed(5)]);
        }
      }
      allRoutes.push({
        name: f.attributes.ROUTE_NAME,
        company: f.attributes.COMANY_NAME,
        type: f.attributes.TRANSPORTATION_TYPE,
        payment: parseInt(f.attributes.PAYMENT_JD) || 0,
        number: f.attributes.ROUTE_NUMBER,
        start: f.attributes.START_ROUTE,
        end: f.attributes.END_ROUTE,
        coords: simplified,
      });
    }
    console.log(`  ... ${allRoutes.length}/405 routes downloaded`);
  }

  const companies: Record<string, number> = {};
  const types: Record<string, number> = {};
  allRoutes.forEach(r => { companies[r.company] = (companies[r.company] || 0) + 1; types[r.type] = (types[r.type] || 0) + 1; });

  return { routes: allRoutes, meta: { total: allRoutes.length, companies, types } };
}

async function getAllStops(): Promise<GisStop[]> {
  console.log("📡 Downloading all bus stops...");
  const allStops: GisStop[] = [];

  for (let offset = 0; offset < 454; offset += 100) {
    const url = `${BASE}/4/query?f=json&where=1=1&returnGeometry=true&outFields=*&outSR=4326&resultOffset=${offset}&resultRecordCount=100`;
    const data = await fetchJson(url);

    for (const f of data.features || []) {
      if (f.geometry) {
        allStops.push({
          id: f.attributes.STATION_ID,
          lat: +f.geometry.y.toFixed(5),
          lng: +f.geometry.x.toFixed(5),
        });
      }
    }
  }
  console.log(`  ${allStops.length} bus stops downloaded`);
  return allStops;
}

function generateRoutePathsTs(routes: GisRoute[]): string {
  const top = routes.filter(r => r.coords.length >= 5); // only routes with meaningful geometry

  let ts = `// === دروب Route Paths — Auto-generated from ammancitygis.gov.jo ===
// ${top.length} routes with GPS coordinates [lat, lng]
// Generated: ${new Date().toISOString()}
// Total routes in GIS: ${routes.length}

export interface RoutePath { id: string; name: string; company: string; type: string; payment: number; coords: Array<[number, number]>; }

export const ALL_ROUTE_PATHS: RoutePath[] = [\n`;

  top.forEach((r, i) => {
    const coordsStr = JSON.stringify(r.coords);
    ts += `  { id: "r${i}", name: ${JSON.stringify(r.name)}, company: ${JSON.stringify(r.company)}, type: ${JSON.stringify(r.type)}, payment: ${r.payment}, coords: ${coordsStr} },\n`;
  });

  ts += '];\n\nexport default ALL_ROUTE_PATHS;\n';
  return ts;
}

function generateBusStopsTs(stops: GisStop[]): string {
  let ts = `// === دروب Bus Stops — ${stops.length} stops from ammancitygis.gov.jo ===
export const BUS_STOPS: Array<[string, number, number]> = [\n`;
  stops.forEach((s, i) => {
    ts += `  ["${s.id}", ${s.lat}, ${s.lng}]${i < stops.length - 1 ? ',' : ''}\n`;
  });
  ts += '];\n\nexport default BUS_STOPS;\n';
  return ts;
}

async function main() {
  console.log("🔄 Droob GIS Data Sync");
  console.log("═══════════════════════\n");

  const { routes, meta } = await getAllRoutes();
  console.log(`\n✅ ${meta.total} routes downloaded`);
  console.log(`   Companies: ${JSON.stringify(meta.companies)}`);
  console.log(`   Types: ${JSON.stringify(meta.types)}\n`);

  const stops = await getAllStops();
  console.log(`\n✅ ${stops.length} bus stops downloaded\n`);

  // Generate files
  const fs = require("fs");
  const path = require("path");
  const mobileDir = path.join(__dirname, "..", "mobile", "src", "config");

  const pathsFile = path.join(mobileDir, "route-paths-generated.ts");
  fs.writeFileSync(pathsFile, generateRoutePathsTs(routes), "utf-8");
  console.log(`📁 Written: ${pathsFile} (${(fs.statSync(pathsFile).size / 1024).toFixed(0)} KB)`);

  const stopsFile = path.join(mobileDir, "bus-stops.ts");
  fs.writeFileSync(stopsFile, generateBusStopsTs(stops), "utf-8");
  console.log(`📁 Written: ${stopsFile} (${(fs.statSync(stopsFile).size / 1024).toFixed(0)} KB)`);

  console.log("\n🎉 Done! Data files ready for the Droob app.");
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
