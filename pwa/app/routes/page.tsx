"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bus, MapPin, ArrowLeftRight, Search } from "lucide-react";
import type { Route } from "@/lib/offline-db";
import { getAllRoutes, syncRoutes } from "@/lib/offline-db";
import { fetchAllRoutes } from "@/lib/api";

const typeLabels: Record<string, string> = {
  brt: "باص سريع",
  servees: "سرفيس",
  coaster: "كوستر",
  public_bus: "باص عام",
};

const typeColors: Record<string, string> = {
  brt: "bg-blue-100 text-blue-600 border-blue-300",
  servees: "bg-orange-100 text-orange-600 border-orange-300",
  coaster: "bg-purple-100 text-purple-600 border-purple-300",
  public_bus: "bg-green-100 text-green-700 border-green-300",
};

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filtered, setFiltered] = useState<Route[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("الكل");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const cached = await getAllRoutes();
      if (cached.length > 0) {
        setRoutes(cached);
        applyFilters(cached, search, typeFilter);
      }
      if (navigator.onLine) {
        const fresh = await fetchAllRoutes();
        if (fresh.length > 0) {
          const mapped: Route[] = fresh.map((r) => ({
            id: r.id,
            name: r.name,
            nameEn: r.name_en,
            from: r.from_name || r.from_stop_id,
            to: r.to_name || r.to_stop_id,
            type: r.type as Route["type"],
            governorate: r.governorate,
            stops: r.stops || [],
            geometry: r.geometry,
            distanceKm: r.distance_km,
            travelTimeMin: r.travel_time_min,
          }));
          await syncRoutes(mapped);
          setRoutes(mapped);
          applyFilters(mapped, search, typeFilter);
        }
      }
    } catch (err) {
      console.error("Load routes error:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (all: Route[], q: string, type: string) => {
    let f = all;
    if (q.trim()) {
      const qt = q.toLowerCase().trim();
      f = f.filter(
        (r) =>
          r.name.toLowerCase().includes(qt) ||
          (r.nameEn || "").toLowerCase().includes(qt) ||
          r.from.toLowerCase().includes(qt) ||
          r.to.toLowerCase().includes(qt) ||
          r.governorate.toLowerCase().includes(qt)
      );
    }
    if (type !== "الكل") {
      f = f.filter((r) => r.type === type);
    }
    setFiltered(f);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold">مسارات الحافلات</h2>

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="ابحث عن مسار... (مثلاً: عمان-اربد)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            applyFilters(routes, e.target.value, typeFilter);
          }}
          className="w-full pr-10 pl-4 py-3 rounded-xl border border-gray-200 bg-white
                     text-sm focus:border-droob-primary focus:ring-2 focus:ring-droob-primary/20
                     outline-none transition"
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["الكل", "brt", "servees", "coaster", "public_bus"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTypeFilter(t);
              applyFilters(routes, search, t);
            }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium tap-target
              transition active:scale-95
              ${typeFilter === t
                ? "bg-droob-primary text-white shadow"
                : "bg-white text-gray-600 border border-gray-200"}`}
          >
            {typeLabels[t] || t}
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500">
        {filtered.length} مسار
      </p>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      )}

      {/* Routes list */}
      {!loading && (
        <div className="space-y-3">
          {filtered.slice(0, 100).map((route) => (
            <Link
              key={route.id}
              href={`/route/${route.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4
                         hover:shadow-md active:scale-[0.98] transition tap-target"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm truncate flex-1">{route.name}</h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium border
                    ${typeColors[route.type] || "bg-gray-100 text-gray-600 border-gray-300"}`}
                >
                  {typeLabels[route.type] || route.type}
                </span>
              </div>

              {/* From → To */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 flex-1 min-w-0">
                  <MapPin size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{route.from}</span>
                </div>
                <ArrowLeftRight size={16} className="text-gray-300 flex-shrink-0" />
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 flex-1 min-w-0">
                  <MapPin size={14} className="text-red-600 flex-shrink-0" />
                  <span className="text-xs font-medium truncate">{route.to}</span>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="px-2 py-0.5 rounded-full bg-gray-50">
                  {route.governorate}
                </span>
                <span>·</span>
                <span>{route.stops.length} محطة</span>
                {route.distanceKm && (
                  <>
                    <span>·</span>
                    <span className="ltr">{route.distanceKm} كم</span>
                  </>
                )}
                {route.travelTimeMin && (
                  <>
                    <span>·</span>
                    <span className="ltr">~{route.travelTimeMin} د</span>
                  </>
                )}
              </div>
            </Link>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <Bus size={48} className="mx-auto mb-3 opacity-30" />
              <p>لا توجد مسارات مطابقة</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}