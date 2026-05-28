"""Quick inspection of ArcGIS GeoJSON files"""
import json, glob, os

ROOT_STORAGE = r'd:\trans_app\root_storage'

# Inspect _stops.json files
print("=== STOPS FILES ===")
for f in sorted(glob.glob(os.path.join(ROOT_STORAGE, '*_stops.json'))):
    d = json.load(open(f, 'r', encoding='utf-8'))
    features = d.get('features', [])
    if features:
        ft = features[0]
        props = ft.get('properties', {})
        geom = ft.get('geometry', {})
        prop_keys = list(props.keys())[:15]
        print(f"\n{os.path.basename(f)}: {len(features)} features")
        print(f"  Keys: {prop_keys}")
        print(f"  Name sample: {props.get('Station_N', props.get('Name_AR', props.get('name', '')))}")
        print(f"  TransType: {props.get('TRANSPORTATION_TYPE', 'N/A')}")
        print(f"  Geom: {geom.get('type')}")

print("\n=== ROUTES FILES ===")
for f in sorted(glob.glob(os.path.join(ROOT_STORAGE, '*_routes.json'))):
    d = json.load(open(f, 'r', encoding='utf-8'))
    features = d.get('features', [])
    if features:
        ft = features[0]
        props = ft.get('properties', {})
        geom = ft.get('geometry', {})
        prop_keys = list(props.keys())[:15]
        coords = geom.get('coordinates', [[]])[0]
        print(f"\n{os.path.basename(f)}: {len(features)} features")
        print(f"  Keys: {prop_keys}")
        print(f"  Name sample: {props.get('ROUTE_NAME', props.get('Name_AR', ''))}")
        print(f"  TransType: {props.get('TRANSPORTATION_TYPE', 'N/A')}")
        print(f"  Geom: {geom.get('type')}, coords count: {len(coords) if coords else 0}")

# Check if terminals JSON exists
terminals_path = r'd:\trans_app\droob\backend\src\data\jordan-terminals.json'
print(f"\n=== TERMINALS ===")
print(f"  jordan-terminals.json exists: {os.path.exists(terminals_path)}")