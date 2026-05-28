"""Analyze extracted transit data quality"""
import json, os

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "..", "root_storage")

files_to_check = [
    "transit_routes_large_routes.json",
    "transit_bus_stops_large_stops.json",
    "transit_bus_start_large_stops.json",
    "brt_routes_trial_routes.json",
    "brt_routes_trial_2_routes.json",
    "brt_stations_stops.json",
]

for fname in files_to_check:
    path = os.path.join(ROOT, fname)
    if not os.path.exists(path):
        print(f"❌ Missing: {fname}")
        continue
    
    d = json.load(open(path, 'r', encoding='utf-8'))
    feats = d.get('features', [])
    print(f"\n{'='*60}")
    print(f"📄 {fname}  ({len(feats)} features)")
    
    # Show unique field values
    sample_props = [f.get('properties', {}) for f in feats[:3]]
    all_keys = set()
    for p in sample_props:
        all_keys.update(p.keys())
    print(f"  Fields: {sorted(all_keys)}")
    
    # Check for classification fields
    for key in ['TRANSPORTATION_TYPE', 'OWNER_TYPE', 'TYPE', 'ROUTE_NAME', 
                'COMANY_NAME', 'PAYMENT_JD', 'STATION_NAME_A', 'ROUTE_NUMBER',
                'STATION_CLASS', 'STAGE_NO', 'START_ROUTE', 'END_ROUTE',
                'ROUTE_DIRECTION', 'NAME_STARTING_POINT', 'STATION_ID']:
        vals = set()
        for p in [f.get('properties', {}) for f in feats]:
            v = p.get(key)
            if v is not None and v != '' and v != ' ':
                vals.add(str(v))
        if vals:
            print(f"  {key}: {sorted(vals)[:15]}{' ...' if len(vals) > 15 else ''}")

print("\n✅ Analysis complete!")