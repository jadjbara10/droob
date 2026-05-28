"""
E.1 Unified Transit Data Extraction
Fetches ALL transit data from:
  1. ammangis.jo/BRT - BRT stations, routes, landmarks
  2. ammancitygis.gov.jo/Transportation - Public transit (buses, service, coaster)

Uses ArcGIS proxy (confirmed working) for reliable access.
"""
import urllib.request
import urllib.parse
import json
import os
import time

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_STORAGE = os.path.join(SCRIPTS_DIR, "..", "..", "..", "root_storage")
os.makedirs(ROOT_STORAGE, exist_ok=True)

# ─── PROXY URL (confirmed working via browser) ───
BRT_PROXY = "https://ammangis.jo/dotnet/proxy.ashx?"

# ─── BRT MapServer Layers (from ammangis.jo) ───
BRT_BASE = "https://ammangis.jo/arcgis/rest/services/BRT_SERVICE/MapServer"
BRT_LAYERS = [
    (0, "محطات الباص السريع التردد", "esriGeometryMultipoint", "brt_stations"),
    (1, "مسار الباص سريع التردد - مرحلة التشغيل التجريبي", "esriGeometryPolyline", "brt_routes_trial"),
    (2, "مسار الباص سريع التردد - مرحلة التشغيل التجريبي", "esriGeometryPolyline", "brt_routes_trial_2"),
    (3, "المعالم الرئيسية", "esriGeometryPoint", "brt_landmarks_small"),
    (4, "المعالم الرئيسية", "esriGeometryPoint", "brt_landmarks_large"),
    (5, "اسماء الشوارع", "esriGeometryPolyline", "brt_street_names"),
    (6, "حدود المناطق", "esriGeometryPolygon", "brt_district_boundaries"),
    (7, "حدود الاحياء", "esriGeometryPolygon", "brt_neighborhood_boundaries"),
]

# ─── Transportation MapServer attempts ───
# ─── Transportation MapServer (ammancitygis.gov.jo) ───
# Uses DotNet/proxy.ashx (confirmed working via browser)
TRANSIT_PROXY = "https://www.ammancitygis.gov.jo/DotNet/proxy.ashx?"
TRANSIT_BASE = "https://www.ammancitygis.gov.jo/arcgis/rest/services/Transportation_Service/MapServer"
TRANSIT_LAYERS = [
    (1, "نقاط انطلاق الباصات (كبير)", "esriGeometryMultipoint", "transit_bus_start_large"),
    (2, "نقاط انطلاق الباصات (صغير)", "esriGeometryMultipoint", "transit_bus_start_small"),
    (3, "محطات توقف الباصات (كبير)", "esriGeometryPoint", "transit_bus_stops_large"),
    (4, "محطات توقف الباصات (صغير)", "esriGeometryPoint", "transit_bus_stops_small"),
    (5, "خطوط النقل العام (كبير)", "esriGeometryPolyline", "transit_routes_large"),
    (6, "خطوط النقل العام (صغير)", "esriGeometryPolyline", "transit_routes_small"),
    (7, "خطوط النقل العام - ترخيص مؤقت", "esriGeometryPolyline", "transit_routes_temp"),
]


def fetch_json(url, timeout=120, proxy=None, referer="https://ammangis.jo/BRT/"):
    """Fetch JSON from URL via optional proxy with proper headers"""
    # Use proxy if provided - ammancitygis uses DotNet proxy (raw URL, no encoding needed)
    is_ammancitygis = "ammancitygis" in url or (proxy and "ammancitygis" in proxy)
    is_ammangis = "ammangis.jo" in url
    
    if proxy and "proxy.ashx" not in url:
        if is_ammancitygis:
            # DotNet proxy expects unencoded URL after ?
            url = proxy + url
        else:
            url = proxy + urllib.parse.quote(url, safe='')
    elif is_ammangis and "proxy.ashx" not in url:
        # ammangis.jo BRT proxy - URL needs to be encoded
        url = BRT_PROXY + urllib.parse.quote(url, safe='')
    
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    req.add_header("Referer", referer)
    req.add_header("Accept", "application/json, text/plain, */*")
    
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=timeout)
            return json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            print(f"    HTTP {e.code}: {e.reason}")
            if attempt < 2:
                time.sleep(2)
        except Exception as e:
            print(f"    Error: {e}")
            if attempt < 2:
                time.sleep(2)
    return None


def fetch_feature_layer(base_url, layer_id, where="1=1", out_fields="*", name="layer", proxy=None, referer=None):
    """Fetch all features from an ArcGIS feature layer as GeoJSON"""
    params = {
        "where": where,
        "outFields": out_fields,
        "returnGeometry": "true",
        "f": "geojson",
        "outSR": "4326",
    }
    
    base = base_url.rstrip("/")
    query_url = f"{base}/{layer_id}/query?{urllib.parse.urlencode(params)}"
    
    print(f"\n  📥 Fetching {name} (layer {layer_id})...")
    
    data = fetch_json(query_url, proxy=proxy, referer=referer or "https://ammangis.jo/BRT/")
    if not data:
        params["returnGeometry"] = "false"
        query_url = f"{base}/{layer_id}/query?{urllib.parse.urlencode(params)}"
        data = fetch_json(query_url, proxy=proxy, referer=referer or "https://ammangis.jo/BRT/")
        if data:
            data["geometry_note"] = "fetched_without_geometry"
    
    if data and "features" in data:
        return data
    
    if data and "error" in data:
        print(f"    ❌ ArcGIS Error: {json.dumps(data['error'])[:200]}")
    
    return None


def classify_and_save(data, filename, output_dir):
    """Classify features by geometry type and save"""
    features = data.get("features", [])
    
    points = [f for f in features if f.get("geometry", {}).get("type") in ("Point", "MultiPoint")]
    lines = [f for f in features if f.get("geometry", {}).get("type") in ("LineString", "MultiLineString")]
    polygons = [f for f in features if f.get("geometry", {}).get("type") in ("Polygon", "MultiPolygon")]
    
    print(f"    Total: {len(features)} | Points: {len(points)} | Lines: {len(lines)} | Polygons: {len(polygons)}")
    
    if features:
        # Save complete GeoJSON
        compath = os.path.join(output_dir, f"{filename}.json")
        with open(compath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"    💾 {compath}")
    
    if points:
        _save({**data, "features": points}, f"{filename}_stops", output_dir)
    if lines:
        _save({**data, "features": lines}, f"{filename}_routes", output_dir)
    if polygons:
        _save({**data, "features": polygons}, f"{filename}_polygons", output_dir)
    
    return {"points": len(points), "lines": len(lines), "polygons": len(polygons), "total": len(features)}


def _save(data, name, output_dir):
    path = os.path.join(output_dir, f"{name}.json")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"    💾 {path}")


def print_sample(features, label="Properties", max_items=3):
    for ft in features[:max_items]:
        props = ft.get("properties", {})
        geom = ft.get("geometry", {})
        name_ar = ""
        for k in ("Name_AR", "name_ar", "NAME_AR", "name", "NAME", "Station_N", "Route_Nam"):
            if k in props and props[k]:
                name_ar = props[k]
                break
        print(f"    {name_ar} | {geom.get('type', '?')}")
        if props:
            keys = list(props.keys())[:10]
            print(f"    Fields: {keys}")


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
print("=" * 70)
print("E.1  استخراج بيانات النقل من ArcGIS - ammangis.jo + ammancitygis.gov.jo")
print("=" * 70)
print(f"Proxy: {BRT_PROXY}")
print(f"Output: {ROOT_STORAGE}")

all_results = {}

# ─── Part 1: BRT Data via Proxy ───
print("\n" + "─" * 50)
print("1️⃣  BRT Data (ammangis.jo/BRT via proxy)")
print("─" * 50)

# First verify proxy works
test = fetch_json(f"{BRT_BASE}?f=json")
if test and "layers" in test:
    print(f"✅ Proxy works! Found {len(test['layers'])} layers:\n")
    for l in test["layers"]:
        print(f"  Layer {l['id']}: {l['name']} ({l['geometryType']})")
else:
    print("❌ Proxy failed, trying direct...")
    test = fetch_json(f"{BRT_BASE}?f=json")
    if test:
        print(f"Direct access: {list(test.keys())[:5]}")

# Fetch each BRT layer
for lid, name, geom_type, filename in BRT_LAYERS:
    data = fetch_feature_layer(BRT_BASE, lid, name=name)
    if data:
        stats = classify_and_save(data, filename, ROOT_STORAGE)
        all_results[name] = stats
        print_sample(data.get("features", []))
    else:
        print(f"    ⚠️  No data for layer {lid}: {name}")

# ─── Part 2: Transportation Portal ───
print("\n" + "─" * 50)
print("2️⃣  Public Transit (ammancitygis.gov.jo/Transportation)")
print("─" * 50)

# Verify Transportation proxy works
transit_test = fetch_json(f"{TRANSIT_BASE}?f=json", proxy=TRANSIT_PROXY, referer="https://www.ammancitygis.gov.jo/Transportation/")
if transit_test and "layers" in transit_test:
    print(f"✅ Transit proxy works! Found {len(transit_test['layers'])} layers:\n")
    for l in transit_test["layers"]:
        print(f"  Layer {l['id']}: {l['name']} ({l['geometryType']})")
    
    # Fetch each transit layer
    for lid, name, geom_type, filename in TRANSIT_LAYERS:
        data = fetch_feature_layer(TRANSIT_BASE, lid, name=name, proxy=TRANSIT_PROXY, referer="https://www.ammancitygis.gov.jo/Transportation/")
        if data:
            stats = classify_and_save(data, filename, ROOT_STORAGE)
            all_results[name] = stats
            print_sample(data.get("features", []))
        else:
            print(f"    ⚠️  No data for layer {lid}: {name}")
else:
    print("  ❌ Transit proxy failed, response:")
    print(f"    {json.dumps(transit_test)[:300] if transit_test else 'None'}")

# ─── Summary ───
print("\n" + "=" * 70)
print("📊 FINAL SUMMARY")
print("=" * 70)

total_pt = total_ln = total_pl = 0
for name, stats in all_results.items():
    p = stats.get("points", 0)
    l = stats.get("lines", 0)
    pg = stats.get("polygons", 0)
    marker = "🚏" if p > 0 else "🚌" if l > 0 else "🗺️"
    print(f"  {marker} {name}: {p} stops, {l} routes, {pg} polygons")
    total_pt += p
    total_ln += l
    total_pl += pg

print(f"\n🎯 Grand Total: {total_pt} stops/points, {total_ln} route lines, {total_pl} polygons")
print(f"📁 All files saved to: {ROOT_STORAGE}")
print(f"\n✅ Phase E.1 complete!")