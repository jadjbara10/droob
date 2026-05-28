/**
 * دروب Droob — OpenStreetMap Jordan Stops Import
 * Queries Overpass API for bus stops, stations, and share-taxi hubs in Jordan.
 * Outputs GeoJSON + SQL seed + JSON for PostGIS import.
 *
 * Usage: npx tsx src/import-osm-stops.ts [outputDir]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const GOVERNORATES = [
  { name_ar: "عمان", name_en: "Amman", bbox: [31.7, 35.7, 32.1, 36.1] },
  { name_ar: "إربد", name_en: "Irbid", bbox: [32.4, 35.7, 32.65, 36.1] },
  { name_ar: "الزرقاء", name_en: "Zarqa", bbox: [31.9, 35.9, 32.25, 36.4] },
  { name_ar: "البلقاء", name_en: "Balqa", bbox: [31.9, 35.55, 32.25, 35.8] },
  { name_ar: "مادبا", name_en: "Madaba", bbox: [31.55, 35.55, 31.85, 35.95] },
  { name_ar: "الكرك", name_en: "Karak", bbox: [30.9, 35.45, 31.5, 35.95] },
  { name_ar: "الطفيلة", name_en: "Tafilah", bbox: [30.6, 35.3, 31.1, 35.8] },
  { name_ar: "معان", name_en: "Maan", bbox: [29.5, 35.3, 30.9, 37.0] },
  { name_ar: "العقبة", name_en: "Aqaba", bbox: [29.18, 34.96, 30.1, 35.3] },
  { name_ar: "جرش", name_en: "Jerash", bbox: [32.15, 35.75, 32.4, 35.95] },
  { name_ar: "عجلون", name_en: "Ajloun", bbox: [32.25, 35.65, 32.45, 35.85] },
  { name_ar: "المفرق", name_en: "Mafraq", bbox: [31.9, 36.0, 32.6, 38.2] },
];

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OSMElement { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; tags?: Record<string, string>; }

interface NormalizedStop {
  stop_id: string; stop_name_ar: string; stop_name_en: string;
  stop_lat: number; stop_lon: number;
  location_type: number; wheelchair_boarding: number;
  shelter: boolean; bench: boolean; lighting: boolean;
  source: string; governorate: string;
}

function findGovernorate(lat: number, lon: number): string {
  for (const gov of GOVERNORATES) {
    const [s, w, n, e] = gov.bbox;
    if (lat >= s && lat <= n && lon >= w && lon <= e) return gov.name_ar;
  }
  return "عمان";
}

function buildQuery(): string {
  return `[out:json][timeout:120];
area["ISO3166-1"="JO"]->.jo;
(
  node["highway"="bus_stop"](area.jo);
  node["public_transport"="stop_position"]["bus"="yes"](area.jo);
  node["amenity"="bus_station"](area.jo);
  way["amenity"="bus_station"](area.jo);
  node["amenity"="taxi"](area.jo);
  node["public_transport"="platform"](area.jo);
);
out body center;`;
}

async function fetchOverpass(): Promise<OSMElement[]> {
  const query = buildQuery();
  const resp = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!resp.ok) throw new Error(`Overpass error: ${resp.status}`);
  const data = (await resp.json()) as { elements: OSMElement[] };
  console.log(`   Fetched ${data.elements.length} OSM elements`);
  return data.elements;
}

function transform(elements: OSMElement[]): NormalizedStop[] {
  const stops: NormalizedStop[] = [];
  const seen = new Set<string>();
  for (const el of elements) {
    const tags = el.tags || {};
    const lat = el.lat ?? 0, lon = el.lon ?? 0;
    if (lat === 0 && lon === 0) continue;
    const id = `osm-${el.type}-${el.id}`;
    if (seen.has(id)) continue; else seen.add(id);

    const isStation = tags["amenity"] === "bus_station" || tags["public_transport"] === "station";
    stops.push({
      stop_id: id,
      stop_name_ar: tags["name:ar"] || tags["name"] || `محطة ${el.id}`,
      stop_name_en: tags["name:en"] || tags["name"] || `Stop ${el.id}`,
      stop_lat: lat, stop_lon: lon,
      location_type: isStation ? 1 : 0,
      wheelchair_boarding: tags["wheelchair"] === "yes" ? 1 : tags["wheelchair"] === "no" ? 2 : 0,
      shelter: tags["shelter"] === "yes" || tags["covered"] === "yes",
      bench: tags["bench"] === "yes",
      lighting: tags["lit"] === "yes",
      source: "OpenStreetMap",
      governorate: findGovernorate(lat, lon),
    });
  }
  return stops;
}

function exportAll(stops: NormalizedStop[], outDir: string) {
  // GeoJSON
  const geojson = {
    type: "FeatureCollection",
    features: stops.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.stop_lon, s.stop_lat] }, properties: s })),
  };
  fs.writeFileSync(path.join(outDir, "jordan_stops_osm.geojson"), JSON.stringify(geojson, null, 2));
  console.log(`✓ GeoJSON: ${stops.length} features`);

  // SQL
  const sqlVals = stops.map(s => `('${s.stop_id}','${s.stop_name_ar.replace(/'/g, "''")}','${s.stop_name_en.replace(/'/g, "''")}',ST_SetSRID(ST_MakePoint(${s.stop_lon},${s.stop_lat}),4326),${s.location_type},${s.wheelchair_boarding},${s.shelter},${s.bench},${s.lighting},'${s.source}','${s.governorate}')`);
  fs.writeFileSync(path.join(outDir, "jordan_stops_osm.sql"), `-- دروب OSM Stops Seed (${stops.length})\nINSERT INTO stops (id, name_ar, name_en, location, location_type, wheelchair_boarding, shelter, bench, lighting, source, governorate) VALUES\n${sqlVals.join(",\n")};\n`);
  console.log(`✓ SQL seed file written`);

  // JSON
  fs.writeFileSync(path.join(outDir, "jordan_stops_osm.json"), JSON.stringify(stops, null, 2));
  console.log(`✓ JSON written`);

  // Stats
  const byGov = new Map<string, number>();
  stops.forEach(s => byGov.set(s.governorate, (byGov.get(s.governorate) || 0) + 1));
  console.log("\n📊 Per Governorate:");
  [...byGov.entries()].sort((a, b) => b[1] - a[1]).forEach(([g, c]) => console.log(`   ${g}: ${c}`));
  console.log(`   Stations: ${stops.filter(s => s.location_type === 1).length} | Accessible: ${stops.filter(s => s.wheelchair_boarding === 1).length}`);
}

async function main() {
  const outDir = process.argv[2] || path.resolve(__dirname, "../../data/osm_import");
  fs.mkdirSync(outDir, { recursive: true });
  console.log("🚌 دروب — OSM Jordan Stops Import\n");
  const elements = await fetchOverpass();
  const stops = transform(elements);
  console.log(`✓ Transformed: ${stops.length} stops\n`);
  exportAll(stops, outDir);
  console.log(`\n✅ Done → ${outDir}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });