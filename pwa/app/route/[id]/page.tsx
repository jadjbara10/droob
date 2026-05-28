"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Bus, Star, Share2, Navigation, ArrowDown, ArrowUp, Clock, Route } from "lucide-react";
import type { Route as RouteType, Stop } from "@/lib/offline-db";
import { getRouteById, getStopsForRoute, addFavorite, removeFavorite, isFavorite } from "@/lib/offline-db";

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

const typeColorsDot: Record<string, string> = {
  brt: "bg-blue-500",
  servees: "bg-orange-500",
  coaster: "bg-purple-500",
  public_bus: "bg-green-500",
};

export default function RouteDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<RouteType | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showStops, setShowStops] = useState(false);

  useEffect(() => {
    if (params.id) loadRoute(params.id);
  }, [params.id]);

  const loadRoute = async (id: string) => {
    setLoading(true);
    const r = await getRouteById(id);
    if (r) {
      setRoute(r);
      const s = await getStopsForRoute(id);
      setStops(s);
      const isFav = await isFavorite("route", id);
      setFav(isFav);
    }
    setLoading(false);
  };

  const toggleFav = async () => {
    if (!route) return;
    if (fav) {
      await removeFavorite("route", route.id);
      setFav(false);
    } else {
      await addFavorite({ type: "route", itemId: route.id, name: route.name });
      setFav(true);
    }
  };

  if (loading)
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    );
  if (!route)
    return (
      <div className="p-8 text-center text-gray-400">
        <p>المسار غير موجود</p>
      </div>
    );

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        {/* Type badge & favorite */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium border ${
              typeColors[route.type] || "bg-gray-100 text-gray-600 border-gray-300"
            }`}
          >
            {typeLabels[route.type] || route.type}
          </span>
          <button onClick={toggleFav} className="p-2 tap-target">
            <Star
              size={22}
              className={fav ? "fill-droob-secondary text-droob-secondary" : "text-gray-300"}
            />
          </button>
        </div>

        {/* Route name */}
        <h1 className="text-xl font-bold mb-3">{route.name}</h1>

        {/* From → To */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 bg-green-50 rounded-lg px-3 py-2 flex-1 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{route.from}</span>
          </div>
          <ArrowDown size={16} className="text-gray-300 flex-shrink-0 -rotate-90" />
          <div className="flex items-center gap-1.5 bg-red-50 rounded-lg px-3 py-2 flex-1 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{route.to}</span>
          </div>
        </div>

        {/* Meta info grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">المحافظة</p>
            <p className="text-sm font-bold">{route.governorate}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 mb-0.5">عدد المحطات</p>
            <p className="text-sm font-bold">{stops.length} محطة</p>
          </div>
          {route.distanceKm && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-0.5">المسافة</p>
              <p className="text-sm font-bold">{route.distanceKm} كم</p>
            </div>
          )}
          {route.travelTimeMin && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-0.5">مدة الرحلة</p>
              <p className="text-sm font-bold">~{route.travelTimeMin} دقيقة</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${route.from}`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 bg-white rounded-xl p-3 border shadow-sm tap-target hover:shadow-md"
        >
          <Navigation size={18} className="text-blue-600" />
          <span className="text-sm font-medium">اتجاهات</span>
        </a>
        <button
          onClick={() => {
            navigator.share?.({ title: route.name, url: `https://droob.app/route/${route.id}` }).catch(() => {});
          }}
          className="flex items-center gap-2 bg-white rounded-xl p-3 border shadow-sm tap-target hover:shadow-md"
        >
          <Share2 size={18} className="text-green-600" />
          <span className="text-sm font-medium">مشاركة</span>
        </button>
      </div>

      {/* Stops timeline */}
      <div>
        <button
          onClick={() => setShowStops(!showStops)}
          className="w-full flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border tap-target"
        >
          <div className="flex items-center gap-2">
            <Route size={18} className="text-droob-primary" />
            <span className="font-bold">المحطات ({stops.length})</span>
          </div>
          {showStops ? <ArrowUp size={18} className="text-gray-400" /> : <ArrowDown size={18} className="text-gray-400" />}
        </button>

        {showStops && stops.length > 0 && (
          <div className="mt-2 bg-white rounded-xl shadow-sm border overflow-hidden">
            {stops.map((stop, idx) => (
              <Link
                key={stop.id}
                href={`/stop/${stop.id}`}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 tap-target border-b border-gray-50 last:border-b-0"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${typeColorsDot[route.type] || "bg-gray-400"}`} />
                  {idx < stops.length - 1 && <div className="w-0.5 h-6 bg-gray-200 mt-0.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{stop.name}</p>
                  <p className="text-[10px] text-gray-400">{stop.governorate}</p>
                </div>

                <div className="flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    المحطة {idx + 1}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {showStops && stops.length === 0 && (
          <div className="mt-2 bg-white rounded-xl p-8 text-center text-gray-400">
            <MapPin size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد محطات مسجلة</p>
          </div>
        )}
      </div>

      {/* Extra space for bottom nav */}
      <div className="h-4" />
    </div>
  );
}