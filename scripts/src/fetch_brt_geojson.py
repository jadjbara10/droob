"""
E.1a: Fetch BRT Routes GeoJSON from ammangis.jo ArcGIS REST API
Fetches full geometry (paths) for all BRT routes
"""
import urllib.request
import json
import os

# MapServer layers:
# 0 = BRT_Stops (محطات الباص سريع التردد)
# 1 = BRT Routes (مسار الباص سريع التردد)
# 2 = Additional BRT Stops

BASE_URL = "https://ammangis.jo/arcgis/rest/services/BRT_SERVICE/MapServer"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def fetch_layer(layer_id, name):
    """Fetch a layer from ArcGIS REST API as GeoJSON"""
    url = f"{BASE_URL}/{layer_id}/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson"
    print(f"Fetching {name} (layer {layer_id})...")
    print(f"  URL: {url}")
    
    try:
        resp = urllib.request.urlopen(url, timeout=60)
        data = json.loads(resp.read().decode('utf-8'))
        
        feature_count = len(data.get('features', []))
        print(f"  Features: {feature_count}")
        
        # Print summary
        for i, ft in enumerate(data.get('features', [])[:10]):
            props = ft.get('properties', {})
            geom = ft.get('geometry', {})
            name_ar = props.get('Name_AR', props.get('name', props.get('NAME', '?')))
            print(f"  {i+1}. {name_ar} | geom: {geom.get('type', '?')}")
        
        # Save to file
        filename = f"brt_{name.lower().replace(' ', '_')}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"  Saved: {filepath}")
        print(f"  Size: {os.path.getsize(filepath):,} bytes")
        return data
    except Exception as e:
        print(f"  ERROR: {e}")
        return None

# Fetch all BRT layers
print("=" * 60)
print("E.1: استخراج بيانات BRT من ammangis.jo")
print("=" * 60)

layers = [
    (0, "BRT Stops"),
    (1, "BRT Routes"),
    (2, "BRT Additional Stops"),
]

results = {}
for layer_id, name in layers:
    data = fetch_layer(layer_id, name)
    if data:
        results[name] = len(data.get('features', []))
    print()

print("=" * 60)
print("Summary:")
for name, count in results.items():
    print(f"  {name}: {count} features")
print("Done!")