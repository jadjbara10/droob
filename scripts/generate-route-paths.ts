// ============================================================================
// دروب (Droob) — Route Path Generator
// Reads unified_routes.json + unified_stops.json → generates RoutePath data
// for the 23 seed routes. Outputs a JSON consumable by route-paths.ts.
//
// Usage: npx tsx scripts/generate-route-paths.ts
// ============================================================================

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ─────────────────────────────────────────────────────────────────

interface RoutePath {
  id: string;
  name: string;
  color: string;
  coords: Array<[number, number]>;
}

interface UnifiedStop {
  code: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  mode: string;
  raw_props?: {
    STATION_NAME_A?: string;
  };
}

interface UnifiedRoute {
  code: string;
  name_ar: string;
  name_en: string;
  mode: string;
  path_geojson?: {
    type: string;
    coordinates: Array<[number, number]>;
  };
}

// ─── Seed Data (from backend/src/db/seed.ts) ───────────────────────────────

interface SeedRoute {
  code: string;
  name_ar: string;
  name_en: string;
  mode: "city_bus" | "brt" | "serveece" | "intercity";
  color: string;
  stops: string[];
}

const MODE_COLORS: Record<string, string> = {
  city_bus: "#0066CC",
  brt: "#E60026",
  serveece: "#FF8C00",
  intercity: "#6B21A8",
  coaster: "#8B5CF6",
};

const SEED_ROUTES: SeedRoute[] = [
  { code: "1",    name_ar: "البلد ↔ صويلح",                   name_en: "Downtown ↔ Sweileh",          mode: "city_bus",  color: MODE_COLORS.city_bus,  stops: ["AM-BLD","AM-ABD","AM-DKH","AM-UOJ","AM-SWL"] },
  { code: "2",    name_ar: "الدوار السابع ↔ المطار",           name_en: "7th Circle ↔ Airport",        mode: "city_bus",  color: MODE_COLORS.city_bus,  stops: ["AM-7TH","AM-MEC","AM-AIR"] },
  { code: "5",    name_ar: "الرابية ↔ العبدلي ↔ الهاشمي",       name_en: "Rabia ↔ Abdali ↔ Hashmi",     mode: "city_bus",  color: MODE_COLORS.city_bus,  stops: ["AM-RAB","AM-ABD","AM-HSH"] },
  { code: "23",   name_ar: "الزرقاء ↔ وسط البلد",              name_en: "Zarqa ↔ Downtown Amman",      mode: "city_bus",  color: MODE_COLORS.city_bus,  stops: ["ZA-CTR","AM-RSF","AM-BLD"] },
  { code: "35",   name_ar: "وادي السير ↔ الدوار الأول",        name_en: "Wadi Seer ↔ 1st Circle",      mode: "city_bus",  color: MODE_COLORS.city_bus,  stops: ["AM-WSR","AM-7TH","AM-1ST"] },
  { code: "BRT1", name_ar: "الباص السريع 1: القدس ↔ صويلح",    name_en: "BRT Line 1: Al-Quds ↔ Sweileh",mode: "brt",     color: MODE_COLORS.brt,      stops: ["AM-QDS","AM-ABD","AM-UOJ","AM-SWL"] },
  { code: "BRT2", name_ar: "الباص السريع 2: المطار ↔ العبدلي",  name_en: "BRT Line 2: Airport ↔ Abdali",mode: "brt",      color: MODE_COLORS.brt,      stops: ["AM-AIR","AM-5TH","AM-ABD"] },
  { code: "SV1",  name_ar: "سرفيس: العبدلي ↔ الزرقاء",          name_en: "Serveece: Abdali ↔ Zarqa",    mode: "serveece", color: MODE_COLORS.serveece, stops: ["AM-ABD","ZA-CTR"] },
  { code: "SV2",  name_ar: "سرفيس: وسط البلد ↔ الرصيفة",        name_en: "Serveece: Downtown ↔ Rusaifa",mode: "serveece", color: MODE_COLORS.serveece, stops: ["AM-BLD","AM-RSF"] },
  { code: "SV3",  name_ar: "سرفيس: الدوار السابع ↔ وادي السير", name_en: "Serveece: 7th Circle ↔ Wadi Seer",mode: "serveece",color: MODE_COLORS.serveece, stops: ["AM-7TH","AM-WSR"] },
  { code: "SV4",  name_ar: "سرفيس: العبدلي ↔ الجامعة",          name_en: "Serveece: Abdali ↔ UJ",        mode: "serveece", color: MODE_COLORS.serveece, stops: ["AM-ABD","AM-SWL","AM-UOJ"] },
  { code: "SV5",  name_ar: "سرفيس: الوحدات ↔ ماركا",            name_en: "Serveece: Wehdat ↔ Marka",     mode: "serveece", color: MODE_COLORS.serveece, stops: ["AM-WHD","AM-MRK","AM-AIR"] },
  { code: "SV6",  name_ar: "سرفيس: وسط البلد ↔ سحاب",           name_en: "Serveece: Downtown ↔ Sahab",   mode: "serveece", color: MODE_COLORS.serveece, stops: ["AM-BLD","AM-SHB"] },
  { code: "SV7",  name_ar: "سرفيس: المحطة ↔ الهاشمي الشمالي",    name_en: "Serveece: Mahatta ↔ Hashmi Shamali",mode: "serveece",color: MODE_COLORS.serveece, stops: ["AM-MHT","AM-BSM","AM-HSN"] },
  { code: "IC1",  name_ar: "عمان ↔ إربد",                       name_en: "Amman ↔ Irbid",                mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","IR-CTR"] },
  { code: "IC2",  name_ar: "عمان ↔ العقبة",                     name_en: "Amman ↔ Aqaba",                mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","AQ-CTR"] },
  { code: "IC3",  name_ar: "عمان ↔ الزرقاء",                   name_en: "Amman ↔ Zarqa",                mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","ZA-CTR"] },
  { code: "IC4",  name_ar: "عمان ↔ المفرق",                    name_en: "Amman ↔ Mafraq",               mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","MF-CTR"] },
  { code: "IC5",  name_ar: "عمان ↔ الكرك",                     name_en: "Amman ↔ Karak",                mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","KA-CTR"] },
  { code: "IC6",  name_ar: "عمان ↔ السلط",                     name_en: "Amman ↔ Salt",                 mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","BA-SLT"] },
  { code: "IC7",  name_ar: "عمان ↔ عجلون",                     name_en: "Amman ↔ Ajloun",               mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","AJ-CTR"] },
  { code: "IC8",  name_ar: "عمان ↔ جرش",                       name_en: "Amman ↔ Jerash",               mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","JE-CTR"] },
  { code: "IC9",  name_ar: "عمان ↔ مادبا",                     name_en: "Amman ↔ Madaba",               mode: "intercity",color: MODE_COLORS.intercity,stops: ["AM-ABD","MD-CTR"] },
];

// ─── Landmark Stops (from seed.ts) ─────────────────────────────────────────

const LANDMARK_STOPS: Record<string, { lat: number; lng: number; name_ar: string }> = {
  "AM-BLD": { lat: 31.9515, lng: 35.9330, name_ar: "وسط البلد" },
  "AM-ABD": { lat: 31.9640, lng: 35.9120, name_ar: "العبدلي" },
  "AM-DKH": { lat: 31.9750, lng: 35.8930, name_ar: "دوار الداخلية" },
  "AM-UOJ": { lat: 32.0140, lng: 35.8730, name_ar: "الجامعة الأردنية" },
  "AM-SWL": { lat: 32.0330, lng: 35.8500, name_ar: "الصويلح" },
  "AM-7TH": { lat: 31.9450, lng: 35.8880, name_ar: "الدوار السابع" },
  "AM-MEC": { lat: 31.9400, lng: 35.8780, name_ar: "شارع مكة" },
  "AM-AIR": { lat: 31.7220, lng: 35.9930, name_ar: "مطار الملكة علياء" },
  "AM-RAB": { lat: 31.9830, lng: 35.8950, name_ar: "الرابية" },
  "AM-HSH": { lat: 31.9650, lng: 35.9550, name_ar: "الهاشمي" },
  "ZA-CTR": { lat: 32.0836, lng: 36.1000, name_ar: "وسط الزرقاء" },
  "AM-RSF": { lat: 32.0170, lng: 36.0500, name_ar: "الرصيفة" },
  "AM-WSR": { lat: 31.9500, lng: 35.8180, name_ar: "وادي السير" },
  "AM-1ST": { lat: 31.9560, lng: 35.9100, name_ar: "الدوار الأول" },
  "AM-QDS": { lat: 31.9750, lng: 35.9000, name_ar: "شارع القدس" },
  "AM-5TH": { lat: 31.9500, lng: 35.8950, name_ar: "الدوار الخامس" },
  "AM-WHD": { lat: 31.9350, lng: 35.9220, name_ar: "الوحدات" },
  "AM-MRK": { lat: 31.9740, lng: 35.9850, name_ar: "ماركا" },
  "AM-SHB": { lat: 31.8670, lng: 36.0000, name_ar: "سحاب" },
  "AM-MHT": { lat: 31.9400, lng: 35.9400, name_ar: "المحطة" },
  "AM-BSM": { lat: 31.9550, lng: 35.9250, name_ar: "بسمان" },
  "AM-HSN": { lat: 31.9730, lng: 35.9560, name_ar: "الهاشمي الشمالي" },
  "IR-CTR": { lat: 32.5556, lng: 35.8500, name_ar: "وسط إربد" },
  "AQ-CTR": { lat: 29.5319, lng: 35.0056, name_ar: "وسط العقبة" },
  "MD-CTR": { lat: 31.7167, lng: 35.8000, name_ar: "وسط مادبا" },
  "KA-CTR": { lat: 31.1833, lng: 35.7000, name_ar: "وسط الكرك" },
  "JE-CTR": { lat: 32.2806, lng: 35.8953, name_ar: "آثار جرش" },
  "AJ-CTR": { lat: 32.3333, lng: 35.7500, name_ar: "قلعة عجلون" },
  "MF-CTR": { lat: 32.3500, lng: 36.2000, name_ar: "وسط المفرق" },
  "BA-SLT": { lat: 32.0371, lng: 35.7333, name_ar: "السلط" },
  "AM-4TH": { lat: 31.9560, lng: 35.9050, name_ar: "الدوار الرابع" },
  "AM-GRD": { lat: 31.9900, lng: 35.8850, name_ar: "مجمع الجاردنز" },
  "AM-MHK": { lat: 31.9600, lng: 35.9220, name_ar: "دوار المحكمة" },
};

// ─── Interpolation ──────────────────────────────────────────────────────────

function interpolateStops(
  stops: string[],
  stopData: Record<string, { lat: number; lng: number }>,
  stepsBetween: number = 4
): Array<[number, number]> {
  const result: Array<[number, number]> = [];

  for (let i = 0; i < stops.length; i++) {
    const current = stopData[stops[i]];
    if (!current) continue;

    if (i === 0) {
      result.push([current.lat, current.lng]);
      continue;
    }

    const prev = stopData[stops[i - 1]];
    if (!prev) {
      result.push([current.lat, current.lng]);
      continue;
    }

    // Interpolate intermediate coords between previous stop and this one
    for (let s = 1; s <= stepsBetween; s++) {
      const t = s / stepsBetween;
      const lat = prev.lat + (current.lat - prev.lat) * t;
      const lng = prev.lng + (current.lng - prev.lng) * t;
      result.push([lat, lng]);
    }
  }

  return result;
}

// ─── Load unified data for better paths ────────────────────────────────────

function loadUnifiedRoutes(filePath: string): Map<string, UnifiedRoute> {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const map = new Map<string, UnifiedRoute>();
  for (const r of (raw as { routes: UnifiedRoute[] }).routes) {
    map.set(r.code, r);
  }
  return map;
}

function loadUnifiedStops(filePath: string): Map<string, UnifiedStop> {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const map = new Map<string, UnifiedStop>();
  for (const s of (raw as { stops: UnifiedStop[] }).stops) {
    map.set(s.code, s);
  }
  return map;
}

// ─── Try to find matching unified route by stop similarity ─────────────────

function findMatchingUnifiedRoute(
  seedCode: string,
  unifiedRoutes: Map<string, UnifiedRoute>,
  unifiedStops: Map<string, UnifiedStop>
): UnifiedRoute | undefined {
  // Direct code match (e.g., BRT-0001 → "1"? No, seed "BRT1" → maybe BRT-0001)
  // Try numeric match: seed "1" → unified "BUS-0001"? No, we need smarter matching.

  // For BRT routes, match by number
  if (seedCode === "BRT1") return unifiedRoutes.get("BRT-0001");
  if (seedCode === "BRT2") return unifiedRoutes.get("BRT-0002");

  // For city bus and serveece, try to find by name similarity
  // Simplified: we use the interpolated stop path which is already good enough.
  return undefined;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const scriptDir = path.resolve(__dirname);
  const backendDataDir = path.resolve(scriptDir, "..", "backend", "src", "data");
  const outputPath = path.resolve(scriptDir, "..", "mobile", "src", "config", "generated-route-paths.json");

  const unifiedRoutesPath = path.join(backendDataDir, "unified_routes.json");
  const unifiedStopsPath = path.join(backendDataDir, "unified_stops.json");

  let unifiedRoutes: Map<string, UnifiedRoute> = new Map();
  let unifiedStops: Map<string, UnifiedStop> = new Map();

  try {
    unifiedRoutes = loadUnifiedRoutes(unifiedRoutesPath);
    unifiedStops = loadUnifiedStops(unifiedStopsPath);
    console.log(`Loaded ${unifiedRoutes.size} unified routes and ${unifiedStops.size} unified stops`);
  } catch (err) {
    console.warn("Warning: Could not load unified data. Using landmark stops only.");
  }

  // Build a combined stop lookup: landmark stops first, then unified stops
  const allStops: Record<string, { lat: number; lng: number; name_ar: string }> = { ...LANDMARK_STOPS };

  // Also check unified stops for any landmark missing
  for (const [code, stop] of unifiedStops) {
    // Use raw_props.STATION_NAME_A as name if available, otherwise name_ar
    const name = stop.raw_props?.STATION_NAME_A || stop.name_ar;
    // Only add if not already present (landmark takes priority)
    if (!allStops[code]) {
      allStops[code] = { lat: stop.lat, lng: stop.lng, name_ar: name };
    }
  }

  // If we have unified routes with real GeoJSON, use them for more accurate paths
  // Otherwise generate paths by interpolating stop sequences
  const generatedPaths: RoutePath[] = [];

  for (const route of SEED_ROUTES) {
    // Try to find a matching unified route that has GeoJSON path data
    const matchedUnified = findMatchingUnifiedRoute(route.code, unifiedRoutes, unifiedStops);

    if (matchedUnified?.path_geojson?.coordinates && matchedUnified.path_geojson.coordinates.length > 5) {
      // Use the real GeoJSON path (convert [lng, lat] → [lat, lng])
      const coords: Array<[number, number]> = matchedUnified.path_geojson.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      generatedPaths.push({
        id: route.code,
        name: route.name_ar,
        color: route.color,
        coords,
      });
      console.log(`  ${route.code}: Used GeoJSON path (${coords.length} points)`);
    } else {
      // Generate path from stop sequence
      const coords = interpolateStops(route.stops, allStops, 5);
      if (coords.length < 2) {
        console.warn(`  ${route.code}: Skipped — fewer than 2 valid stops`);
        continue;
      }
      generatedPaths.push({
        id: route.code,
        name: route.name_ar,
        color: route.color,
        coords,
      });
      console.log(`  ${route.code}: Generated path (${coords.length} points, ${route.stops.length} stops)`);
    }
  }

  // Also generate paths for all unified_routes that have GeoJSON (bonus)
  console.log(`\nGenerating extended paths for routes with GeoJSON data...`);
  for (const [code, unifiedRoute] of unifiedRoutes) {
    if (unifiedRoute.path_geojson?.coordinates && unifiedRoute.path_geojson.coordinates.length > 5) {
      const coords: Array<[number, number]> = unifiedRoute.path_geojson.coordinates.map(
        (c: [number, number]) => [c[1], c[0]]
      );
      // Determine color by mode
      const color = MODE_COLORS[unifiedRoute.mode] || MODE_COLORS.city_bus;
      generatedPaths.push({
        id: code,
        name: unifiedRoute.name_ar,
        color,
        coords,
      });
    }
  }

  // Deduplicate by id (seed route takes priority)
  const seen = new Set<string>();
  const deduped: RoutePath[] = [];
  for (const p of generatedPaths) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      deduped.push(p);
    }
  }

  // Write output
  const output = {
    generated_at: new Date().toISOString(),
    total: deduped.length,
    seed_routes: SEED_ROUTES.length,
    paths: deduped,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\nDone! Generated ${deduped.length} route paths.`);
  console.log(`Output: ${outputPath}`);
}

main();
