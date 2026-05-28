"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MapPin, Bus, Navigation, RefreshCw, WifiOff, Star } from "lucide-react";
import type { Stop } from "@/lib/offline-db";
import { getAllStops, syncStops, getLastSyncTime } from "@/lib/offline-db";
import { fetchAllStops } from "@/lib/api";

/** Governorate names in Arabic */
const GOVERNORATES = [
  "العاصمة",
  "اربد",
  "الزرقاء",
  "البلقاء",
  "الكرك",
  "الطفيلة",
  "العقبة",
  "جرش",
  "عجلون",
  "مأدبا",
  "المفرق",
  "معان",
];

export default function HomePage() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [filteredStops, setFilteredStops] = useState<Stop[]>([]);
  const [selectedGov, setSelectedGov] = useState<string>("الكل");
  const [selectedType, setSelectedType] = useState<string>("الكل");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load data (offline-first)
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // First try offline DB
      const cached = await getAllStops();
      if (cached.length > 0) {
        setStops(cached);
        setFilteredStops(cached);
      }

      // Then try to fetch fresh data
      if (navigator.onLine) {
        const fresh = await fetchAllStops();
        if (fresh.length > 0) {
          const mapped: Stop[] = fresh.map((s) => ({
            id: s.id,
            name: s.name,
            nameEn: s.name_en,
            governorate: s.governorate,
            lat: s.lat,
            lng: s.lng,
            type: s.type as Stop["type"],
            category: s.category,
          }));
          await syncStops(mapped);
          setStops(mapped);
          applyFilters(mapped, selectedGov, selectedType);
        }
      }

      const syncTime = await getLastSyncTime();
      setLastSync(syncTime);
    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const fresh = await fetchAllStops();
      if (fresh.length > 0) {
        const mapped: Stop[] = fresh.map((s) => ({
          id: s.id,
          name: s.name,
          nameEn: s.name_en,
          governorate: s.governorate,
          lat: s.lat,
          lng: s.lng,
          type: s.type as Stop["type"],
          category: s.category,
        }));
        await syncStops(mapped);
        setStops(mapped);
        applyFilters(mapped, selectedGov, selectedType);
        const syncTime = await getLastSyncTime();
        setLastSync(syncTime);
      }
    } catch {
      // Offline — keep cached data
    } finally {
      setSyncing(false);
    }
  };

  const applyFilters = useCallback(
    (all: Stop[], gov: string, type: string) => {
      let filtered = all;
      if (gov !== "الكل") {
        filtered = filtered.filter((s) => s.governorate === gov);
      }
      if (type !== "الكل") {
        filtered = filtered.filter((s) => s.type === type);
      }
      setFilteredStops(filtered);
    },
    []
  );

  const handleGovFilter = (gov: string) => {
    setSelectedGov(gov);
    applyFilters(stops, gov, selectedType);
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
    applyFilters(stops, selectedGov, type);
  };

  const typeCounts = (t: string) =>
    t === "الكل" ? stops.length : stops.filter((s) => s.type === t).length;

  // Transport type labels
  const typeLabels: Record<string, string> = {
    brt: "باص سريع",
    servees: "سرفيس",
    coaster: "كوستر",
    public_bus: "باص عام",
    complex: "مجمع",
    stop: "محطة",
  };

  return (
    <div className="p-4 space-y-4">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2 flex items-center gap-2 text-amber-800 text-sm">
          <WifiOff size={16} />
          <span>أنت غير متصل بالإنترنت — البيانات المخزنة محلياً</span>
        </div>
      )}

      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">المحطات والمجمعات</h2>
          <p className="text-xs text-gray-500">
            {filteredStops.length} من {stops.length} محطة
            {lastSync && (
              <span className="mx-1">
                · آخر تحديث:{" "}
                {new Date(lastSync).toLocaleDateString("ar-JO", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || !isOnline}
          className="flex items-center gap-1 px-3 py-2 bg-droob-primary text-white rounded-xl text-sm font-medium
                     active:scale-95 transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Governorate filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {["الكل", ...GOVERNORATES].map((gov) => {
          const count = gov === "الكل" ? stops.length : stops.filter((s) => s.governorate === gov).length;
          return (
            <button
              key={gov}
              onClick={() => handleGovFilter(gov)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium tap-target
                flex items-center gap-1 transition active:scale-95
                ${selectedGov === gov
                  ? "bg-droob-primary text-white shadow"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-droob-primary"}`}
            >
              {gov}
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {["الكل", "brt", "servees", "coaster", "public_bus", "complex"].map((type) => (
          <button
            key={type}
            onClick={() => handleTypeFilter(type)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium tap-target
              transition active:scale-95
              ${selectedType === type
                ? "bg-droob-secondary text-gray-900 shadow"
                : "bg-white text-gray-600 border border-gray-200 hover:border-droob-secondary"}`}
          >
            {typeLabels[type] || type}
            <span className="opacity-70 mr-1">({typeCounts(type)})</span>
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      )}

      {/* Stops list */}
      {!loading && (
        <div className="space-y-2">
          {filteredStops.slice(0, 100).map((stop) => (
            <Link
              key={stop.id}
              href={`/stop/${stop.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-3
                         hover:shadow-md hover:border-droob-primary/30 active:scale-[0.98]
                         transition cursor-pointer tap-target"
            >
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${stop.type === "brt" ? "bg-blue-100 text-blue-600"
                    : stop.type === "servees" ? "bg-orange-100 text-orange-600"
                    : stop.type === "coaster" ? "bg-purple-100 text-purple-600"
                    : stop.type === "public_bus" ? "bg-green-100 text-green-700"
                    : stop.type === "complex" ? "bg-red-100 text-red-600"
                    : "bg-gray-100 text-gray-600"}`}
                >
                  {stop.type === "complex" ? (
                    <Navigation size={18} />
                  ) : (
                    <MapPin size={18} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{stop.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100">
                      {stop.governorate}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-white text-[10px]
                        ${stop.type === "brt" ? "badge-brt"
                        : stop.type === "servees" ? "badge-servees"
                        : stop.type === "coaster" ? "badge-coaster"
                        : stop.type === "public_bus" ? "badge-public-bus"
                        : "bg-gray-500"}`}
                    >
                      {typeLabels[stop.type] || stop.type}
                    </span>
                    {stop.category && (
                      <span className="text-gray-400">· {stop.category}</span>
                    )}
                  </div>
                  {/* Coordinates — ltr */}
                  <div className="text-[10px] text-gray-400 mt-1 ltr text-left">
                    {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {filteredStops.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <MapPin size={48} className="mx-auto mb-3 opacity-30" />
              <p>لا توجد محطات مطابقة لهذا الفلتر</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}