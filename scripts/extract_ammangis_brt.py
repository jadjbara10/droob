#!/usr/bin/env python3
"""
Extract BRT data from ammangis.jo ArcGIS REST API
Saves:
  - root_storage/brt_stations.geojson (95 stations w/ WGS84 coords)
  - root_storage/brt_routes.geojson (18 route polyline geometries)
  - root_storage/brt_data.json (merged attribute data)
"""

import json, sys, os, urllib.request, urllib.parse

PROXY_BASE = "https://ammangis.jo/dotnet/proxy.ashx"
SERVICE_URL = "https://ammangis.jo/arcgis/rest/services/BRT_SERVICE/MapServer"
ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "root_storage")

os.makedirs(ROOT, exist_ok=True)

def fetch_layer(layer_id: int) -> dict:
    """Fetch a full layer from the BRT MapServer via proxy."""
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
    with urllib.request.urlopen(proxy_url) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    # Layer 0: BRT Stations (MultiPoint)
    stations = fetch_layer(0)
    print(f"  Layer 0: {len(stations.get('features', []))} stations")
    
    # Layer 1: BRT Routes (Polyline)
    routes1 = fetch_layer(1)
    print(f"  Layer 1: {len(routes1.get('features', []))} routes")
    
    # Layer 2: BRT Routes (alternate direction)  
    routes2 = fetch_layer(2)
    print(f"  Layer 2: {len(routes2.get('features', []))} routes")
    
    # Save GeoJSON files
    for name, data in [
        ("brt_stations", stations),
        ("brt_routes_layer1", routes1),
        ("brt_routes_layer2", routes2)
    ]:
        path = os.path.join(ROOT, f"{name}.geojson")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  Saved: {path}")
    
    # Create merged BRT data JSON
    brt_data = {
        "source": "ammangis.jo BRT_SERVICE/MapServer",
        "crs": "WGS84 (EPSG:4326)",
        "stations": [],
        "routes": []
    }
    
    for feat in stations.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", []) if geom else []
        brt_data["stations"].append({
            "id": props.get("OBJECTID"),
            "name_ar": props.get("STATION_NAME_A"),
            "class": props.get("STATION_CLASS"),
            "stage": props.get("STAGE_NO"),
            "lng": coords[0][0] if coords and len(coords[0]) >= 2 else None,
            "lat": coords[0][1] if coords and len(coords[0]) >= 2 else None
        })
    
    for feat in routes1.get("features", []):
        props = feat.get("properties", {})
        geom = feat.get("geometry", {})
        brt_data["routes"].append({
            "id": props.get("OBJECTID"),
            "name_ar": props.get("ROUTE_NAME"),
            "number": props.get("ROUTE_NUMBER"),
            "company": props.get("COMANY_NAME"),
            "owner_type": props.get("OWNER_TYPE"),
            "transport_type": props.get("TRANSPORTATION_TYPE"),
            "fare_jd": props.get("PAYMENT_JD"),
            "start": props.get("START_ROUTE"),
            "end": props.get("END_ROUTE"),
            "direction": props.get("ROUTE_DIRECTION"),
            "direction_type": props.get("ROUTE_DIRECTION_1"),
            "road_status": props.get("ROAD_STATUS"),
            "freq_offpeak": props.get("الترددات_خارج_الذروة"),
            "freq_peak": props.get("التردادات_وقت_الذروة"),
            "length_m": props.get("SHAPE.LEN"),
            "geometry": geom
        })
    
    path = os.path.join(ROOT, "brt_data.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(brt_data, f, ensure_ascii=False, indent=2)
    print(f"  Saved: {path}")
    
    print(f"\nDone! Extracted {len(brt_data['stations'])} stations and {len(brt_data['routes'])} routes.")

if __name__ == "__main__":
    main()