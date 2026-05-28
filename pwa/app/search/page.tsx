"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, MapPin, Bus, X, Clock, Navigation } from "lucide-react";
import type { Stop, Route } from "@/lib/offline-db";
import { searchStops, searchRoutes } from "@/lib/offline-db";

const typeLabels: Record<string, string> = {
  brt: "باص سريع",
  servees: "سرفيس",
  coaster: "كوستر",
  public_bus: "باص عام",
  complex: "مجمع",
  stop: "محطة",
};

const typeColors: Record<string, string> = {
  brt: "bg-blue-100 text-blue-600",
  servees: "bg-orange-100 text-orange-600",
  coaster: "bg-purple-100 text-purple-600",
  public_bus: "bg-green-100 text-green-700",
  complex: "bg-red-100 text-red-600",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setStops([]);
      setRoutes([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    const [s, r] = await Promise.all([searchStops(q), searchRoutes(q)]);
    setStops(s);
    setRoutes(r);
    setSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const clearSearch = () => {
    setQuery("");
    setStops([]);
    setRoutes([]);
    setHasSearched(false);
  };

  const totalResults = stops.length + routes.length;

  return (
    <div className="p-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={20}
          className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن محطة، مسار، مدينة..."
          className="w-full bg-white border border-gray-200 rounded-2xl py-3 pr-10 pl-10
                     text-sm placeholder:text-gray-400 focus:outline-none focus:border-droob-primary
                     focus:ring-2 focus:ring-droob-primary/20 transition shadow-sm"
          autoFocus
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute top-1/2 -translate-y-1/2 left-3 p-1 text-gray-400 hover:text-gray-600
                       active:scale-90 transition"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search stats */}
      {hasSearched && !searching && (
        <p className="text-xs text-gray-400 -mt-2">
          {totalResults} نتيجة ({stops.length} محطة · {routes.length} مسار)
        </p>
      )}

      {/* Loading */}
      {searching && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state — no query yet */}
      {!hasSearched && !searching && (
        <div className="text-center py-16 text-gray-400">
          <Search size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">ابحث عن أي شيء</p>
          <p className="text-sm">
            اسم المحطة، الخط، المحافظة، نوع النقل...
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["باص سريع", "العاصمة", "عمان", "اربد", "كوستر", "سرفيس"].map(
              (hint) => (
                <button
                  key={hint}
                  onClick={() => setQuery(hint)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs
                             text-gray-600 hover:border-droob-primary hover:text-droob-primary
                             active:scale-95 transition"
                >
                  {hint}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* No results */}
      {hasSearched && !searching && totalResults === 0 && (
        <div className="text-center py-16 text-gray-400">
          <X size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium mb-1">لا توجد نتائج</p>
          <p className="text-sm">جرب كلمة بحث مختلفة</p>
        </div>
      )}

      {/* Results */}
      {hasSearched && totalResults > 0 && (
        <div className="space-y-4">
          {/* Routes first */}
          {routes.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                <Bus size={16} />
                المسارات
              </h3>
              <div className="space-y-2">
                {routes.map((route) => (
                  <Link
                    key={route.id}
                    href={`/route/${route.id}`}
                    className="block bg-white rounded-xl shadow-sm border border-gray-100 p-3
                               hover:shadow-md hover:border-droob-primary/30 active:scale-[0.98]
                               transition cursor-pointer tap-target"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                          ${typeColors[route.type] || "bg-gray-100 text-gray-600"}`}
                      >
                        <Bus size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{route.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                          <span className="text-green-600 font-medium">{route.from}</span>
                          <span className="text-gray-300">→</span>
                          <span className="text-red-500 font-medium">{route.to}</span>
                          <span className="mx-1 text-gray-300">·</span>
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100">
                            {route.governorate}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0
                          ${typeColors[route.type] || "bg-gray-100 text-gray-500"}`}
                      >
                        {typeLabels[route.type] || route.type}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stops */}
          {stops.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
                <MapPin size={16} />
                المحطات
              </h3>
              <div className="space-y-2">
                {stops.map((stop) => (
                  <Link
                    key={stop.id}
                    href={`/stop/${stop.id}`}
                    className="block bg-white rounded-xl shadow-sm border border-gray-100 p-3
                               hover:shadow-md hover:border-droob-primary/30 active:scale-[0.98]
                               transition cursor-pointer tap-target"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                          ${typeColors[stop.type] || "bg-gray-100 text-gray-600"}`}
                      >
                        {stop.type === "complex" ? (
                          <Navigation size={18} />
                        ) : (
                          <MapPin size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{stop.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100">
                            {stop.governorate}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full
                              ${typeColors[stop.type] || "bg-gray-100 text-gray-500"}`}
                          >
                            {typeLabels[stop.type] || stop.type}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 ltr text-left flex-shrink-0">
                        {stop.lat.toFixed(3)}, {stop.lng.toFixed(3)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}