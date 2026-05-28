#!/usr/bin/env python3
"""
Unified Transit Data Pipeline
-----------------------------
Processes ArcGIS GeoJSON files (BRT + Transit Bus) from root_storage/
and produces:
  1. unified JSON stops & routes
  2. SQL seed files (PostgreSQL)
  3. TypeScript seed scripts (Drizzle ORM)

Sources:
  - ammangis.jo/BRT/          → BRT stations, landmarks, routes
  - ammancitygis.gov.jo/Transportation/ → Bus stops, routes, starting points

Transportation Types:
  - حافله (Large Bus / BRT)
  - سرفيس (Service / Shared Taxi)
  - كوستر (Coaster / Medium Bus)
"""

import json
import os
import sys
import hashlib
from datetime import datetime
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

# ── Config ──────────────────────────────────────────────────
ROOT_STORAGE = r"d:\trans_app\root_storage"
OUTPUT_DIR = r"d:\trans_app\droob\backend\src\data"
SCRIPTS_SRC_DIR = r"d:\trans_app\droob\scripts\src"

# Transportation type mapping (Arabic → English enum)
TRANS_TYPE_MAP = {
    "حافله": "bus",
    "حافلة": "bus",
    "سرفيس": "service",
    "كوستر": "coaster",
    "باص": "bus",
    "": "unknown",
    None: "unknown",
}

# Governorate detection by coordinates (rough bounding boxes)
# Will be refined with reverse geocoding in E.8
GOVERNORATE_BOUNDS = {
    "العاصمة": (35.7, 31.7, 36.2, 32.1),
    "اربد": (35.6, 32.3, 36.1, 32.7),
    "الزرقاء": (36.0, 31.8, 36.4, 32.2),
    "البلقاء": (35.5, 31.8, 35.9, 32.2),
    "الكرك": (35.5, 30.9, 36.0, 31.4),
    "الطفيلة": (35.3, 30.6, 35.8, 31.0),
    "معان": (35.5, 29.8, 36.5, 30.8),
    "العقبة": (34.9, 29.2, 35.6, 30.0),
    "المفرق": (36.0, 32.0, 37.0, 32.6),
    "جرش": (35.7, 32.2, 36.0, 32.4),
    "عجلون": (35.7, 32.3, 35.9, 32.4),
    "مأدبا": (35.6, 31.5, 36.0, 31.9),
}


def safe_get(d: dict, *keys, default=None):
    """Safely get first available key from dict."""
    for k in keys:
        v = d.get(k)
        if v is not None and v != "":
            return v
    return default


def detect_governorate(lng: float, lat: float) -> str:
    """Detect governorate from coordinates using bounding boxes."""
    for gov, (min_lng, min_lat, max_lng, max_lat) in GOVERNORATE_BOUNDS.items():
        if min_lng <= lng <= max_lng and min_lat <= lat <= max_lat:
            return gov
    return "غير معروف"


def generate_id(prefix: str, name: str, lng: float, lat: float) -> str:
    """Generate stable unique ID."""
    hash_input = f"{name}_{lng:.6f}_{lat:.6f}"
    hash_hex = hashlib.md5(hash_input.encode()).hexdigest()[:8]
    return f"{prefix}-{hash_hex}"


def generate_stop_code(index: int, trans_type: str, gov_code: str) -> str:
    """Generate stop code like STP-BUS-AM-001"""
    type_code = {"bus": "BUS", "service": "SRV", "coaster": "COS", "brt": "BRT", "unknown": "GEN"}
    gov_short = {
        "العاصمة": "AM", "اربد": "IR", "الزرقاء": "ZR", "البلقاء": "BL",
        "الكرك": "KR", "الطفيلة": "TF", "معان": "MN", "العقبة": "AQ",
        "المفرق": "MF", "جرش": "JR", "عجلون": "AJ", "مأدبا": "MD",
        "غير معروف": "XX",
    }
    tc = type_code.get(trans_type, "GEN")
    gs = gov_short.get(gov_code, "XX")
    return f"STP-{tc}-{gs}-{index:04d}"


def load_geojson(filepath: str) -> dict:
    """Load and validate a GeoJSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def extract_stops() -> Dict[str, List[dict]]:
    """
    Extract all stops from ArcGIS files, grouped by transportation type.
    Returns dict with keys: 'brt', 'bus', 'service', 'coaster'
    """
    all_stops: List[dict] = []
    seen_coords = set()  # dedup by rounded coords

    # ── BRT Stations ─────────────────────────────────────
    brt_files = [
        ("brt_stations_stops.json", "brt"),
        ("brt_landmarks_large_stops.json", "brt"),
        ("brt_landmarks_small_stops.json", "brt"),
    ]
    for filename, default_type in brt_files:
        filepath = os.path.join(ROOT_STORAGE, filename)
        if not os.path.exists(filepath):
            print(f"  ⚠️ Missing: {filename}")
            continue
        data = load_geojson(filepath)
        for ft in data.get("features", []):
            props = ft.get("properties", {})
            geom = ft.get("geometry", {})
            coords = extract_point_coords(geom)
            if not coords:
                continue
            lng, lat = coords
            # Dedup
            coord_key = (round(lng, 5), round(lat, 5))
            if coord_key in seen_coords:
                continue
            seen_coords.add(coord_key)

            name = safe_get(props, "STATION_NAME_A", "LANDMARK_NAME_A", "NAME_STARTING_POINT", default="")
            if not name:
                continue

            gov = detect_governorate(lng, lat)
            stop_id = generate_id("BRT", name, lng, lat)

            all_stops.append({
                "id": stop_id,
                "name_ar": name,
                "name_en": safe_get(props, "STATION_NAME_E", "LANDMARK_NAME_E", default=""),
                "lat": lat,
                "lng": lng,
                "transport_type": "brt",
                "governorate_ar": gov,
                "station_class": props.get("STATION_CLASS", ""),
                "stage_no": props.get("STAGE_NO", None),
                "source_file": filename,
                "source": "ammangis_brt",
            })

    # ── Transit Bus Stops ────────────────────────────────
    transit_stop_files = [
        "transit_bus_stops_large_stops.json",
        "transit_bus_stops_small_stops.json",
        "transit_bus_start_large_stops.json",
        "transit_bus_start_small_stops.json",
    ]
    for filename in transit_stop_files:
        filepath = os.path.join(ROOT_STORAGE, filename)
        if not os.path.exists(filepath):
            print(f"  ⚠️ Missing: {filename}")
            continue
        data = load_geojson(filepath)
        for ft in data.get("features", []):
            props = ft.get("properties", {})
            geom = ft.get("geometry", {})
            coords = extract_point_coords(geom)
            if not coords:
                continue
            lng, lat = coords
            coord_key = (round(lng, 5), round(lat, 5))
            if coord_key in seen_coords:
                continue
            seen_coords.add(coord_key)

            # These files only have STATION_ID, no name - we'll need to enrich from routes
            name = safe_get(props, "NAME_STARTING_POINT", "STATION_ID", default=f"محطة {props.get('STATION_ID', '')}")
            if not name or name == "محطة ":
                continue

            gov = detect_governorate(lng, lat)
            stop_id = generate_id("BUS", name, lng, lat)

            all_stops.append({
                "id": stop_id,
                "name_ar": name,
                "name_en": "",
                "lat": lat,
                "lng": lng,
                "transport_type": "bus",
                "governorate_ar": gov,
                "station_id_original": props.get("STATION_ID", ""),
                "source_file": filename,
                "source": "ammancitygis_transit",
            })

    # ── Group by transport type ──────────────────────────
    grouped: Dict[str, List[dict]] = defaultdict(list)
    for stop in all_stops:
        grouped[stop["transport_type"]].append(stop)

    # Assign codes
    for trans_type, stops in grouped.items():
        for i, stop in enumerate(stops):
            stop["code"] = generate_stop_code(i + 1, trans_type, stop["governorate_ar"])

    return dict(grouped)


def extract_point_coords(geom: dict) -> Optional[Tuple[float, float]]:
    """Extract [lng, lat] from Point or MultiPoint geometry."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])

    if gtype == "Point" and len(coords) >= 2:
        return (coords[0], coords[1])
    elif gtype == "MultiPoint" and len(coords) > 0:
        # Take first point
        pt = coords[0]
        if len(pt) >= 2:
            return (pt[0], pt[1])
    return None


def extract_line_coords(geom: dict) -> List[Tuple[float, float]]:
    """Extract all [lng, lat] from LineString or MultiLineString geometry."""
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])

    all_pts = []
    if gtype == "LineString":
        all_pts = [(c[0], c[1]) for c in coords if len(c) >= 2]
    elif gtype == "MultiLineString":
        for line in coords:
            all_pts.extend([(c[0], c[1]) for c in line if len(c) >= 2])
    return all_pts


def extract_routes() -> Dict[str, List[dict]]:
    """
    Extract all routes from ArcGIS files, grouped by transportation type.
    """
    all_routes: List[dict] = []
    seen_route_names = set()

    route_files = [
        # BRT routes
        ("brt_routes_trial_routes.json", "brt", "ammangis_brt"),
        ("brt_routes_trial_2_routes.json", "brt", "ammangis_brt"),
        # Transit bus routes (large = سرفيس, small = كوستر)
        ("transit_routes_large_routes.json", "service", "ammancitygis_transit"),
        ("transit_routes_small_routes.json", "coaster", "ammancitygis_transit"),
        ("transit_routes_temp_routes.json", "bus", "ammancitygis_transit"),
    ]

    for filename, default_type, source in route_files:
        filepath = os.path.join(ROOT_STORAGE, filename)
        if not os.path.exists(filepath):
            print(f"  ⚠️ Missing: {filename}")
            continue
        data = load_geojson(filepath)
        for ft in data.get("features", []):
            props = ft.get("properties", {})
            geom = ft.get("geometry", {})

            route_name = safe_get(props, "ROUTE_NAME", default="")
            if not route_name:
                continue

            # Dedup by route name
            name_key = route_name.strip()
            if name_key in seen_route_names:
                # Keep the one with more coordinates
                continue
            seen_route_names.add(name_key)

            # Determine transport type
            trans_type_ar = safe_get(props, "TRANSPORTATION_TYPE", default="")
            trans_type = TRANS_TYPE_MAP.get(trans_type_ar, default_type)

            # Override based on file source for more accuracy
            if source == "ammangis_brt":
                trans_type = "brt"
            elif filename == "transit_routes_large_routes.json":
                trans_type = trans_type if trans_type != "unknown" else "service"
            elif filename == "transit_routes_small_routes.json":
                trans_type = trans_type if trans_type != "unknown" else "coaster"

            # Extract path coordinates
            path = extract_line_coords(geom)
            if not path:
                continue

            # Get start/end
            start_name = safe_get(props, "START_ROUTE", default="")
            end_name = safe_get(props, "END_ROUTE", default="")

            # Payment
            payment = props.get("PAYMENT_JD", None)
            try:
                payment = float(payment) if payment else None
            except (ValueError, TypeError):
                payment = None

            # Peak frequencies
            peak_freq = props.get("التردادات_وقت_الذروة", props.get("الترددات_خارج_الذروة", None))

            # Generate ID
            mid_idx = len(path) // 2
            mid_lng, mid_lat = path[mid_idx] if path else (0, 0)
            route_id = generate_id("RTE", route_name, mid_lng, mid_lat)
            gov = detect_governorate(mid_lng, mid_lat)

            # Distance estimation (Haversine approximation along path)
            distance_km = estimate_path_distance(path)

            all_routes.append({
                "id": route_id,
                "name_ar": route_name,
                "name_en": "",
                "transport_type": trans_type,
                "governorate_ar": gov,
                "start_stop_ar": start_name,
                "end_stop_ar": end_name,
                "route_number": props.get("ROUTE_NUMBER", ""),
                "company_name": safe_get(props, "COMANY_NAME", default=""),
                "owner_type": props.get("OWNER_TYPE", ""),
                "route_direction": props.get("ROUTE_DIRECTION", ""),
                "road_status": props.get("ROAD_STATUS", ""),
                "payment_jd": payment,
                "peak_frequency": peak_freq,
                "path": [[lng, lat] for lng, lat in path],
                "distance_km": round(distance_km, 2),
                "source_file": filename,
                "source": source,
            })

    # ── Group by transport type ──────────────────────────
    grouped: Dict[str, List[dict]] = defaultdict(list)
    for route in all_routes:
        grouped[route["transport_type"]].append(route)

    # Assign route codes
    for trans_type, routes in grouped.items():
        type_code = {"brt": "BRT", "bus": "BUS", "service": "SRV", "coaster": "COS"}
        tc = type_code.get(trans_type, "GEN")
        for i, route in enumerate(routes):
            gov = route["governorate_ar"]
            gov_short = {
                "العاصمة": "AM", "اربد": "IR", "الزرقاء": "ZR", "البلقاء": "BL",
                "الكرك": "KR", "الطفيلة": "TF", "معان": "MN", "العقبة": "AQ",
                "المفرق": "MF", "جرش": "JR", "عجلون": "AJ", "مأدبا": "MD",
                "غير معروف": "XX",
            }.get(gov, "XX")
            route["code"] = f"RTE-{tc}-{gov_short}-{i + 1:04d}"

    return dict(grouped)


def estimate_path_distance(path: List[Tuple[float, float]]) -> float:
    """Estimate total path distance in km using Haversine formula."""
    import math

    def haversine(lng1, lat1, lng2, lat2):
        R = 6371  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlng / 2) ** 2)
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    total = 0.0
    for i in range(len(path) - 1):
        total += haversine(path[i][0], path[i][1], path[i+1][0], path[i+1][1])
    return total


def merge_terminals(stops_by_type: Dict[str, List[dict]]) -> Dict[str, List[dict]]:
    """
    Merge jordan-terminals.json into bus stops if not already present.
    Terminals are major bus complexes.
    """
    terminals_path = os.path.join(OUTPUT_DIR, "jordan-terminals.json")
    if not os.path.exists(terminals_path):
        print("  ⚠️ jordan-terminals.json not found, skipping merge")
        return stops_by_type

    terminals = json.load(open(terminals_path, "r", encoding="utf-8"))
    existing_coords = {
        (round(s["lng"], 4), round(s["lat"], 4))
        for stops in stops_by_type.values()
        for s in stops
    }

    bus_stops = stops_by_type.get("bus", [])
    max_code_idx = len(bus_stops)

    for tm in terminals:
        coord_key = (round(tm["lng"], 4), round(tm["lat"], 4))
        if coord_key in existing_coords:
            # Update existing stop with terminal info
            for s in bus_stops:
                if (round(s["lng"], 4), round(s["lat"], 4)) == coord_key:
                    s["is_terminal"] = True
                    s["terminal_code"] = tm.get("code", "")
                    s["name_ar"] = tm.get("name_ar", s["name_ar"])
                    s["governorate_ar"] = tm.get("governorate_ar", s["governorate_ar"])
                    break
        else:
            max_code_idx += 1
            gov = tm.get("governorate_ar", detect_governorate(tm["lng"], tm["lat"]))
            stop_id = generate_id("TRM", tm["name_ar"], tm["lng"], tm["lat"])
            bus_stops.append({
                "id": stop_id,
                "code": generate_stop_code(max_code_idx, "bus", gov),
                "name_ar": tm["name_ar"],
                "name_en": "",
                "lat": tm["lat"],
                "lng": tm["lng"],
                "transport_type": "bus",
                "governorate_ar": gov,
                "is_terminal": True,
                "terminal_code": tm.get("code", ""),
                "is_landmark": tm.get("is_landmark", True),
                "source": "jordan_terminals",
                "source_file": "jordan-terminals.json",
            })

    stops_by_type["bus"] = bus_stops
    return stops_by_type


def generate_statistics(stops: Dict, routes: Dict) -> dict:
    """Generate summary statistics."""
    stats = {
        "total_stops": sum(len(v) for v in stops.values()),
        "total_routes": sum(len(v) for v in routes.values()),
        "stops_by_type": {k: len(v) for k, v in stops.items()},
        "routes_by_type": {k: len(v) for k, v in routes.items()},
        "governorates": {},
        "generated_at": datetime.now().isoformat(),
    }

    # Governorate distribution
    gov_stops = defaultdict(int)
    gov_routes = defaultdict(int)
    for stops_list in stops.values():
        for s in stops_list:
            gov_stops[s["governorate_ar"]] += 1
    for routes_list in routes.values():
        for r in routes_list:
            gov_routes[r["governorate_ar"]] += 1

    all_govs = set(list(gov_stops.keys()) + list(gov_routes.keys()))
    for gov in sorted(all_govs):
        stats["governorates"][gov] = {
            "stops": gov_stops.get(gov, 0),
            "routes": gov_routes.get(gov, 0),
        }

    return stats


def generate_sql_seed(stops_by_type: Dict, routes_by_type: Dict, stats: dict) -> str:
    """Generate PostgreSQL SQL seed file."""
    lines = []
    lines.append("-- ============================================")
    lines.append("-- Jordan Transit Data Seed")
    lines.append(f"-- Generated: {stats['generated_at']}")
    lines.append(f"-- Total Stops: {stats['total_stops']}")
    lines.append(f"-- Total Routes: {stats['total_routes']}")
    lines.append("-- ============================================")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")

    # ── Stops table ─────────────────────────────────────
    lines.append("-- Clear existing data")
    lines.append("DELETE FROM stops WHERE source IN ('ammangis_brt', 'ammancitygis_transit', 'jordan_terminals');")
    lines.append("DELETE FROM routes WHERE source IN ('ammangis_brt', 'ammancitygis_transit');")
    lines.append("")

    lines.append("-- ── STOPS ──")
    lines.append("INSERT INTO stops (id, code, name_ar, name_en, lat, lng, transport_type, governorate_ar, is_terminal, station_class, source) VALUES")
    stop_values = []
    idx = 0
    for trans_type, stops in stops_by_type.items():
        for s in stops:
            idx += 1
            name_ar = s["name_ar"].replace("'", "''")
            name_en = s.get("name_en", "").replace("'", "''")
            gov = s["governorate_ar"].replace("'", "''")
            is_terminal = "TRUE" if s.get("is_terminal") else "FALSE"
            station_class = s.get("station_class", "").replace("'", "''")
            source = s.get("source", "")
            stop_values.append(
                f"  ('{s['id']}', '{s['code']}', '{name_ar}', '{name_en}', {s['lat']}, {s['lng']}, '{trans_type}', '{gov}', {is_terminal}, '{station_class}', '{source}')"
            )
    lines.append(",\n".join(stop_values) + ";")
    lines.append("")

    # ── Routes table ─────────────────────────────────────
    lines.append("-- ── ROUTES ──")
    lines.append("INSERT INTO routes (id, code, name_ar, name_en, transport_type, governorate_ar, start_stop_ar, end_stop_ar, route_number, company_name, payment_jd, distance_km, path, source) VALUES")
    route_values = []
    for trans_type, routes in routes_by_type.items():
        for r in routes:
            name_ar = r["name_ar"].replace("'", "''")
            name_en = r.get("name_en", "").replace("'", "''")
            gov = r["governorate_ar"].replace("'", "''")
            start = r.get("start_stop_ar", "").replace("'", "''")
            end = r.get("end_stop_ar", "").replace("'", "''")
            rt_num = (r.get("route_number") or "").replace("'", "''")
            company = (r.get("company_name") or "").replace("'", "''")
            payment = r.get("payment_jd") or "NULL"
            distance = r.get("distance_km", 0)
            source = r.get("source", "")
            # Path as PostGIS LineString
            path_coords = r.get("path", [])
            if path_coords:
                coord_strs = [f"{lng} {lat}" for lng, lat in path_coords]
                path_wkt = f"SRID=4326;LINESTRING({', '.join(coord_strs)})"
                path_sql = f"ST_GeomFromText('{path_wkt}')"
            else:
                path_sql = "NULL"

            route_values.append(
                f"  ('{r['id']}', '{r['code']}', '{name_ar}', '{name_en}', '{trans_type}', '{gov}', '{start}', '{end}', '{rt_num}', '{company}', {payment}, {distance}, {path_sql}, '{source}')"
            )
    lines.append(",\n".join(route_values) + ";")
    lines.append("")
    lines.append("COMMIT;")
    lines.append("")
    lines.append("-- ============================================")
    lines.append("-- Statistics")
    lines.append(f"-- Stops: {json.dumps(stats['stops_by_type'])}")
    lines.append(f"-- Routes: {json.dumps(stats['routes_by_type'])}")
    lines.append("-- ============================================")

    return "\n".join(lines)


def generate_typescript_seed(stops_by_type: Dict, routes_by_type: Dict, stats: dict) -> str:
    """Generate TypeScript seed script for Drizzle ORM."""
    lines = []
    lines.append("// ============================================")
    lines.append("// Jordan Transit Data Seed (Drizzle ORM)")
    lines.append(f"// Generated: {stats['generated_at']}")
    lines.append(f"// Total Stops: {stats['total_stops']}")
    lines.append(f"// Total Routes: {stats['total_routes']}")
    lines.append("// ============================================")
    lines.append("")
    lines.append("import { db } from '../db';")
    lines.append("import { stops, routes } from '../schema';")
    lines.append("import { sql } from 'drizzle-orm';")
    lines.append("")
    lines.append("export async function seedTransitData() {")
    lines.append("  console.log('🌱 Seeding transit data...');")
    lines.append("")
    lines.append("  // Clear existing data")
    lines.append("  await db.execute(sql`DELETE FROM stops WHERE source IN ('ammangis_brt', 'ammancitygis_transit', 'jordan_terminals')`);")
    lines.append("  await db.execute(sql`DELETE FROM routes WHERE source IN ('ammangis_brt', 'ammancitygis_transit')`);")
    lines.append("")
    lines.append("  // ── STOPS ──")
    lines.append("  const stopsData = [")

    for trans_type, stops_list in stops_by_type.items():
        for s in stops_list:
            name_ar = json.dumps(s["name_ar"], ensure_ascii=False)
            name_en = json.dumps(s.get("name_en", ""), ensure_ascii=False)
            gov = json.dumps(s["governorate_ar"], ensure_ascii=False)
            is_terminal = "true" if s.get("is_terminal") else "false"
            station_class = json.dumps(s.get("station_class", ""), ensure_ascii=False)
            source = json.dumps(s.get("source", ""), ensure_ascii=False)
            lines.append(f"    {{")
            lines.append(f"      id: '{s['id']}',")
            lines.append(f"      code: '{s['code']}',")
            lines.append(f"      nameAr: {name_ar},")
            lines.append(f"      nameEn: {name_en},")
            lines.append(f"      lat: {s['lat']},")
            lines.append(f"      lng: {s['lng']},")
            lines.append(f"      transportType: '{trans_type}',")
            lines.append(f"      governorateAr: {gov},")
            lines.append(f"      isTerminal: {is_terminal},")
            lines.append(f"      stationClass: {station_class},")
            lines.append(f"      source: {source},")
            lines.append(f"    }},")
    lines.append("  ];")
    lines.append("")
    lines.append("  // Batch insert stops (100 at a time)")
    lines.append("  for (let i = 0; i < stopsData.length; i += 100) {")
    lines.append("    const batch = stopsData.slice(i, i + 100);")
    lines.append("    await db.insert(stops).values(batch).onConflictDoUpdate({")
    lines.append("      target: stops.id,")
    lines.append("      set: { nameAr: sql`excluded.name_ar`, lat: sql`excluded.lat`, lng: sql`excluded.lng` }")
    lines.append("    });")
    lines.append("  }")
    lines.append("  console.log(`✅ Inserted ${stopsData.length} stops`);")
    lines.append("")
    lines.append("  // ── ROUTES ──")
    lines.append("  const routesData = [")

    for trans_type, routes_list in routes_by_type.items():
        for r in routes_list:
            name_ar = json.dumps(r["name_ar"], ensure_ascii=False)
            name_en = json.dumps(r.get("name_en", ""), ensure_ascii=False)
            gov = json.dumps(r["governorate_ar"], ensure_ascii=False)
            start = json.dumps(r.get("start_stop_ar", ""), ensure_ascii=False)
            end = json.dumps(r.get("end_stop_ar", ""), ensure_ascii=False)
            rt_num = json.dumps(r.get("route_number") or "", ensure_ascii=False)
            company = json.dumps(r.get("company_name") or "", ensure_ascii=False)
            payment = r.get("payment_jd") or "null"
            distance = r.get("distance_km", 0)
            source = json.dumps(r.get("source", ""), ensure_ascii=False)
            # Path as GeoJSON
            path_geojson = json.dumps({
                "type": "LineString",
                "coordinates": r.get("path", [])
            }, ensure_ascii=False)

            lines.append(f"    {{")
            lines.append(f"      id: '{r['id']}',")
            lines.append(f"      code: '{r['code']}',")
            lines.append(f"      nameAr: {name_ar},")
            lines.append(f"      nameEn: {name_en},")
            lines.append(f"      transportType: '{trans_type}',")
            lines.append(f"      governorateAr: {gov},")
            lines.append(f"      startStopAr: {start},")
            lines.append(f"      endStopAr: {end},")
            lines.append(f"      routeNumber: {rt_num},")
            lines.append(f"      companyName: {company},")
            lines.append(f"      paymentJd: {payment},")
            lines.append(f"      distanceKm: {distance},")
            lines.append(f"      path: {path_geojson},")
            lines.append(f"      source: {source},")
            lines.append(f"    }},")
    lines.append("  ];")
    lines.append("")
    lines.append("  for (let i = 0; i < routesData.length; i += 100) {")
    lines.append("    const batch = routesData.slice(i, i + 100);")
    lines.append("    await db.insert(routes).values(batch).onConflictDoUpdate({")
    lines.append("      target: routes.id,")
    lines.append("      set: { nameAr: sql`excluded.name_ar`, path: sql`excluded.path`, distanceKm: sql`excluded.distance_km` }")
    lines.append("    });")
    lines.append("  }")
    lines.append("  console.log(`✅ Inserted ${routesData.length} routes`);")
    lines.append("")
    lines.append("  console.log('🎉 Transit data seeding complete!');")
    lines.append("  return { stops: stopsData.length, routes: routesData.length };")
    lines.append("}")
    lines.append("")
    lines.append("// Run if executed directly")
    lines.append("if (require.main === module) {")
    lines.append("  seedTransitData()")
    lines.append("    .then((result) => {")
    lines.append("      console.log('Done:', result);")
    lines.append("      process.exit(0);")
    lines.append("    })")
    lines.append("    .catch((err) => {")
    lines.append("      console.error('Seed failed:', err);")
    lines.append("      process.exit(1);")
    lines.append("    });")
    lines.append("}")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("🗺️  Unified Transit Data Pipeline")
    print("=" * 60)
    print()

    # Phase 1: Extract Stops
    print("📌 Phase 1: Extracting Stops...")
    stops_by_type = extract_stops()
    total_stops = sum(len(v) for v in stops_by_type.values())
    print(f"   ✅ Extracted {total_stops} stops across {len(stops_by_type)} types:")
    for t, stops in sorted(stops_by_type.items()):
        print(f"      - {t}: {len(stops)} stops")
    print()

    # Phase 2: Extract Routes
    print("🛣️  Phase 2: Extracting Routes...")
    routes_by_type = extract_routes()
    total_routes = sum(len(v) for v in routes_by_type.values())
    print(f"   ✅ Extracted {total_routes} routes across {len(routes_by_type)} types:")
    for t, routes in sorted(routes_by_type.items()):
        print(f"      - {t}: {len(routes)} routes")
    print()

    # Phase 3: Merge Terminals
    print("🏢 Phase 3: Merging Terminals...")
    stops_by_type = merge_terminals(stops_by_type)
    total_stops = sum(len(v) for v in stops_by_type.values())
    print(f"   ✅ Updated: {total_stops} total stops (with terminals)")
    print()

    # Phase 4: Statistics
    print("📊 Phase 4: Generating Statistics...")
    stats = generate_statistics(stops_by_type, routes_by_type)
    print(f"   Total stops: {stats['total_stops']}")
    print(f"   Total routes: {stats['total_routes']}")
    print(f"   Governorates: {len(stats['governorates'])}")
    print()

    # Phase 5: Save unified JSON
    print("💾 Phase 5: Saving Unified JSON...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    unified = {
        "metadata": {
            "generated_at": stats["generated_at"],
            "sources": ["ammangis.jo/BRT", "ammancitygis.gov.jo/Transportation"],
            "description": "Unified Jordan transit data: BRT + Service + Coaster + Bus",
        },
        "statistics": stats,
        "stops": {k: v for k, v in stops_by_type.items()},
        "routes": {k: v for k, v in routes_by_type.items()},
    }

    unified_path = os.path.join(OUTPUT_DIR, "unified-transit-data.json")
    with open(unified_path, "w", encoding="utf-8") as f:
        json.dump(unified, f, ensure_ascii=False, indent=2)
    file_size = os.path.getsize(unified_path) / (1024 * 1024)
    print(f"   ✅ Saved: {unified_path} ({file_size:.1f} MB)")
    print()

    # Phase 6: Generate SQL seed
    print("🗄️  Phase 6: Generating SQL Seed...")
    sql = generate_sql_seed(stops_by_type, routes_by_type, stats)
    sql_path = os.path.join(OUTPUT_DIR, "seed-transit-data.sql")
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"   ✅ Saved: {sql_path}")
    print()

    # Phase 7: Generate TypeScript seed
    print("📝 Phase 7: Generating TypeScript Seed...")
    ts = generate_typescript_seed(stops_by_type, routes_by_type, stats)
    ts_path = os.path.join(OUTPUT_DIR, "seed-transit-data.ts")
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write(ts)
    print(f"   ✅ Saved: {ts_path}")
    print()

    # Final summary
    print("=" * 60)
    print("🎉 Pipeline Complete!")
    print("=" * 60)
    print(f"""
  📦 Output Files:
    1. {unified_path}
    2. {sql_path}
    3. {ts_path}

  📊 Summary:
    • {stats['total_stops']} stops
    • {stats['total_routes']} routes
    • {len(stats['governorates'])} governorates

  🚌 By Transport Type:
    • BRT: {stats['stops_by_type'].get('brt', 0)} stops, {stats['routes_by_type'].get('brt', 0)} routes
    • Bus: {stats['stops_by_type'].get('bus', 0)} stops, {stats['routes_by_type'].get('bus', 0)} routes
    • Service: {stats['stops_by_type'].get('service', 0)} stops, {stats['routes_by_type'].get('service', 0)} routes
    • Coaster: {stats['stops_by_type'].get('coaster', 0)} stops, {stats['routes_by_type'].get('coaster', 0)} routes

  📋 Next Steps:
    npm run data:validate  → تحقق من صحة البيانات
    npm run data:seed      → إدخال إلى PostgreSQL
""")


if __name__ == "__main__":
    main()