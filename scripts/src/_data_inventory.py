import json, os

ROOT = r'd:\trans_app\root_storage'

print("=" * 70)
print("DATA INVENTORY - root_storage JSON files")
print("=" * 70)

files = sorted([f for f in os.listdir(ROOT) if f.endswith('.json')])
total_features = 0
total_routes = 0
total_stops = 0

for f in files:
    path = os.path.join(ROOT, f)
    try:
        d = json.load(open(path, 'r', encoding='utf-8'))
        fs = d.get('features', [])
        n = len(fs)
        total_features += n
        # Count by type
        if '_routes' in f or 'routes' in os.path.splitext(f)[0]:
            total_routes += n
        if '_stops' in f or 'stations' in os.path.splitext(f)[0] or 'stops' in os.path.splitext(f)[0]:
            total_stops += n
        # Show first sample
        if fs:
            props = fs[0].get('properties', {})
            geom = fs[0].get('geometry', {})
            # Find name
            name = ''
            for k in ('ROUTE_NAME', 'Station_N', 'Name_AR', 'NAME_AR', 'name_ar', 'name', 'NAME'):
                val = props.get(k, '')
                if val and str(val).strip():
                    name = str(val)[:50]
                    break
            print(f"  {f}: {n} features | sample: {name}")
        else:
            print(f"  {f}: 0 features")
    except Exception as e:
        print(f"  {f}: ERROR - {e}")

print(f"\n TOTAL: {total_features} features across {len(files)} files")
print(f"   Routes: {total_routes} | Stops: {total_stops}")
print(f"=" * 70)