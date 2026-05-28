"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, MapPin, Bus, Trash2, Navigation, ArrowDown } from "lucide-react";
import type { Favorite, Stop, Route } from "@/lib/offline-db";
import { getAllFavorites, removeFavorite, getStopById, getRouteById } from "@/lib/offline-db";

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

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [stops, setStops] = useState<Map<string, Stop>>(new Map());
  const [routes, setRoutes] = useState<Map<string, Route>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    setLoading(true);
    const favs = await getAllFavorites();
    favs.sort((a, b) => b.addedAt - a.addedAt); // newest first
    setFavorites(favs);

    // Load details for each favorite
    const stopMap = new Map<string, Stop>();
    const routeMap = new Map<string, Route>();

    for (const fav of favs) {
      if (fav.type === "stop") {
        const stop = await getStopById(fav.itemId);
        if (stop) stopMap.set(fav.itemId, stop);
      } else {
        const route = await getRouteById(fav.itemId);
        if (route) routeMap.set(fav.itemId, route);
      }
    }
    setStops(stopMap);
    setRoutes(routeMap);
    setLoading(false);
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (fav: Favorite) => {
    await removeFavorite(fav.type, fav.itemId);
    await loadFavorites();
  };

  const favStops = favorites.filter((f) => f.type === "stop");
  const favRoutes = favorites.filter((f) => f.type === "route");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">المفضلة</h2>
        <span className="text-xs text-gray-400">{favorites.length} عنصر</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && favorites.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Star size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1">لا توجد مفضلة</p>
          <p className="text-sm mb-4">
            أضف محطات ومسارات للمفضلة بالضغط على ⭐
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium
                         hover:border-droob-primary hover:text-droob-primary active:scale-95 transition"
            >
              تصفح المحطات
            </Link>
            <Link
              href="/routes"
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium
                         hover:border-droob-primary hover:text-droob-primary active:scale-95 transition"
            >
              تصفح المسارات
            </Link>
          </div>
        </div>
      )}

      {/* Routes favorites */}
      {favRoutes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
            <Bus size={16} />
            المسارات ({favRoutes.length})
          </h3>
          <div className="space-y-2">
            {favRoutes.map((fav) => {
              const route = routes.get(fav.itemId);
              return (
                <div
                  key={fav.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {route ? (
                    <Link
                      href={`/route/${route.id}`}
                      className="block p-3 hover:bg-gray-50 active:bg-gray-100 transition"
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
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                            <span className="text-green-600 font-medium">{route.from}</span>
                            <ArrowDown size={10} className="-rotate-90" />
                            <span className="text-red-500 font-medium">{route.to}</span>
                            <span className="mx-1 text-gray-300">·</span>
                            <span>{route.governorate}</span>
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
                  ) : (
                    <div className="p-3 flex items-center gap-3 text-gray-400">
                      <Bus size={18} />
                      <span className="text-sm">{fav.name}</span>
                      <span className="text-[10px]">(محذوف)</span>
                    </div>
                  )}
                  {/* Remove button */}
                  <div className="border-t border-gray-50 px-3 py-1.5 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove(fav);
                      }}
                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600
                                 active:scale-95 transition px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                      إزالة
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stops favorites */}
      {favStops.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-1.5">
            <MapPin size={16} />
            المحطات ({favStops.length})
          </h3>
          <div className="space-y-2">
            {favStops.map((fav) => {
              const stop = stops.get(fav.itemId);
              return (
                <div
                  key={fav.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {stop ? (
                    <Link
                      href={`/stop/${stop.id}`}
                      className="block p-3 hover:bg-gray-50 active:bg-gray-100 transition"
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
                      </div>
                    </Link>
                  ) : (
                    <div className="p-3 flex items-center gap-3 text-gray-400">
                      <MapPin size={18} />
                      <span className="text-sm">{fav.name}</span>
                      <span className="text-[10px]">(محذوف)</span>
                    </div>
                  )}
                  {/* Remove button */}
                  <div className="border-t border-gray-50 px-3 py-1.5 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemove(fav);
                      }}
                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600
                                 active:scale-95 transition px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                      إزالة
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}