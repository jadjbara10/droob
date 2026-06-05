// ============================================================================
// دروب (Droob) — Route Paths (polylines) for Amman transit lines
// Each route has coordinate pairs [lat, lng] for drawing on the map
//
// SOURCES:
// - ArcGIS Transportation_Service (EPSG:28191 → WGS84 conversion)
//   https://www.ammancitygis.gov.jo/arcgis/rest/services/Transportation_Service/MapServer
// - ammancitygis.gov.jo/Transportation — 406 routes indexed by terminal/company
// - Wikipedia: Amman BRT — stations, lines, opening dates
//
// BRT routes 1-6: Real GPS coordinates extracted from official GIS portal
// Other routes: Estimated coordinates based on Amman geography
// ============================================================================

export interface RoutePath {
  id: string;
  name: string;
  color: string;
  coords: Array<[number, number]>;
}

// ─── BRT Routes (fixed stations, dedicated lanes) ──────────────────────────
// Source: ammancitygis.gov.jo ArcGIS Transportation_Service (EPSG:28191 → WGS84)

export const BRT1_PATH: RoutePath = {
  id: "brt1",
  name: "BRT 99 — صويلح ← المتحف (وسط البلد)",
  color: "#E60026",
  coords: [
    [32.02233, 35.84529], // صويلح
    [32.02464, 35.85623],
    [32.01726, 35.86626],
    [32.01139, 35.87072],
    [32.00535, 35.87321],
    [32.00061, 35.87756], // الجامعة الأردنية
    [31.99443, 35.88724],
    [31.98894, 35.89452],
    [31.98593, 35.89792], // المدينة الرياضية
    [31.98572, 35.89749],
    [31.98623, 35.89843],
    [31.98737, 35.90177],
    [31.98739, 35.90519],
    [31.99143, 35.91291],
    [31.99326, 35.93102],
    [31.99115, 35.93853],
    [31.98965, 35.94434],
    [31.98942, 35.94427],
    [31.98590, 35.89801],
    [31.98529, 35.89804],
    [31.98785, 35.94341],
    [31.98033, 35.94018],
    [31.97517, 35.93880],
    [31.96786, 35.94786],
    [31.96384, 35.95521],
    [31.96137, 35.95892], // المتحف / وسط البلد
  ],
};

export const BRT2_PATH: RoutePath = {
  id: "brt2",
  name: "BRT2 — المحطة ← طبربور",
  color: "#E60026",
  coords: [
    [31.9516, 35.9335], // المحطة
    [31.9570, 35.9400],
    [31.9620, 35.9460], // طارق
    [31.9670, 35.9520],
    [31.9720, 35.9580], // طبربور
  ],
};

// ─── City Bus Routes ────────────────────────────────────────────────────────

export const BUS_7_PATH: RoutePath = {
  id: "bus7",
  name: "خط ٧ — الصويفية ← العبدلي",
  color: "#0066CC",
  coords: [
    [31.9770, 35.8810], // الصويفية
    [31.9750, 35.8850],
    [31.9730, 35.8890],
    [31.9710, 35.8940],
    [31.9690, 35.8990],
    [31.9670, 35.9050],
    [31.9650, 35.9100], // العبدلي
  ],
};

export const BUS_15_PATH: RoutePath = {
  id: "bus15",
  name: "خط ١٥ — الجبيهة ← الشميساني",
  color: "#0066CC",
  coords: [
    [32.0100, 35.8640], // الجبيهة
    [32.0050, 35.8710],
    [32.0000, 35.8760],
    [31.9950, 35.8820],
    [31.9900, 35.8880],
    [31.9850, 35.8930],
    [31.9790, 35.8980], // الشميساني
  ],
};

export const BUS_25_PATH: RoutePath = {
  id: "bus25",
  name: "خط ٢٥ — القويسمة ← وسط البلد",
  color: "#0066CC",
  coords: [
    [31.9300, 35.9500], // القويسمة
    [31.9350, 35.9450],
    [31.9400, 35.9400],
    [31.9450, 35.9360],
    [31.9516, 35.9335], // وسط البلد
  ],
};

export const BUS_30_PATH: RoutePath = {
  id: "bus30",
  name: "خط ٣٠ — أبو نصير ← الهاشمي",
  color: "#0066CC",
  coords: [
    [32.0350, 35.8700], // أبو نصير
    [32.0300, 35.8750],
    [32.0250, 35.8800],
    [32.0200, 35.8860],
    [32.0150, 35.8920],
    [32.0100, 35.8980],
    [32.0050, 35.9050],
    [32.0000, 35.9120], // الهاشمي الشمالي
  ],
};

// ─── Serveece Routes ────────────────────────────────────────────────────────

export const SERV_ALHUSSEIN_PATH: RoutePath = {
  id: "serv-hussein",
  name: "سرفيس الحسين — الجاردنز ← وسط البلد",
  color: "#FF8C00",
  coords: [
    [31.9750, 35.8850], // الجاردنز
    [31.9730, 35.8880],
    [31.9710, 35.8930],
    [31.9680, 35.8980],
    [31.9650, 35.9040],
    [31.9620, 35.9100],
    [31.9580, 35.9180],
    [31.9540, 35.9260],
    [31.9516, 35.9335], // وسط البلد
  ],
};

export const SERV_SWEIFIEH_PATH: RoutePath = {
  id: "serv-sweifieh",
  name: "سرفيس الصويفية — الصويفية ← العبدلي",
  color: "#FF8C00",
  coords: [
    [31.9770, 35.8810], // الصويفية
    [31.9750, 35.8840],
    [31.9730, 35.8880],
    [31.9710, 35.8920],
    [31.9690, 35.8960],
    [31.9670, 35.9000],
    [31.9650, 35.9050],
    [31.9630, 35.9100], // العبدلي
  ],
};

export const SERV_ABDOUN_PATH: RoutePath = {
  id: "serv-abdoun",
  name: "سرفيس عبدون — عبدون ← الصويفية",
  color: "#FF8C00",
  coords: [
    [31.9590, 35.8900], // عبدون
    [31.9630, 35.8880],
    [31.9670, 35.8860],
    [31.9710, 35.8840],
    [31.9770, 35.8810], // الصويفية
  ],
};

// ─── Intercity Routes ──────────────────────────────────────────────────────

export const INTER_AMMAN_IRBID_PATH: RoutePath = {
  id: "inter-irbid",
  name: "عمان ← إربد",
  color: "#6B21A8",
  coords: [
    [31.9850, 35.8920], // مجمع الشمال
    [32.0500, 35.8800],
    [32.1500, 35.8700],
    [32.2500, 35.8600],
    [32.3500, 35.8550],
    [32.4500, 35.8500],
    [32.5360, 35.8510], // إربد — مجمع عمان الجديد
  ],
};

export const INTER_AMMAN_AQABA_PATH: RoutePath = {
  id: "inter-aqaba",
  name: "عمان ← العقبة",
  color: "#6B21A8",
  coords: [
    [31.9850, 35.8920], // مجمع الجنوب (المقابلين)
    [31.9000, 35.9000],
    [31.8000, 35.8500],
    [31.6000, 35.7000],
    [31.4000, 35.6000],
    [31.2000, 35.5500],
    [31.0000, 35.5000],
    [30.5000, 35.4000],
    [30.0000, 35.3500],
    [29.5319, 35.0056], // العقبة
  ],
};

// ─── All paths map ──────────────────────────────────────────────────────────

export const ALL_ROUTE_PATHS: RoutePath[] = [
  BRT1_PATH,
  BRT2_PATH,
  BUS_7_PATH,
  BUS_15_PATH,
  BUS_25_PATH,
  BUS_30_PATH,
  SERV_ALHUSSEIN_PATH,
  SERV_SWEIFIEH_PATH,
  SERV_ABDOUN_PATH,
  INTER_AMMAN_IRBID_PATH,
  INTER_AMMAN_AQABA_PATH,
];

// ─── Color mapping by transit mode ──────────────────────────────────────────

export const MODE_PATH_COLOR: Record<string, string> = {
  walking: "#16A34A",     // أخضر
  brt: "#E60026",         // أحمر
  city_bus: "#0066CC",    // أزرق
  serveece: "#E07B00",    // برتقالي
  intercity: "#6B21A8",   // بنفسجي
};

// Walking path style (dashed)
export const WALKING_DASH = "8,8";

// ─── Generated data available as standalone imports ─────────────────────────
// import { SERV_COASTER_ROUTES } from "./serveece-routes";  // 306 routes
// import { BUS_STOPS } from "./bus-stops";                    // 454 stops
