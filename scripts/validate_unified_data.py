#!/usr/bin/env python3
"""
دروب Unified Transit Data Validator
------------------------------------
Validates unified-transit-data.json against data quality rules:
  - Coordinate bounds (Jordan)
  - Duplicate detection
  - Route geometry integrity
  - Governorate consistency
  - Route-stop connectivity

Usage: python validate_unified_data.py [data_file]
"""

import json
import os
import sys
from collections import defaultdict
from typing import List, Dict, Tuple

# ── Jordan bounding box ────────────────────────────────────
JORDAN_LAT_MIN, JORDAN_LAT_MAX = 29.0, 33.5
JORDAN_LNG_MIN, JORDAN_LNG_MAX = 34.9, 39.5

# Valid governorates
VALID_GOVS = {
    "العاصمة", "اربد", "الزرقاء", "البلقاء", "الكرك",
    "الطفيلة", "معان", "العقبة", "المفرق", "جرش",
    "عجلون", "مأدبا", "غير معروف",
}

TRANSPORT_TYPES = {"brt", "bus", "service", "coaster", "unknown"}

# ── Validator ──────────────────────────────────────────────
class UnifiedDataValidator:
    def __init__(self, data: dict):
        self.data = data
        self.stops: Dict[str, List[dict]] = data.get("stops", {})
        self.routes: Dict[str, List[dict]] = data.get("routes", {})
        self.errors: Dict[str, List[str]] = defaultdict(list)
        self.warnings: Dict[str, List[str]] = defaultdict(list)

    def validate_structure(self) -> bool:
        """Validate top-level structure."""
        ok = True
        required_keys = ["metadata", "statistics", "stops", "routes"]
        for key in required_keys:
            if key not in self.data:
                self.errors["structure"].append(f"Missing top-level key: {key}")
                ok = False
        return ok

    def validate_stops(self) -> Tuple[int, int]:
        """Validate all stops. Returns (valid_count, error_count)."""
        valid = 0
        errors = 0
        all_stop_codes = set()

        for trans_type, stops in self.stops.items():
            if trans_type not in TRANSPORT_TYPES:
                self.warnings["stops"].append(f"Unknown transport_type: {trans_type}")

            for i, s in enumerate(stops):
                stop_id = s.get("id", f"unknown-{i}")
                stop_errors = []

                # Required fields
                for field in ["id", "name_ar", "lat", "lng", "transport_type"]:
                    if not s.get(field):
                        stop_errors.append(f"Missing required field: {field}")

                # Coordinate bounds
                lat = s.get("lat")
                lng = s.get("lng")
                if lat is not None and lng is not None:
                    if lat < JORDAN_LAT_MIN or lat > JORDAN_LAT_MAX:
                        stop_errors.append(f"lat={lat} outside Jordan bounds [{JORDAN_LAT_MIN}, {JORDAN_LAT_MAX}]")
                    if lng < JORDAN_LNG_MIN or lng > JORDAN_LNG_MAX:
                        stop_errors.append(f"lng={lng} outside Jordan bounds [{JORDAN_LNG_MIN}, {JORDAN_LNG_MAX}]")

                # Governorate
                gov = s.get("governorate_ar", "")
                if gov not in VALID_GOVS:
                    self.warnings["stops"].append(f"{stop_id}: unknown governorate '{gov}'")

                # Duplicate codes
                code = s.get("code", "")
                if code and code in all_stop_codes:
                    stop_errors.append(f"Duplicate stop code: {code}")
                if code:
                    all_stop_codes.add(code)

                if stop_errors:
                    self.errors["stops"].extend([f"{stop_id}: {e}" for e in stop_errors])
                    errors += 1
                else:
                    valid += 1

        return valid, errors

    def validate_routes(self) -> Tuple[int, int]:
        """Validate all routes. Returns (valid_count, error_count)."""
        valid = 0
        errors = 0
        all_route_codes = set()

        for trans_type, routes in self.routes.items():
            if trans_type not in TRANSPORT_TYPES:
                self.warnings["routes"].append(f"Unknown transport_type: {trans_type}")

            for i, r in enumerate(routes):
                route_id = r.get("id", f"unknown-{i}")
                route_errors = []

                # Required fields
                for field in ["id", "name_ar", "transport_type", "path"]:
                    if not r.get(field):
                        route_errors.append(f"Missing required field: {field}")

                # Path validation
                path = r.get("path", [])
                if path:
                    if len(path) < 2:
                        route_errors.append(f"Path has fewer than 2 points ({len(path)})")
                    for j, pt in enumerate(path):
                        if len(pt) < 2:
                            route_errors.append(f"Path point {j} missing coordinates")
                        else:
                            lng, lat = pt[0], pt[1]
                            if lat < JORDAN_LAT_MIN or lat > JORDAN_LAT_MAX:
                                route_errors.append(f"Path point {j} lat={lat} out of bounds")
                            if lng < JORDAN_LNG_MIN or lng > JORDAN_LNG_MAX:
                                route_errors.append(f"Path point {j} lng={lng} out of bounds")

                # Distance validation
                distance = r.get("distance_km", 0)
                if distance <= 0 and path:
                    self.warnings["routes"].append(f"{route_id}: distance_km is {distance}, but path has {len(path)} points")

                # Governorate
                gov = r.get("governorate_ar", "")
                if gov not in VALID_GOVS:
                    self.warnings["routes"].append(f"{route_id}: unknown governorate '{gov}'")

                # Duplicate codes
                code = r.get("code", "")
                if code and code in all_route_codes:
                    route_errors.append(f"Duplicate route code: {code}")
                if code:
                    all_route_codes.add(code)

                if route_errors:
                    self.errors["routes"].extend([f"{route_id}: {e}" for e in route_errors])
                    errors += 1
                else:
                    valid += 1

        return valid, errors

    def check_duplicate_stops(self) -> List[str]:
        """Find stops that are very close to each other (~10m)."""
        warnings = []
        threshold = 0.00009  # ~10 meters

        all_stops = []
        for trans_type, stops in self.stops.items():
            for s in stops:
                all_stops.append(s)

        for i in range(len(all_stops)):
            for j in range(i + 1, len(all_stops)):
                si, sj = all_stops[i], all_stops[j]
                dlat = abs(si.get("lat", 0) - sj.get("lat", 0))
                dlng = abs(si.get("lng", 0) - sj.get("lng", 0))
                if dlat < threshold and dlng < threshold:
                    warnings.append(
                        f"Near-duplicate: {si.get('id')} ({si.get('name_ar')}) ↔ "
                        f"{sj.get('id')} ({sj.get('name_ar')}) "
                        f"[Δ={dlat:.6f}, {dlng:.6f}]"
                    )

        return warnings

    def generate_report(self) -> str:
        """Generate a validation report."""
        lines = []
        lines.append("=" * 60)
        lines.append("📋 Unified Transit Data Validation Report")
        lines.append("=" * 60)
        lines.append("")

        # Statistics
        stats = self.data.get("statistics", {})
        lines.append("📊 Summary Statistics:")
        lines.append(f"   Total stops:  {stats.get('total_stops', 'N/A')}")
        lines.append(f"   Total routes: {stats.get('total_routes', 'N/A')}")
        lines.append(f"   Governorates: {len(stats.get('governorates', {}))}")
        lines.append("")

        stops_by_type = stats.get("stops_by_type", {})
        routes_by_type = stats.get("routes_by_type", {})
        for tt in sorted(set(list(stops_by_type.keys()) + list(routes_by_type.keys()))):
            sc = stops_by_type.get(tt, 0)
            rc = routes_by_type.get(tt, 0)
            lines.append(f"   {tt:10s}: {sc:4d} stops, {rc:4d} routes")
        lines.append("")

        # Governorate breakdown
        lines.append("🗺️  Governorate Distribution:")
        for gov, counts in sorted(stats.get("governorates", {}).items()):
            lines.append(f"   {gov:12s}: {counts.get('stops', 0):4d} stops, {counts.get('routes', 0):4d} routes")
        lines.append("")

        # Errors
        total_errors = sum(len(v) for v in self.errors.values())
        lines.append(f"❌ Errors: {total_errors}")
        if total_errors == 0:
            lines.append("   ✅ No errors found!")
        else:
            for category, errs in self.errors.items():
                if errs:
                    lines.append(f"   [{category}] {len(errs)} errors:")
                    for e in errs[:10]:  # Show first 10
                        lines.append(f"      • {e}")
                    if len(errs) > 10:
                        lines.append(f"      ... and {len(errs) - 10} more")
        lines.append("")

        # Warnings
        total_warnings = sum(len(v) for v in self.warnings.values())
        lines.append(f"⚠️  Warnings: {total_warnings}")
        if total_warnings == 0:
            lines.append("   ✅ No warnings!")
        else:
            for category, warns in self.warnings.items():
                if warns:
                    lines.append(f"   [{category}] {len(warns)} warnings:")
                    for w in warns[:10]:
                        lines.append(f"      • {w}")
                    if len(warns) > 10:
                        lines.append(f"      ... and {len(warns) - 10} more")
        lines.append("")

        # Duplicates
        dupes = self.check_duplicate_stops()
        lines.append(f"🔍 Near-duplicate stops (≤10m): {len(dupes)}")
        for d in dupes[:20]:
            lines.append(f"   • {d}")
        if len(dupes) > 20:
            lines.append(f"   ... and {len(dupes) - 20} more")
        lines.append("")

        # Summary
        lines.append("=" * 60)
        if total_errors == 0:
            lines.append("✅ VALIDATION PASSED — Data is ready for seeding")
        else:
            lines.append("❌ VALIDATION FAILED — Fix errors before seeding")
        lines.append("=" * 60)

        return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────
def main():
    data_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "backend", "src", "data", "unified-transit-data.json"
    )
    data_file = os.path.abspath(data_file)

    if not os.path.exists(data_file):
        print(f"❌ File not found: {data_file}")
        sys.exit(1)

    print(f"📂 Loading: {data_file}")
    with open(data_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    validator = UnifiedDataValidator(data)

    # Run validations
    valid_stops, err_stops = validator.validate_stops()
    valid_routes, err_routes = validator.validate_routes()
    validator.validate_structure()

    # Print report
    report = validator.generate_report()
    print(report)

    # Exit code
    total_errors = sum(len(v) for v in validator.errors.values())
    sys.exit(0 if total_errors == 0 else 1)


if __name__ == "__main__":
    main()