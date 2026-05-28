#!/usr/bin/env python3
"""
دروب Geocoding Enrichment
--------------------------
Enriches unified-transit-data.json with reverse-geocoded governorate/city
information using coordinate-based lookup against known Jordan boundaries.

Also generates:
  - stop_city mapping (which city each stop belongs to)
  - stop_governorate verification (cross-reference)
  - nearest landmark data for key stops

Usage: python geocode_enrichment.py [input_file] [output_file]
"""

import json
import os
import sys
from typing import Dict, List, Optional, Tuple

# ─── Jordan City/Governorate Boundaries ─────────────────────────────────
# Each entry: (name_ar, name_en, lat_min, lat_max, lng_min, lng_max)
JORDAN_GOVERNORATES = [
    ("العاصمة", "Amman",          31.70, 32.12, 35.75, 36.10),
    ("اربد", "Irbid",              32.30, 32.75, 35.65, 36.10),
    ("الزرقاء", "Zarqa",           31.85, 32.25, 35.85, 36.40),
    ("البلقاء", "Balqa",           31.75, 32.25, 35.55, 35.85),
    ("الكرك", "Karak",             31.00, 31.40, 35.55, 36.00),
    ("الطفيلة", "Tafilah",         30.60, 31.00, 35.30, 35.70),
    ("معان", "Maan",          29.80, 30.60, 35.40, 36.60),
    ("العقبة", "Aqaba",            29.30, 30.10, 34.90, 35.60),
    ("المفرق", "Mafraq",           32.00, 32.60, 36.00, 38.00),
    ("جرش", "Jerash",              32.15, 32.40, 35.80, 36.00),
    ("عجلون", "Ajloun",            32.20, 32.45, 35.65, 35.85),
    ("مادبا", "Madaba",            31.50, 31.85, 35.60, 35.95),
]

# ─── Amman District Boundaries (sub-city level) ─────────────────────────
AMMAN_DISTRICTS = [
    ("وسط البلد", "Downtown",               31.950, 31.958, 35.930, 35.942),
    ("العبدلي", "Abdali",                   31.958, 31.970, 35.905, 35.920),
    ("جبل عمان", "Jabal Amman",             31.945, 31.960, 35.920, 35.935),
    ("الشفا بدران", "Shafa Badran",         32.050, 32.100, 35.870, 35.920),
    ("صويلح", "Sweileh",                    32.010, 32.050, 35.840, 35.880),
    ("طبربور", "Tabarbour",                 31.990, 32.020, 35.910, 35.940),
    ("الجبيهة", "Jubeiha",                  32.010, 32.040, 35.860, 35.890),
    ("تلاع العلي", "Tlaa Al Ali",           31.985, 32.005, 35.850, 35.870),
    ("الجامعة الأردنية", "University of Jordan", 31.995, 32.015, 35.865, 35.885),
    ("خلدا", "Khalda",                      31.975, 31.995, 35.845, 35.865),
    ("دابوق", "Dabouq",                     31.950, 31.975, 35.820, 35.850),
    ("عبدون", "Abdoun",                     31.940, 31.960, 35.875, 35.895),
    ("الصويفية", "Sweifieh",                31.930, 31.945, 35.865, 35.882),
    ("الرابية", "Rabieh",                   31.975, 31.995, 35.910, 35.930),
    ("المدينة الرياضية", "Sports City",     31.985, 32.005, 35.895, 35.912),
    ("المقابلين", "Muqabalein",             31.910, 31.935, 35.890, 35.915),
    ("ماركا", "Marka",                      31.970, 32.005, 35.950, 35.990),
    ("رأس العين", "Ras Al Ain",             31.945, 31.955, 35.940, 35.955),
    ("المهاجرين", "Muhajireen",             31.960, 31.975, 35.930, 35.945),
    ("القويسمة", "Qweismeh",                31.900, 31.920, 35.925, 35.945),
    ("أبو علندا", "Abu Alanda",             31.885, 31.905, 35.930, 35.950),
    ("وادي السير", "Wadi Al Seer",          31.930, 31.960, 35.810, 35.840),
    ("مرج الحمام", "Marj Al Hamam",         31.920, 31.945, 35.805, 35.830),
    ("البيادر", "Bayader",                  31.910, 31.930, 35.820, 35.845),
    ("ناعور", "Naur",                       31.870, 31.900, 35.800, 35.830),
]

IRBID_DISTRICTS = [
    ("وسط مدينة اربد", "Irbid Downtown",    32.550, 32.560, 35.845, 35.860),
    ("الحصن", "Al Husn",                    32.490, 32.510, 35.870, 35.890),
    ("الرمثا", "Ramtha",                    32.560, 32.580, 36.000, 36.020),
    ("المغير", "Mughayyir",                 32.420, 32.440, 35.880, 35.900),
]

ZARQA_DISTRICTS = [
    ("وسط مدينة الزرقاء", "Zarqa Downtown", 32.080, 32.100, 36.080, 36.105),
    ("الرصيفة", "Ruseifa",                  32.030, 32.050, 36.030, 36.050),
    ("الهاشمية", "Hashimiya",               32.120, 32.140, 36.080, 36.100),
]

# ─── Main Geocoding Class ───────────────────────────────────────────────
class GeocodingEnricher:
    def __init__(self, data: dict):
        self.data = data
        self.stops = data.get("stops", {})
        self.routes = data.get("routes", {})
        self.enrichment_stats = {
            "governorate_corrected": 0,
            "district_added": 0,
            "city_added": 0,
            "total_stops": 0,
            "total_routes": 0,
        }

    def find_governorate(self, lat: float, lng: float) -> Tuple[str, str]:
        """Find governorate by coordinates. Returns (ar_name, en_name)."""
        for name_ar, name_en, lat_min, lat_max, lng_min, lng_max in JORDAN_GOVERNORATES:
            if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
                return (name_ar, name_en)
        return ("غير معروف", "Unknown")

    def find_district(self, lat: float, lng: float, gov_ar: str) -> Tuple[str, str]:
        """Find district/city within a governorate. Returns (ar_name, en_name)."""
        districts_map = {
            "العاصمة": AMMAN_DISTRICTS,
            "اربد": IRBID_DISTRICTS,
            "الزرقاء": ZARQA_DISTRICTS,
        }
        districts = districts_map.get(gov_ar, [])
        for name_ar, name_en, lat_min, lat_max, lng_min, lng_max in districts:
            if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
                return (name_ar, name_en)
        return ("", "")

    def enrich_stops(self):
        """Add governorate_verified, district, and city fields to all stops."""
        all_stops_enriched = {}
        total_enriched = 0

        for trans_type, stops in self.stops.items():
            enriched_stops = []
            for s in stops:
                lat = s.get("lat")
                lng = s.get("lng")

                if lat is not None and lng is not None:
                    gov_ar, gov_en = self.find_governorate(lat, lng)

                    # Verify/correct governorate
                    existing_gov = s.get("governorate_ar", "")
                    if existing_gov and existing_gov != gov_ar and gov_ar != "غير معروف":
                        s["governorate_ar"] = gov_ar
                        s["governorate_en"] = gov_en
                        self.enrichment_stats["governorate_corrected"] += 1
                    elif not existing_gov:
                        s["governorate_ar"] = gov_ar
                        s["governorate_en"] = gov_en

                    # Add district
                    district_ar, district_en = self.find_district(lat, lng, gov_ar)
                    if district_ar:
                        s["district_ar"] = district_ar
                        s["district_en"] = district_en
                        self.enrichment_stats["district_added"] += 1

                    # Add city (same as governorate capital for simplicity)
                    s["city_ar"] = gov_ar
                    s["city_en"] = gov_en
                    self.enrichment_stats["city_added"] += 1

                enriched_stops.append(s)
                total_enriched += 1

            all_stops_enriched[trans_type] = enriched_stops

        self.stops = all_stops_enriched
        self.enrichment_stats["total_stops"] = total_enriched

    def enrich_routes(self):
        """Add governorate/city info to routes based on their path centroids."""
        total_enriched = 0

        for trans_type, routes in self.routes.items():
            for r in routes:
                path = r.get("path", [])
                if path and len(path) > 0:
                    # Calculate centroid of path
                    avg_lat = sum(pt[1] for pt in path if len(pt) >= 2) / len(path)
                    avg_lng = sum(pt[0] for pt in path if len(pt) >= 2) / len(path)

                    gov_ar, gov_en = self.find_governorate(avg_lat, avg_lng)

                    existing_gov = r.get("governorate_ar", "")
                    if existing_gov and existing_gov != gov_ar and gov_ar != "غير معروف":
                        r["governorate_ar"] = gov_ar
                        r["governorate_en"] = gov_en
                    elif not existing_gov:
                        r["governorate_ar"] = gov_ar
                        r["governorate_en"] = gov_en

                    r["city_ar"] = gov_ar
                    r["city_en"] = gov_en

                total_enriched += 1

        self.enrichment_stats["total_routes"] = total_enriched

    def update_statistics(self):
        """Recalculate statistics after enrichment."""
        stats = self.data.get("statistics", {})

        # Recalculate governorate distribution
        gov_dist = {}
        for trans_type, stops in self.stops.items():
            for s in stops:
                gov = s.get("governorate_ar", "غير معروف")
                if gov not in gov_dist:
                    gov_dist[gov] = {"stops": 0, "routes": 0}
                gov_dist[gov]["stops"] += 1

        for trans_type, routes in self.routes.items():
            for r in routes:
                gov = r.get("governorate_ar", "غير معروف")
                if gov not in gov_dist:
                    gov_dist[gov] = {"stops": 0, "routes": 0}
                gov_dist[gov]["routes"] += 1

        stats["governorates"] = gov_dist
        stats["enrichment"] = {
            "governorate_corrected": self.enrichment_stats["governorate_corrected"],
            "district_added": self.enrichment_stats["district_added"],
            "city_added": self.enrichment_stats["city_added"],
            "geocoding_timestamp": __import__("datetime").datetime.now().isoformat(),
        }

        self.data["statistics"] = stats

    def to_output(self) -> dict:
        """Return enriched data dict."""
        self.data["stops"] = self.stops
        self.data["routes"] = self.routes
        return self.data


# ─── Main ────────────────────────────────────────────────────────────────
def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "backend", "src", "data", "unified-transit-data.json"
    )
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file  # Overwrite by default
    input_file = os.path.abspath(input_file)
    output_file = os.path.abspath(output_file)

    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)

    print(f"📂 Loading: {input_file}")
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("🗺️  Running geocoding enrichment...")
    enricher = GeocodingEnricher(data)
    enricher.enrich_stops()
    enricher.enrich_routes()
    enricher.update_statistics()

    # Save
    print(f"💾 Saving enriched data to: {output_file}")
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(enricher.to_output(), f, ensure_ascii=False, indent=2)

    # Report
    stats = enricher.enrichment_stats
    print("\n" + "=" * 60)
    print("📊 Geocoding Enrichment Report")
    print("=" * 60)
    print(f"   Total stops processed:     {stats['total_stops']}")
    print(f"   Total routes processed:    {stats['total_routes']}")
    print(f"   Governorates corrected:    {stats['governorate_corrected']}")
    print(f"   Districts added:           {stats['district_added']}")
    print(f"   Cities added:               {stats['city_added']}")
    print("=" * 60)
    print("✅ Geocoding enrichment complete!")


if __name__ == "__main__":
    main()