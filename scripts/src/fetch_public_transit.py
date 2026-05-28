"""
E.2: Fetch Public Transit Data from ammancitygis.gov.jo ArcGIS REST API
Extracts bus routes, service routes, and coaster routes with full geometry

Sources:
- ammancitygis.gov.jo/Transportation/ — Public transit map viewer
- Contains ~200+ transit lines (حافلات + سرفيس + كوستر)
"""

import urllib.request
import urllib.parse
import json
import os
import sys
import time

# Output directories
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_STORAGE = os.path.join(os.path.dirname(SCRIPTS_DIR), "..", "..", "root_storage")
SCRIPTS_DATA = os.path.join(SCRIPTS_DIR, "..", "data")

os.makedirs(ROOT_STORAGE, exist_ok=True)
os.makedirs(SCRIPTS_DATA, exist_ok=True)

# Known ArcGIS MapServer endpoints discovered from ammancitygis.gov.jo
# The Transportation portal is built on ArcGIS Server (same as ammangis.jo)
TRANSPORTATION_ENDPOINTS = {
    "public_transit_lines": {
        "url": "https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer",
        "description": "خطوط النقل العام (حافلات + سرفيس + كوستر)"
    },
    "brt_service": {
        "url": "https://ammangis.jo/arcgis/rest/services/BRT_SERVICE/MapServer",
        "description": "BRT Stations & Routes"
    },
}

# Alternative: The transportation portal wraps ArcGIS with a proxy
# Try direct ArcGIS REST endpoints first, fall back to proxy-based URLs
FALLBACK_ENDPOINTS = [
    # Standard ArcGIS Server REST service catalog
    "https://ammancitygis.gov.jo/arcgis/rest/services?f=json",
    # Transportation specific
    "https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer?f=json",
    # Try the proxy pattern used by ammangis.jo
    "https://ammancitygis.gov.jo/dotnet/proxy.ashx?https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer?f=json",
]


def fetch_json(url, timeout=60):
    """Fetch JSON from URL with proper headers"""
    req = urllib.request.Request(url)
    req.add_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    req.add_header("Referer", "https://ammancitygis.gov.jo/Transportation/")
    req.add_header("Accept", "application/json")
    
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"    HTTP Error {e.code}: {e.reason}")
        try:
            body = e.read().decode('utf-8')[:500]
            print(f"    Body: {body}")
        except:
            pass
        return None
    except Exception as e:
        print(f"    Error: {e}")
        return None


def discover_services(base_url):
    """Discover available ArcGIS services"""
    print(f"\n🔍 Discovering services at: {base_url}")
    
    data = fetch_json(base_url)
    if not data:
        return []
    
    services = []
    
    # Standard ArcGIS Server response
    if "services" in data:
        for svc in data["services"]:
            svc_name = svc.get("name", svc.get("serviceName", "?"))
            svc_type = svc.get("type", "?")
            print(f"  Found: {svc_name} ({svc_type})")
            services.append(svc)
    
    # Folder-based response
    if "folders" in data:
        for folder in data["folders"]:
            folder_name = folder if isinstance(folder, str) else folder.get("name", "?")
            print(f"  Folder: {folder_name}")
    
    # MapServer direct response (has layers)
    if "layers" in data:
        print(f"  Direct MapServer with {len(data['layers'])} layers")
        for layer in data["layers"]:
            layer_id = layer.get("id", "?")
            layer_name = layer.get("name", "?")
            print(f"    Layer {layer_id}: {layer_name}")
    
    # Single feature layer response
    if "fields" in data:
        print(f"  Feature Layer with {len(data['fields'])} fields")
        for field in data["fields"][:10]:
            print(f"    {field.get('name', '?')} ({field.get('type', '?')})")
    
    return services


def fetch_feature_layer(url, layer_id, where="1=1", out_fields="*", name="layer"):
    """Fetch all features from an ArcGIS feature layer as GeoJSON"""
    params = {
        "where": where,
        "outFields": out_fields,
        "returnGeometry": "true",
        "f": "geojson",
        "outSR": "4326",  # WGS84 lat/lng
    }
    
    # Build URL - handle both MapServer/layer paths and direct feature server paths
    if "/MapServer/" in url and not url.endswith(f"/{layer_id}"):
        base = url.rstrip("/")
    else:
        base = url
    
    query_url = f"{base}/{layer_id}/query?{urllib.parse.urlencode(params)}"
    
    print(f"\n📥 Fetching {name}...")
    print(f"   URL: {query_url[:150]}...")
    
    data = fetch_json(query_url)
    if not data:
        # Try with smaller batch
        print("   Retrying without geometry...")
        params["returnGeometry"] = "false"
        query_url = f"{base}/{layer_id}/query?{urllib.parse.urlencode(params)}"
        data = fetch_json(query_url)
    
    if data and "features" in data:
        count = len(data["features"])
        print(f"   ✅ Got {count} features")
        
        # Show sample properties
        if count > 0:
            sample = data["features"][0]["properties"]
            print(f"   Sample fields: {list(sample.keys())[:15]}")
        
        return data
    
    if data and "error" in data:
        print(f"   ❌ ArcGIS Error: {data['error']}")
        return None
    
    print(f"   ❌ No features found")
    return None


def save_and_summarize(data, filename_prefix, output_dir):
    """Save GeoJSON and print summary"""
    # Split into points and lines
    features = data.get("features", [])
    points = [f for f in features if f.get("geometry", {}).get("type") in ("Point", "MultiPoint")]
    lines = [f for f in features if f.get("geometry", {}).get("type") in ("LineString", "MultiLineString")]
    
    # Save complete dataset
    filepath = os.path.join(output_dir, f"{filename_prefix}_complete.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"   💾 Saved: {filepath} ({len(features)} features)")
    
    # Save routes (lines) separately
    if lines:
        route_data = {"type": "FeatureCollection", "features": lines}
        route_file = os.path.join(output_dir, f"{filename_prefix}_routes.json")
        with open(route_file, 'w', encoding='utf-8') as f:
            json.dump(route_data, f, ensure_ascii=False, indent=2)
        print(f"   🚌 Routes saved: {route_file} ({len(lines)} route geometries)")
    
    # Save stops (points) separately
    if points:
        stop_data = {"type": "FeatureCollection", "features": points}
        stop_file = os.path.join(output_dir, f"{filename_prefix}_stops.json")
        with open(stop_file, 'w', encoding='utf-8') as f:
            json.dump(stop_data, f, ensure_ascii=False, indent=2)
        print(f"   🚏 Stops saved: {stop_file} ({len(points)} points)")
    
    # Save extracted route list as simplified JSON for the app
    simplify_routes(lines, filename_prefix, output_dir)
    simplify_stops(points, filename_prefix, output_dir)
    
    return {"routes": len(lines), "stops": len(points), "total": len(features)}


def simplify_routes(lines, prefix, output_dir):
    """Extract route metadata for app consumption"""
    routes = []
    for ft in lines:
        props = ft.get("properties", {})
        geom = ft.get("geometry", {})
        
        route = {
            "name_ar": props.get("Name_AR", props.get("name", props.get("NAME_AR", props.get("route_name", "")))),
            "name_en": props.get("Name_EN", props.get("name_en", props.get("NAME_EN", ""))),
            "route_id": props.get("Route_ID", props.get("route_id", props.get("ROUTE_ID", props.get("code", "")))),
            "from": props.get("From", props.get("from_stop", props.get("origin", ""))),
            "to": props.get("To", props.get("to_stop", props.get("destination", ""))),
            "type": props.get("Type", props.get("route_type", props.get("TYPE", ""))),
            "operator": props.get("Operator", props.get("company", props.get("OPERATOR", ""))),
            "geometry": {
                "type": geom.get("type"),
                "coordinates": geom.get("coordinates", [])[:5]  # First 5 coords as sample
            },
            "all_properties": dict(list(props.items())[:20])  # Keep first 20 fields for reference
        }
        routes.append(route)
    
    output = {
        "source": prefix,
        "total_routes": len(routes),
        "routes": routes
    }
    
    filepath = os.path.join(output_dir, f"{prefix}_routes_simplified.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"   📋 Simplified routes: {filepath}")


def simplify_stops(points, prefix, output_dir):
    """Extract stop metadata for app consumption"""
    stops = []
    for ft in points:
        props = ft.get("properties", {})
        geom = ft.get("geometry", {})
        coords = geom.get("coordinates", [0, 0])
        
        stop = {
            "name_ar": props.get("Name_AR", props.get("name", props.get("stop_name", ""))),
            "name_en": props.get("Name_EN", props.get("name_en", "")),
            "stop_id": props.get("Stop_ID", props.get("stop_id", props.get("code", ""))),
            "lat": coords[1] if len(coords) > 1 else coords[0],
            "lng": coords[0] if len(coords) > 1 else 0,
            "type": props.get("Type", props.get("stop_type", "")),
        }
        stops.append(stop)
    
    output = {
        "source": prefix,
        "total_stops": len(stops),
        "stops": stops
    }
    
    filepath = os.path.join(output_dir, f"{prefix}_stops_simplified.json")
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"   📋 Simplified stops: {filepath}")


# ============================================================
# MAIN EXECUTION
# ============================================================
print("=" * 70)
print("E.1 + E.2: استخراج بيانات النقل في الأردن")
print("المصادر: ammangis.jo + ammancitygis.gov.jo")
print("=" * 70)

results = {}

# ─── Step 1: BRT Data from ammangis.jo ───
print("\n" + "─" * 50)
print("1️⃣  BRT Data (ammangis.jo)")
print("─" * 50)

brt_mapserver = "https://ammangis.jo/arcgis/rest/services/BRT_SERVICE/MapServer"

# BRT Layer 0: Stops
brt_data = fetch_feature_layer(brt_mapserver, 0, name="BRT Stops (Layer 0)")
if brt_data:
    stats = save_and_summarize(brt_data, "brt_ammangis", ROOT_STORAGE)
    results["brt_stops"] = stats
    # Also save to scripts/data for pipeline
    save_and_summarize(brt_data, "brt_ammangis", SCRIPTS_DATA)

# BRT Layer 1: Routes
brt_routes = fetch_feature_layer(brt_mapserver, 1, name="BRT Routes (Layer 1)")
if brt_routes:
    stats = save_and_summarize(brt_routes, "brt_routes_ammangis", ROOT_STORAGE)
    results["brt_routes"] = stats
    save_and_summarize(brt_routes, "brt_routes_ammangis", SCRIPTS_DATA)

# BRT Layer 2: Additional Stops
brt_extra = fetch_feature_layer(brt_mapserver, 2, name="BRT Additional Stops (Layer 2)")
if brt_extra:
    stats = save_and_summarize(brt_extra, "brt_extra_ammangis", ROOT_STORAGE)
    results["brt_extra_stops"] = stats

# ─── Step 2: Public Transit from ammancitygis.gov.jo ───
print("\n" + "─" * 50)
print("2️⃣  Public Transit (ammancitygis.gov.jo)")
print("─" * 50)

# Try to discover available services
for endpoint_url in FALLBACK_ENDPOINTS:
    print(f"\n🔗 Trying: {endpoint_url}")
    data = fetch_json(endpoint_url)
    if data:
        print(f"  ✅ Response type: {type(data).__name__}")
        if isinstance(data, dict):
            print(f"  Keys: {list(data.keys())[:10]}")
            
            # If this is a MapServer with layers
            if "layers" in data:
                layers = data["layers"]
                print(f"  📊 Found {len(layers)} layers!")
                
                mapserver_base = endpoint_url.replace("?f=json", "")
                
                for layer in layers:
                    lid = layer.get("id")
                    lname = layer.get("name", f"Layer_{lid}")
                    print(f"\n  → Querying layer {lid}: {lname}")
                    
                    layer_data = fetch_feature_layer(mapserver_base, lid, name=lname)
                    if layer_data:
                        safe_name = f"transit_{lname.lower().replace(' ', '_').replace('-', '_')}"
                        stats = save_and_summarize(layer_data, safe_name, ROOT_STORAGE)
                        results[lname] = stats
                        save_and_summarize(layer_data, safe_name, SCRIPTS_DATA)
            break
    
    print(f"  ❌ Failed, trying next endpoint...")
    time.sleep(1)

# ─── Step 3: Try proxy-based access (like ammangis uses) ───
print("\n" + "─" * 50)
print("3️⃣  Trying proxy-based access")
print("─" * 50)

# The transportation portal may use a proxy pattern
proxy_urls = [
    "https://ammancitygis.gov.jo/proxy.ashx?https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer?f=json",
    "https://ammancitygis.gov.jo/proxy/proxy.ashx?https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer?f=json",
]

for proxy_url in proxy_urls:
    print(f"\n🔗 Proxy: {proxy_url}")
    data = fetch_json(proxy_url)
    if data and "error" not in data:
        print(f"  ✅ Proxy works! Keys: {list(data.keys())[:10]}")
        
        if "layers" in data:
            layers = data["layers"]
            mapserver_base = "https://ammancitygis.gov.jo/proxy.ashx?https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer"
            
            for layer in layers:
                lid = layer.get("id")
                lname = layer.get("name", f"Layer_{lid}")
                
                layer_url = f"https://ammancitygis.gov.jo/proxy.ashx?https://ammancitygis.gov.jo/arcgis/rest/services/Transportation/MapServer/{lid}/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson&outSR=4326"
                print(f"\n  → Layer {lid}: {lname}")
                
                layer_data = fetch_json(layer_url)
                if layer_data and "features" in layer_data:
                    safe_name = f"apt_{lname.lower().replace(' ', '_')[:30]}"
                    stats = save_and_summarize(layer_data, safe_name, ROOT_STORAGE)
                    results[lname] = stats
        break
    time.sleep(1)

# ─── Final Summary ───
print("\n" + "=" * 70)
print("📊 FINAL SUMMARY")
print("=" * 70)

total_routes = 0
total_stops = 0
for name, stats in results.items():
    r = stats.get("routes", 0)
    s = stats.get("stops", 0)
    t = stats.get("total", 0)
    print(f"  {name}: {r} routes, {s} stops, {t} total features")
    total_routes += r
    total_stops += s

print(f"\n  🎯 Grand Total: {total_routes} routes, {total_stops} stops")
print(f"  📁 Output: {ROOT_STORAGE}")
print(f"  📁 Scripts data: {SCRIPTS_DATA}")
print("\n✅ Done!")