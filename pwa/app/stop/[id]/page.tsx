"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Bus, Phone, Share2, Star, Navigation, Clock, ArrowRight } from "lucide-react";
import type { Stop, Route } from "@/lib/offline-db";
import { getStopById, getRoutesForStop, addFavorite, removeFavorite, isFavorite } from "@/lib/offline-db";

const typeLabels: Record<string, string> = {
  brt: "باص سريع", servees: "سرفيس", coaster: "كوستر",
  public_bus: "باص عام", complex: "مجمع", stop: "محطة",
};

export default function StopDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [stop, setStop] = useState<Stop | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) loadStop(params.id);
  }, [params.id]);

  const loadStop = async (id: string) => {
    setLoading(true);
    const s = await getStopById(id);
    if (s) {
      setStop(s);
      const r = await getRoutesForStop(id);
      setRoutes(r);
      const isFav = await isFavorite("stop", id);
      setFav(isFav);
    }
    setLoading(false);
  };

  const toggleFav = async () => {
    if (!stop) return;
    if (fav) {
      await removeFavorite("stop", stop.id);
      setFav(false);
    } else {
      await addFavorite({ type: "stop", itemId: stop.id, name: stop.name });
      setFav(true);
    }
  };

  if (loading) return <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-24 rounded-xl" />)}</div>;
  if (!stop) return <div className="p-8 text-center text-gray-400"><p>المحطة غير موجودة</p></div>;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-md p-4 border border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stop.type==="complex"?"bg-red-100 text-red-600":"bg-green-100 text-green-600"}`}>
              {stop.type==="complex"?<Navigation size={22}/>:<MapPin size={22}/>}
            </div>
            <div>
              <h1 className="text-lg font-bold">{stop.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{stop.governorate}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-droob-primary/10 text-droob-primary">{typeLabels[stop.type]||stop.type}</span>
              </div>
            </div>
          </div>
          <button onClick={toggleFav} className="p-2 tap-target">
            <Star size={22} className={fav?"fill-droob-secondary text-droob-secondary":"text-gray-300"}/>
          </button>
        </div>

        {/* Coordinates */}
        <div className="mt-3 bg-gray-50 rounded-xl p-3 ltr text-left text-sm">
          <span className="text-gray-500">📍</span> {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`}
           target="_blank" rel="noopener"
           className="flex items-center gap-2 bg-white rounded-xl p-3 border shadow-sm tap-target hover:shadow-md">
          <Navigation size={18} className="text-blue-600"/><span className="text-sm font-medium">اتجاهات</span>
        </a>
        <button onClick={() => {navigator.share?.({title:stop.name,url:`https://droob.app/stop/${stop.id}`}).catch(()=>{})}}
                className="flex items-center gap-2 bg-white rounded-xl p-3 border shadow-sm tap-target hover:shadow-md">
          <Share2 size={18} className="text-green-600"/><span className="text-sm font-medium">مشاركة</span>
        </button>
      </div>

      {/* Routes at this stop */}
      <div>
        <h2 className="font-bold text-base mb-2 flex items-center gap-2"><Bus size={18}/> المسارات من هذه المحطة</h2>
        {routes.length===0 ? (
          <p className="text-sm text-gray-400 text-center py-6">لا توجد مسارات مسجلة</p>
        ) : (
          <div className="space-y-2">
            {routes.slice(0,20).map(r=>(
              <Link key={r.id} href={`/route/${r.id}`}
                    className="flex items-center justify-between bg-white rounded-xl p-3 border shadow-sm tap-target hover:shadow-md active:scale-[0.98] transition">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{r.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{r.from} → {r.to}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.type==="brt"?"bg-blue-100 text-blue-600":r.type==="servees"?"bg-orange-100 text-orange-600":r.type==="coaster"?"bg-purple-100 text-purple-600":"bg-green-100 text-green-700"}`}>
                    {typeLabels[r.type]||r.type}
                  </span>
                  <ArrowRight size={16} className="text-gray-300"/>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}