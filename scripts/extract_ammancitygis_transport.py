#!/usr/bin/env python3
"""
Extract Amman Public Transport data from ammancitygis.gov.jo ArcGIS REST API
Transportation_Service/MapServer layers:
  1-2: Bus_Starting_Point (مجمعات الانطلاق) - MultiPoint
  3-4: STATION_BUS_STOP (محطات الباص) - Point  
  5-6: خطوط النقل العام (public transport routes) - Polyline
  7:   خطوط النقل العام - التراخيص المؤقتة (temporary licenses) - Polyline

Saves:
  - root_storage/ammancity_stops.geojson (bus stops)
  - root_storage/ammancity_routes.geojson (route polylines + temp routes)
  - root_storage/ammancity_terminals.geojson (starting points)
  - root_storage/ammancity_transport_data.json (merged attribute data)
"""

import json, os, urllib.request, urllib.parse

SERVICE_URL = "https://www.ammancitygis.gov.jo/arcgis/rest/services/Transportation_Service/MapServer"
PROXY_BASE = "https://www.ammancitygis.gov.jo/DotNet/proxy.ashx"
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "root_storage")

os.makedirs(ROOT, exist_ok=True)

TRANSPORT_TYPES = {
    "1": "حافلة",
    "2": "كوستر", 
    "3": "سرفيس",
    "4": "حافلة كبيرة",
    "5": "حافلة متوسطة",
    "حافله": "حافلة",
    "سرفيس": "سرفيس",
    "كوستر": "كوستر",
}

def fetch_layer(layer_id: int) -> dict:
    """Fetch a full layer from Transportation_Service/MapServer via proxy."""
    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "true",
        "f": "geojson",
        "outSR": "4326"
    }
    query_url = f"{SERVICE_URL}/{layer_id}/query?{urllib.parse.urlencode(params)}"
    proxy_url = f"{PROXY_BASE}?{query_url}"
    
    print(f"Fetching layer {layer_id}...")
    try:
        with urllib.request.urlopen(proxy_url, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"  Got {len(data.get('features', []))} features")
            return data
    except Exception as e:
        print(f"  ERROR: {e}")
        return {"features": []}

def parse_transport_type(t: str) -> str:
    """Normalize transport type to Arabic."""
    if not t:
        return "غير محدد"
    t = t.strip()
    return TRANSPORT_TYPES.get(t, t)

def main():
    all_stops = []
    all_routes = []
    all_terminals = []
    
    # ── Layer 5: Main transport routes (detailed) ──
    routes_main = fetch_layer(5)
    for feat in routes_main.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        
        route = {
            "id": props.get("OBJECTID") or props.get("FID"),
            "route_name_ar": props.get("Route_Name") or props.get("ROUTE_NAME"),
            "route_number": props.get("Route_Num") or props.get("ROUTE_NUMBER"),
            "transport_type": parse_transport_type(props.get("Transportation_Type") or props.get("TRANSPORTATION_TYPE") or ""),
            "owner_company": props.get("OWNER_COMPANY") or props.get("COMANY_NAME"),
            "owner_type": props.get("OWNER_TYPE"),
            "start_point": props.get("START_POINT") or props.get("START_ROUTE"),
            "end_point": props.get("END_POINT") or props.get("END_ROUTE"),
            "direction": props.get("DIRECTION") or props.get("ROUTE_DIRECTION"),
            "fare_jd": props.get("PAYMENT_JD") or props.get("FARE"),
            "frequency_offpeak": props.get("الترددات_خارج_الذروة") or props.get("FREQ_OFFPEAK"),
            "frequency_peak": props.get("التردادات_وقت_الذروة") or props.get("FREQ_PEAK"),
            "road_status": props.get("ROAD_STATUS"),
            "route_type": props.get("ROUTE_TYPE"),
            "source": "امانة عمان - خطوط النقل العام",
            "license_type": "دائمة",
            "geometry": geom
        }
        all_routes.append(route)
    
    # ── Layer 7: Temporary license routes ──
    routes_temp = fetch_layer(7)
    for feat in routes_temp.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        
        route = {
            "id": props.get("OBJECTID") or props.get("FID"),
            "route_name_ar": props.get("Route_Name") or props.get("ROUTE_NAME"),
            "route_number": props.get("Route_Num") or props.get("ROUTE_NUMBER"),
            "transport_type": parse_transport_type(props.get("Transportation_Type") or props.get("TRANSPORTATION_TYPE") or ""),
            "owner_company": props.get("OWNER_COMPANY") or props.get("COMANY_NAME"),
            "owner_type": props.get("OWNER_TYPE"),
            "start_point": props.get("START_POINT") or props.get("START_ROUTE"),
            "end_point": props.get("END_POINT") or props.get("END_ROUTE"),
            "direction": props.get("DIRECTION") or props.get("ROUTE_DIRECTION"),
            "fare_jd": props.get("PAYMENT_JD") or props.get("FARE"),
            "road_status": props.get("ROAD_STATUS"),
            "source": "امانة عمان - تراخيص مؤقتة",
            "license_type": "مؤقتة",
            "geometry": geom
        }
        all_routes.append(route)
    
    # ── Layer 3: Bus Stops (detailed) ──
    stops = fetch_layer(3)
    for feat in stops.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", []) if geom else []
        
        stop = {
            "id": props.get("OBJECTID") or props.get("FID"),
            "name_ar": props.get("Stop_Name") or props.get("STATION_NAME") or props.get("STOP_NAME"),
            "name_en": props.get("Stop_Name_E") or props.get("STATION_NAME_EN"),
            "lng": coords[0] if len(coords) >= 2 else (coords[0][0] if coords and isinstance(coords[0], list) else None),
            "lat": coords[1] if len(coords) >= 2 else (coords[0][1] if coords and isinstance(coords[0], list) else None),
            "stop_type": props.get("STOP_TYPE") or props.get("STATION_TYPE"),
            "shelter": props.get("SHELTER"),
            "bench": props.get("BENCH"),
            "source": "امانة عمان - محطات الباص"
        }
        all_stops.append(stop)
    
    # ── Layers 1-2: Bus Starting Points (terminals) ──
    terminals_data = fetch_layer(1)
    for feat in terminals_data.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", []) if geom else []
        
        # Multipoint: coords is [[[lng, lat], [lng, lat], ...]]
        points = []
        raw_coords = coords if coords else []
        if raw_coords and isinstance(raw_coords[0], list):
            if raw_coords[0] and isinstance(raw_coords[0][0], list):
                points = [{"lng": p[0], "lat": p[1]} for p in raw_coords[0] if len(p) >= 2]
            elif len(raw_coords[0]) >= 2:
                points = [{"lng": raw_coords[0][0], "lat": raw_coords[0][1]}]
        
        terminal = {
            "id": props.get("OBJECTID") or props.get("FID"),
            "name_ar": props.get("Terminal_Name") or props.get("STARTING_POINT_NAME"),
            "points": points,
            "source": "امانة عمان - مجمعات الانطلاق"
        }
        all_terminals.append(terminal)
    
    # ── Save GeoJSON files ──
    for name, data in [
        ("ammancity_stops", {"type": "FeatureCollection", "features": [
            {"type": "Feature", "geometry": {"type": "Point", "coordinates": [s["lng"], s["lat"]]}, "properties": s}
            for s in all_stops if s.get("lng") and s.get("lat")
        ]}),
        ("ammancity_terminals", terminals_data),
        ("ammancity_routes_main", routes_main),
        ("ammancity_routes_temp", routes_temp),
    ]:
        path = os.path.join(ROOT, f"{name}.geojson")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  Saved: {path}")
    
    # ── Create merged transport data JSON ──
    transport_data = {
        "source": "ammancitygis.gov.jo Transportation_Service/MapServer",
        "crs": "WGS84 (EPSG:4326)",
        "terminals": all_terminals,
        "stops": all_stops,
        "routes": all_routes,
        "statistics": {
            "total_terminals": len(all_terminals),
            "total_stops": len(all_stops),
            "total_routes": len(all_routes),
            "permanent_routes": sum(1 for r in all_routes if r.get("license_type") == "دائمة"),
            "temporary_routes": sum(1 for r in all_routes if r.get("license_type") == "مؤقتة"),
            "transport_types": {}
        }
    }
    
    # Count transport types
    for r in all_routes:
        t = r.get("transport_type", "غير محدد")
        transport_data["statistics"]["transport_types"][t] = transport_data["statistics"]["transport_types"].get(t, 0) + 1
    
    path = os.path.join(ROOT, "ammancity_transport_data.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(transport_data, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {path}")
    
    # ── Summary ──
    print(f"\n{'='*60}")
    print(f"✅ Amman City Transportation Data Extracted!")
    print(f"   مجمعات الانطلاق: {len(all_terminals)}")
    print(f"   محطات الباص:     {len(all_stops)}")
    print(f"   خطوط النقل العام: {len(all_routes)}")
    print(f"     - دائمة:        {transport_data['statistics']['permanent_routes']}")
    print(f"     - مؤقتة:        {transport_data['statistics']['temporary_routes']}")
    print(f"   أنواع النقل:")
    for t, c in sorted(transport_data["statistics"]["transport_types"].items(), key=lambda x: -x[1]):
        print(f"     - {t}: {c}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()