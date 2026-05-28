"""
E.2 + E.3: Unified Transit Data Pipeline
Reads all ArcGIS GeoJSON files from root_storage/ and produces:
  1. unified_stops.json    - all stops/stations/terminals
  2. unified_routes.json   - all routes with path geometry
  3. unified_seed.sql      - PostgreSQL seed SQL (Drizzle-compatible)

Classification:
  - From ammancitygis TRANSPORTATION_TYPE: سرفيس → serveece, كوستر → coaster, حافلة → city_bus
  - From ammangis BRT layers: → brt
  - From Excel terminals: → intercity
"""
import json, os, sys, re, uuid
from datetime import datetime, timezone

ROOT = r'd:\trans_app'
ROOT_STORAGE = os.path.join(ROOT, 'root_storage')
SCRIPTS_DATA = os.path.join(ROOT, 'droob', 'scripts', 'data')
OUTPUT_DIR = os.path.join(ROOT, 'droob', 'backend', 'src', 'data')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(SCRIPTS_DATA, exist_ok=True)

# ─── Mapping: Arabic transport type → English mode code ───
MODE_MAP = {
    'سرفيس': 'serveece',
    'كوستر': 'coaster',
    'حافلة': 'city_bus',
    'باص سريع': 'brt',
    'باص سريع التردد': 'brt',
    'brt': 'brt',
    'serveece': 'serveece',
    'coaster': 'coaster',
    'city_bus': 'city_bus',
    'intercity': 'intercity',
}

# ─── Governorate name cleaning ───
def clean_gov(name):
    """Normalize governorate name for DB"""
    if not name:
        return 'غير معروف'
    name = str(name).strip()
    gov_map = {
        'العاصمه': 'العاصمة', 'عمان': 'العاصمة', 'amman': 'العاصمة', 'العاصمة': 'العاصمة',
        'اربد': 'اربد', 'irbid': 'اربد', 'إربد': 'اربد',
        'الزرقاء': 'الزرقاء', 'zarqa': 'الزرقاء', 'الزرقا': 'الزرقاء',
        'البلقاء': 'البلقاء', 'balqa': 'البلقاء', 'البلقا': 'البلقاء',
        'المفرق': 'المفرق', 'mafraq': 'المفرق',
        'جرش': 'جرش', 'jarash': 'جرش',
        'عجلون': 'عجلون', 'ajloun': 'عجلون',
        'مادبا': 'مادبا', 'madaba': 'مادبا', 'مأدبا': 'مادبا',
        'الكرك': 'الكرك', 'karak': 'الكرك',
        'الطفيلة': 'الطفيلة', 'tafilah': 'الطفيلة',
        'معان': 'معان', 'maan': 'معان',
        'العقبة': 'العقبة', 'aqaba': 'العقبة',
    }
    for k, v in gov_map.items():
        if k in name:
            return v
    return name

# ─── Code generation ───
COUNTERS = {'stops': {}, 'routes': {}}

def gen_stop_code(gov, mode):
    """Generate unique stop code e.g. AM-BRT-001"""
    g = clean_gov(gov)
    g_short = {'العاصمة': 'AM', 'اربد': 'IR', 'الزرقاء': 'ZR', 'البلقاء': 'BQ',
               'المفرق': 'MF', 'جرش': 'JR', 'عجلون': 'AJ', 'مادبا': 'MD',
               'الكرك': 'KR', 'الطفيلة': 'TF', 'معان': 'MN', 'العقبة': 'AQ'}.get(g, g[:2].upper())
    m = {'brt': 'BRT', 'city_bus': 'BUS', 'serveece': 'SRV', 'coaster': 'COA', 'intercity': 'INT'}.get(mode, mode[:3].upper())
    key = f"{g}_{mode}"
    COUNTERS['stops'][key] = COUNTERS['stops'].get(key, 0) + 1
    return f"{g_short}-{m}-{COUNTERS['stops'][key]:04d}"

def gen_route_code(mode, idx):
    """Generate unique route code"""
    m = {'brt': 'BRT', 'city_bus': 'BUS', 'serveece': 'SRV', 'coaster': 'COA', 'intercity': 'INT'}.get(mode, mode[:3].upper())
    return f"{m}-{idx:04d}"

def parse_arabic_name(props):
    """Extract Arabic name from feature properties"""
    name_keys = ['ROUTE_NAME', 'Station_N', 'Name_AR', 'NAME_AR', 'name_ar', 'name', 'NAME',
                 'Start_Rout', 'STOP_NAME', 'station_na', 'ROUTE_NUMB']
    for k in name_keys:
        val = props.get(k, '') or ''
        if val and str(val).strip():
            return str(val).strip()
    return ''

def parse_english_name(props):
    """Extract English name from feature properties"""
    for k in ['Name_EN', 'NAME_EN', 'name_en', 'ENGLISH_NM', 'route_numb']:
        val = props.get(k, '') or ''
        if val and str(val).strip():
            return str(val).strip()
    return ''

# ═══════════════════════════════════════════════════════════════════
# EXTRACT STOPS
# ═══════════════════════════════════════════════════════════════════
def extract_stops_from_geojson(filepath, category='bus_stop', mode='city_bus', governorate='العاصمة'):
    """Extract stops from a GeoJSON file"""
    stops = []
    if not os.path.exists(filepath):
        return stops
    
    try:
        data = json.load(open(filepath, 'r', encoding='utf-8'))
    except:
        return stops
    
    features = data.get('features', [])
    for ft in features:
        geom = ft.get('geometry', {})
        gtype = geom.get('type', '')
        coords = geom.get('coordinates', [])
        props = ft.get('properties', {})
        
        if gtype not in ('Point', 'MultiPoint'):
            continue
        
        # Get coordinates
        coord = None
        if gtype == 'Point' and len(coords) >= 2:
            coord = coords
        elif gtype == 'MultiPoint' and coords and len(coords[0]) >= 2:
            coord = coords[0]
        
        if not coord:
            continue
        
        lng, lat = coord[0], coord[1]
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            continue
        if lat == 0 and lng == 0:
            continue
        
        name_ar = parse_arabic_name(props)
        name_en = parse_english_name(props) or name_ar
        
        # Detect transport type
        trans_type = props.get('TRANSPORTATION_TYPE', '') or ''
        if trans_type:
            mode = MODE_MAP.get(trans_type.strip(), mode)
        
        # Detect governorate
        for k in ['GOVERNORATE', 'governorate', 'Province', 'PROVINCE']:
            v = props.get(k, '')
            if v:
                governorate = clean_gov(v)
                break
        
        stop = {
            'code': 'TEMP',  # will be assigned later
            'name_ar': name_ar or 'محطة غير مسماة',
            'name_en': name_en or 'Unnamed Stop',
            'lat': lat,
            'lng': lng,
            'governorate': governorate,
            'mode': mode,
            'is_terminal': category == 'terminal',
            'is_landmark': category == 'landmark',
            'has_shelter': False,
            'has_lighting': False,
            'has_accessibility': False,
            'has_ticket_machine': False,
            'has_ac': False,
            'source': os.path.basename(filepath),
            'raw_props': {k: v for k, v in props.items() if v},
        }
        stops.append(stop)
    
    return stops

# ═══════════════════════════════════════════════════════════════════
# EXTRACT ROUTES
# ═══════════════════════════════════════════════════════════════════
def extract_routes_from_geojson(filepath, mode='city_bus'):
    """Extract routes (lines) from a GeoJSON file"""
    routes = []
    if not os.path.exists(filepath):
        return routes
    
    try:
        data = json.load(open(filepath, 'r', encoding='utf-8'))
    except:
        return routes
    
    features = data.get('features', [])
    for ft in features:
        geom = ft.get('geometry', {})
        gtype = geom.get('type', '')
        coords = geom.get('coordinates', [])
        props = ft.get('properties', {})
        
        if gtype not in ('LineString', 'MultiLineString'):
            continue
        
        if gtype == 'MultiLineString':
            # Take the longest segment
            if coords:
                coords = max(coords, key=len)
        
        if len(coords) < 2:
            continue
        
        name_ar = parse_arabic_name(props)
        name_en = parse_english_name(props) or name_ar
        
        trans_type = props.get('TRANSPORTATION_TYPE', '') or ''
        if trans_type:
            mode = MODE_MAP.get(trans_type.strip(), mode)
        
        # Extract route number & company
        route_number = props.get('ROUTE_NUMBER', props.get('ROUTE_NUMB', ''))
        company_name = props.get('COMANY_NAME', props.get('COMPANY_NAME', ''))
        payment_jd = props.get('PAYMENT_JD', props.get('PAYMENT', ''))
        owner_type = props.get('OWNER_TYPE', '')
        start_route = props.get('START_ROUTE', props.get('START_POINT', ''))
        end_route = props.get('END_ROUTE', props.get('END_POINT', ''))
        
        # Parse fare
        fare = 0.350
        try:
            fare = float(payment_jd) if payment_jd else 0.350
        except:
            pass
        
        # Build path GeoJSON
        path_geojson = {
            'type': 'LineString',
            'coordinates': [[round(c[0], 6), round(c[1], 6)] for c in coords]
        }
        
        # Calculate distance in meters (approximate)
        distance = calculate_distance(coords)
        
        route = {
            'code': 'TEMP',
            'name_ar': name_ar or 'خط غير مسمى',
            'name_en': name_en or 'Unnamed Route',
            'mode': mode,
            'path_geojson': path_geojson,
            'distance': round(distance, 1),
            'base_fare': round(fare, 3),
            'company_name': company_name,
            'owner_type': owner_type,
            'route_number': route_number,
            'start_route': start_route,
            'end_route': end_route,
            'color': MODE_COLORS.get(mode, '#0066CC'),
            'is_active': True,
            'source': os.path.basename(filepath),
            'raw_props': {k: v for k, v in props.items() if v},
        }
        routes.append(route)
    
    return routes

MODE_COLORS = {
    'brt': '#E31937',
    'city_bus': '#0066CC',
    'serveece': '#FF8C00',
    'coaster': '#8B4513',
    'intercity': '#228B22',
}

def calculate_distance(coords):
    """Approximate distance in meters using Haversine"""
    import math
    total = 0
    for i in range(len(coords) - 1):
        lon1, lat1 = math.radians(coords[i][0]), math.radians(coords[i][1])
        lon2, lat2 = math.radians(coords[i+1][0]), math.radians(coords[i+1][1])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        total += 6371000 * c
    return total

# ═══════════════════════════════════════════════════════════════════
# DEDUPLICATION
# ═══════════════════════════════════════════════════════════════════
def deduplicate_stops(stops, threshold_m=50):
    """Merge stops within threshold_m meters"""
    import math
    unique = []
    for stop in stops:
        is_dup = False
        for u in unique:
            dlat = (stop['lat'] - u['lat']) * 111320
            dlon = (stop['lng'] - u['lng']) * 111320 * math.cos(math.radians(stop['lat']))
            dist = math.sqrt(dlat**2 + dlon**2)
            if dist < threshold_m:
                # Merge: keep the one with better name
                if stop['name_ar'] and stop['name_ar'] != 'محطة غير مسماة':
                    u['name_ar'] = stop['name_ar']
                if stop['name_en'] and stop['name_en'] != 'Unnamed Stop':
                    u['name_en'] = stop['name_en']
                is_dup = True
                break
        if not is_dup:
            unique.append(stop)
    return unique

def deduplicate_routes(routes):
    """Remove duplicate routes by name"""
    seen = set()
    unique = []
    for r in routes:
        key = r['name_ar'].strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(r)
    return unique

# ═══════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════
def main():
    print("=" * 70)
    print("E.2 + E.3: Unified Transit Data Pipeline")
    print("Sources: ammangis.jo + ammancitygis.gov.jo ArcGIS")
    print("=" * 70)
    
    all_stops = []
    all_routes = []
    
    # ─── 1. BRT Stations (ammangis.jo) ───
    print("\n── 1. BRT Stations (ammangis.jo)")
    brt_stops = extract_stops_from_geojson(
        os.path.join(ROOT_STORAGE, 'brt_stations_stops.json'),
        category='bus_stop', mode='brt'
    )
    print(f"   ✅ {len(brt_stops)} BRT stations")
    all_stops.extend(brt_stops)
    
    # ─── 2. BRT Trial Routes ───
    print("\n── 2. BRT Routes")
    brt_routes = extract_routes_from_geojson(
        os.path.join(ROOT_STORAGE, 'brt_routes_trial_routes.json'),
        mode='brt'
    )
    print(f"   ✅ {len(brt_routes)} BRT routes")
    all_routes.extend(brt_routes)
    
    # ─── 3. Public Transit Routes (ammancitygis) ───
    print("\n── 3. Public Transit Routes (ammancitygis)")
    for fname, label, mode_hint in [
        ('transit_routes_large_routes.json', 'transit large', None),
        ('transit_routes_small_routes.json', 'transit small', None),
        ('transit_routes_temp_routes.json', 'transit temp', None),
    ]:
        filepath = os.path.join(ROOT_STORAGE, fname)
        routes = extract_routes_from_geojson(filepath, mode='city_bus')
        print(f"   ✅ {label}: {len(routes)} routes")
        all_routes.extend(routes)
    
    # ─── 4. Bus Stops (ammancitygis) ───
    print("\n── 4. Bus Stops (ammancitygis)")
    for fname, label in [
        ('transit_bus_stops_large_stops.json', 'bus stops large'),
        ('transit_bus_stops_small_stops.json', 'bus stops small'),
        ('transit_bus_start_large_stops.json', 'bus start large'),
        ('transit_bus_start_small_stops.json', 'bus start small'),
    ]:
        filepath = os.path.join(ROOT_STORAGE, fname)
        stops = extract_stops_from_geojson(filepath, category='bus_stop', mode='city_bus')
        print(f"   ✅ {label}: {len(stops)} stops")
        all_stops.extend(stops)
    
    # ─── 5. Landmarks as reference points ───
    print("\n── 5. BRT Landmarks (ammangis)")
    for fname, label in [
        ('brt_landmarks_large_stops.json', 'landmarks large'),
        ('brt_landmarks_small_stops.json', 'landmarks small'),
    ]:
        filepath = os.path.join(ROOT_STORAGE, fname)
        stops = extract_stops_from_geojson(filepath, category='landmark', mode='brt')
        print(f"   ✅ {label}: {len(stops)} landmarks")
        all_stops.extend(stops)
    
    # ─── 6. Excel Terminals ───
    print("\n── 6. Excel Terminals")
    terminals_json = os.path.join(ROOT, 'droob', 'backend', 'src', 'data', 'jordan-terminals.json')
    if os.path.exists(terminals_json):
        terminals = json.load(open(terminals_json, 'r', encoding='utf-8'))
        for t in terminals:
            stop = {
                'code': 'TEMP',
                'name_ar': t.get('name_ar', t.get('name', '')),
                'name_en': t.get('name_en', t.get('name_ar', '')),
                'lat': t.get('lat', 0),
                'lng': t.get('lng', 0),
                'governorate': clean_gov(t.get('governorate', '')),
                'mode': 'intercity',
                'is_terminal': True,
                'is_landmark': False,
                'has_shelter': True,
                'has_lighting': True,
                'has_accessibility': False,
                'has_ticket_machine': False,
                'has_ac': False,
                'source': 'المجمعات_بالاردن.xlsx',
                'raw_props': {},
            }
            if stop['lat'] and stop['lng']:
                all_stops.append(stop)
        print(f"   ✅ {len(terminals)} terminals from Excel")
    else:
        print(f"   ⚠️  Terminals file not found: {terminals_json}")
    
    # ─── Deduplication ───
    print("\n── Deduplication ──")
    print(f"   Before: {len(all_stops)} stops, {len(all_routes)} routes")
    all_stops = deduplicate_stops(all_stops, threshold_m=100)
    all_routes = deduplicate_routes(all_routes)
    print(f"   After:  {len(all_stops)} stops, {len(all_routes)} routes")
    
    # ─── Assign codes ───
    print("\n── Assigning Codes ──")
    for stop in all_stops:
        stop['code'] = gen_stop_code(stop['governorate'], stop['mode'])
    for i, route in enumerate(all_routes):
        route['code'] = gen_route_code(route['mode'], i + 1)
    
    # ─── Classify summary ───
    mode_counts = {}
    gov_counts = {}
    for s in all_stops:
        mode_counts[s['mode']] = mode_counts.get(s['mode'], 0) + 1
        gov_counts[s['governorate']] = gov_counts.get(s['governorate'], 0) + 1
    
    print("\n── Classification Summary ──")
    print("  Stops by mode:")
    for mode, count in sorted(mode_counts.items()):
        print(f"    {mode}: {count}")
    print("  Stops by governorate:")
    for gov, count in sorted(gov_counts.items(), key=lambda x: -x[1]):
        print(f"    {gov}: {count}")
    
    route_mode_counts = {}
    for r in all_routes:
        route_mode_counts[r['mode']] = route_mode_counts.get(r['mode'], 0) + 1
    print("  Routes by mode:")
    for mode, count in sorted(route_mode_counts.items()):
        print(f"    {mode}: {count}")
    
    # ─── Save unified JSON ───
    print("\n── Saving Unified Files ──")
    
    stops_path = os.path.join(OUTPUT_DIR, 'unified_stops.json')
    with open(stops_path, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(),
                   'total': len(all_stops), 'stops': all_stops},
                  f, ensure_ascii=False, indent=2)
    print(f"   💾 {stops_path} ({len(all_stops)} stops)")
    
    routes_path = os.path.join(OUTPUT_DIR, 'unified_routes.json')
    with open(routes_path, 'w', encoding='utf-8') as f:
        json.dump({'generated_at': datetime.now(timezone.utc).isoformat(),
                   'total': len(all_routes), 'routes': all_routes},
                  f, ensure_ascii=False, indent=2)
    print(f"   💾 {routes_path} ({len(all_routes)} routes)")
    
    # ─── Generate TypeScript seed data ───
    print("\n── Generating TypeScript Seed Data ──")
    generate_ts_seed(all_stops, all_routes)
    
    # ─── Generate SQL seed ───
    print("\n── Generating SQL Seed ──")
    generate_sql_seed(all_stops, all_routes)
    
    # ─── Summary ───
    print("\n" + "=" * 70)
    print("🎯 PIPELINE COMPLETE")
    print(f"   {len(all_stops)} unified stops")
    print(f"   {len(all_routes)} unified routes")
    print(f"   Output: {OUTPUT_DIR}/")
    print("=" * 70)

# ═══════════════════════════════════════════════════════════════════
# GENERATE TYPESCRIPT SEED
# ═══════════════════════════════════════════════════════════════════
def generate_ts_seed(stops, routes):
    """Generate Drizzle-compatible TypeScript seed file"""
    lines = [
        '/**',
        ' * Auto-generated seed data from unified_transit_data.py',
        f' * Generated: {datetime.now(timezone.utc).isoformat()}',
        f' * Stops: {len(stops)}, Routes: {len(routes)}',
        ' *',
        ' * Usage: npx tsx drizzle/seed-unified.ts',
        ' */',
        '',
        "import { db } from '../src/db';",
        "import { stops as stopsTable, routes as routesTable, routeStops as routeStopsTable, agencies as agenciesTable, governorates as governoratesTable } from './schema';",
        "import { eq, sql } from 'drizzle-orm';",
        '',
        '// ═══════════════════════════════════════════════════════════',
        '// GOVERNORATES',
        '// ═══════════════════════════════════════════════════════════',
    ]
    
    # Collect unique governorates
    govs = {}
    for s in stops:
        g = s['governorate']
        if g not in govs:
            govs[g] = {'name_ar': g, 'name_en': governorate_en(g), 'code': governorate_code(g),
                       'center_lat': s['lat'], 'center_lng': s['lng']}
    
    lines.append('const governoratesData = [')
    for g in govs.values():
        lines.append(f'  {{ name_ar: "{g["name_ar"]}", name_en: "{g["name_en"]}", code: "{g["code"]}", center_lat: {g["center_lat"]}, center_lng: {g["center_lng"]} }},')
    lines.append('];')
    lines.append('')
    
    # Collect unique agencies
    agencies_map = {}
    for r in routes:
        company = r.get('company_name', '') or 'مشغل غير معروف'
        if company not in agencies_map:
            agencies_map[company] = {'name_ar': company, 'name_en': company, 'code': f"AG-{len(agencies_map)+1:03d}", 'mode': r['mode']}
    
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('// AGENCIES')
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('const agenciesData = [')
    for a in agencies_map.values():
        lines.append(f'  {{ name_ar: "{a["name_ar"]}", name_en: "{a["name_en"]}", code: "{a["code"]}", mode: "{a["mode"]}" }},')
    lines.append('];')
    lines.append('')
    
    # Stops
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('// STOPS')
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('const stopsData = [')
    for s in stops:
        geom_sql = f"ST_SetSRID(ST_MakePoint({s['lng']},{s['lat']}),4326)"
        lines.append(f'  {{ code: "{s["code"]}", name_ar: {json.dumps(s["name_ar"], ensure_ascii=False)}, name_en: {json.dumps(s["name_en"], ensure_ascii=False)}, lat: {s["lat"]}, lng: {s["lng"]}, governorate: "{s["governorate"]}", is_terminal: {str(s["is_terminal"]).lower()}, is_landmark: {str(s["is_landmark"]).lower()}, geom: sql`{geom_sql}` }},')
    lines.append('];')
    lines.append('')
    
    # Routes
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('// ROUTES')
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('const routesData = [')
    for r in routes:
        path_json = json.dumps(r['path_geojson'], ensure_ascii=False)
        lines.append(f'  {{ code: "{r["code"]}", name_ar: {json.dumps(r["name_ar"], ensure_ascii=False)}, name_en: {json.dumps(r["name_en"], ensure_ascii=False)}, mode: "{r["mode"]}", path_geojson: {path_json}, distance: {r["distance"]}, base_fare: "{r["base_fare"]}", is_active: true, color: "{r["color"]}" }},')
    lines.append('];')
    lines.append('')
    
    # Seed function
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('// SEED FUNCTION')
    lines.append('// ═══════════════════════════════════════════════════════════')
    lines.append('export async function seedUnified() {')
    lines.append('  console.log("🌱 Seeding unified transit data...");')
    lines.append('')
    lines.append('  // Upsert governorates')
    lines.append('  for (const g of governoratesData) {')
    lines.append('    await db.insert(governoratesTable).values(g).onConflictDoNothing();')
    lines.append('  }')
    lines.append('  console.log(`  ✅ ${governoratesData.length} governorates`);')
    lines.append('')
    lines.append('  // Upsert agencies')
    lines.append('  for (const a of agenciesData) {')
    lines.append('    await db.insert(agenciesTable).values(a).onConflictDoNothing();')
    lines.append('  }')
    lines.append('  console.log(`  ✅ ${agenciesData.length} agencies`);')
    lines.append('')
    lines.append('  // Upsert stops')
    lines.append('  for (const s of stopsData) {')
    lines.append('    await db.insert(stopsTable).values(s).onConflictDoNothing();')
    lines.append('  }')
    lines.append('  console.log(`  ✅ ${stopsData.length} stops`);')
    lines.append('')
    lines.append('  // Upsert routes')
    lines.append('  for (const r of routesData) {')
    lines.append('    await db.insert(routesTable).values(r).onConflictDoNothing();')
    lines.append('  }')
    lines.append('  console.log(`  ✅ ${routesData.length} routes`);')
    lines.append('')
    lines.append('  console.log("🎯 Unified seed complete!");')
    lines.append('}')
    lines.append('')
    lines.append('// Run directly')
    lines.append('if (import.meta.url === `file://${process.argv[1]}`) {')
    lines.append('  seedUnified().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });')
    lines.append('}')
    
    seed_path = os.path.join(ROOT, 'droob', 'backend', 'drizzle', 'seed-unified.ts')
    with open(seed_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"   💾 {seed_path}")

# ═══════════════════════════════════════════════════════════════════
# GENERATE SQL SEED
# ═══════════════════════════════════════════════════════════════════
def generate_sql_seed(stops, routes):
    """Generate raw SQL seed file for direct PostgreSQL import"""
    lines = [
        '-- Auto-generated seed data from unified_transit_data.py',
        f'-- Generated: {datetime.now(timezone.utc).isoformat()}',
        f'-- Stops: {len(stops)}, Routes: {len(routes)}',
        '--',
        'BEGIN;',
        '',
    ]
    
    # Governorates
    govs = {}
    for s in stops:
        g = s['governorate']
        if g not in govs:
            govs[g] = {'name_ar': g, 'name_en': governorate_en(g), 'code': governorate_code(g),
                       'center_lat': s['lat'], 'center_lng': s['lng']}
    
    for g in govs.values():
        lines.append(f"INSERT INTO governorates (name_ar, name_en, code, center_lat, center_lng) VALUES ('{g['name_ar']}', '{g['name_en']}', '{g['code']}', {g['center_lat']}, {g['center_lng']}) ON CONFLICT (code) DO NOTHING;")
    
    # Stops
    lines.append('')
    for s in stops:
        geom = f"ST_SetSRID(ST_MakePoint({s['lng']},{s['lat']}),4326)"
        name_ar_esc = s['name_ar'].replace("'", "''")
        name_en_esc = s['name_en'].replace("'", "''")
        lines.append(f"INSERT INTO stops (code, name_ar, name_en, lat, lng, governorate, is_terminal, is_landmark, geom) VALUES ('{s['code']}', '{name_ar_esc}', '{name_en_esc}', {s['lat']}, {s['lng']}, '{s['governorate']}', {str(s['is_terminal']).upper()}, {str(s['is_landmark']).upper()}, {geom}) ON CONFLICT (code) DO NOTHING;")
    
    # Routes
    lines.append('')
    for r in routes:
        name_ar_esc = r['name_ar'].replace("'", "''")
        name_en_esc = r['name_en'].replace("'", "''")
        path_json = json.dumps(r['path_geojson'], ensure_ascii=False).replace("'", "''")
        lines.append(f"INSERT INTO routes (code, name_ar, name_en, mode, path_geojson, distance, base_fare, is_active, color) VALUES ('{r['code']}', '{name_ar_esc}', '{name_en_esc}', '{r['mode']}', '{path_json}'::jsonb, {r['distance']}, {r['base_fare']}, TRUE, '{r['color']}') ON CONFLICT (code, mode) DO NOTHING;")
    
    lines.append('')
    lines.append('COMMIT;')
    
    sql_path = os.path.join(OUTPUT_DIR, 'unified_seed.sql')
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"   💾 {sql_path}")

# ─── Helpers ───
def governorate_code(name):
    codes = {
        'العاصمة': 'AM', 'اربد': 'IR', 'الزرقاء': 'ZR', 'البلقاء': 'BQ',
        'المفرق': 'MF', 'جرش': 'JR', 'عجلون': 'AJ', 'مادبا': 'MD',
        'الكرك': 'KR', 'الطفيلة': 'TF', 'معان': 'MN', 'العقبة': 'AQ',
    }
    return codes.get(name, name[:2].upper())

def governorate_en(name):
    en = {
        'العاصمة': 'Amman', 'اربد': 'Irbid', 'الزرقاء': "Zarqa", 'البلقاء': 'Balqa',
        'المفرق': 'Mafraq', 'جرش': 'Jerash', 'عجلون': 'Ajloun', 'مادبا': 'Madaba',
        'الكرك': 'Karak', 'الطفيلة': 'Tafilah', 'معان': "Ma'an", 'العقبة': 'Aqaba',
    }
    return en.get(name, name)

if __name__ == '__main__':
    main()