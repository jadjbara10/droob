"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Interactive Map Page
   Full-screen map + filter panel + CRUD controls
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Plus, Route, Trash2, Check, X, RefreshCw, Filter, Search, MapPin, Eye, EyeOff, Sparkles } from "lucide-react";
import { InteractiveMap } from "@/components/map/interactive-map";
import { MapSkeleton } from "@/components/skeleton";
import { InlineError } from "@/components/error-boundary";
import { Panel } from "@/components/panel";
import { stopsApi, routesApi, snapRouteApi, type StopRecord, type RouteRecord } from "@/lib/api";

const GOVERNORATES = ["عمان","إربد","الزرقاء","البلقاء","مادبا","الكرك","الطفيلة","معان","العقبة","جرش","عجلون","المفرق"];
const MODES = ["city_bus","brt","serveece","intercity"];
const MODE_LABELS: Record<string,string> = {city_bus:"حافلة",brt:"باص سريع",serveece:"سرفيس",intercity:"بين المدن"};

type EditingMode = "none" | "add-stop" | "draw-route";

export default function MapPage() {
  const [allStops, setAllStops] = useState<StopRecord[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteRecord[]>([]);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [filterGov, setFilterGov] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [filterTerminal, setFilterTerminal] = useState("all"); // all | terminal | stop
  const [filterActive, setFilterActive] = useState("all"); // all | active | inactive
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Map state
  const [editingMode, setEditingMode] = useState<EditingMode>("none");
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [selectedStop, setSelectedStop] = useState<StopRecord | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteRecord | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(false);
    try {
      const [stopsRes, routesRes, geoJSONRes] = await Promise.all([
        stopsApi.list({ limit: 300 }),
        routesApi.list({ limit: 200 }),
        fetch("https://api.droob-jo.com/api/v1/routes/geojson").then(r => r.json()),
      ]);
      setAllStops(Array.isArray(stopsRes) ? stopsRes : (stopsRes.data || []));
      setAllRoutes(Array.isArray(routesRes) ? routesRes : (routesRes.data || []));
      setRouteGeoJSON(geoJSONRes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // ── Filtered data ──
  const stops = useMemo(() => {
    return allStops.filter((s) => {
      if (filterGov !== "all" && s.governorate !== filterGov) return false;
      if (filterTerminal === "terminal" && !s.is_terminal) return false;
      if (filterTerminal === "stop" && s.is_terminal) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = s.name_ar?.toLowerCase().includes(q) || s.name_en?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q);
        if (!nameMatch) return false;
      }
      return true;
    });
  }, [allStops, filterGov, filterTerminal, searchQuery]);

  const routes = useMemo(() => {
    return allRoutes.filter((r) => {
      if (filterGov !== "all") {
        // Filter routes whose stops are in the governorate
        // For now, this is handled by stops being filtered; routes with no matching stops still show
      }
      if (filterMode !== "all" && r.mode !== filterMode) return false;
      if (filterActive === "active" && !r.is_active) return false;
      if (filterActive === "inactive" && r.is_active) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = r.name_ar?.toLowerCase().includes(q) || r.name_en?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q);
        if (!nameMatch) return false;
      }
      return true;
    });
  }, [allRoutes, filterGov, filterMode, filterActive, searchQuery]);

  // ── Handlers ──
  const handleMapClick = useCallback((latlng: { lat: number; lng: number }) => {
    if (editingMode === "add-stop") {
      const code = prompt("رمز المحطة (مثلاً AMM-001):");
      if (!code) return;
      const nameAr = prompt("اسم المحطة بالعربية:");
      if (!nameAr) return;
      const nameEn = prompt("اسم المحطة بالإنجليزية:");
      if (!nameEn) return;
      const governorate = prompt("المحافظة (مثلاً عمان):") || "عمان";
      stopsApi.create({ code, name_ar: nameAr, name_en: nameEn, lat: latlng.lat, lng: latlng.lng, governorate })
        .then(() => { fetchData(); setEditingMode("none"); })
        .catch((err) => alert(err.message));
    }
  }, [editingMode]);

  const handleDrawPoint = useCallback((latlng: [number, number]) => {
    setDrawPoints((prev) => [...prev, latlng]);
  }, []);

  const handleSnapRoute = async () => {
    if (drawPoints.length < 2) return alert("تحتاج إلى 3 نقاط على الأقل");
    try {
      const result = await snapRouteApi.snap(drawPoints);
      setDrawPoints(result.points);
      alert(`✅ تم توليد ${result.snapped_count} نقطة تتبع الطرق الحقيقية\nالمسافة: ${result.distance_km} كم | الوقت: ${result.duration_min} دقيقة`);
    } catch (err) {
      alert("❌ فشل التوليد الذكي: " + ((err as Error).message || "خطأ غير معروف"));
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المحطة؟")) return;
    try { await stopsApi.delete(stopId); setSelectedStop(null); fetchData(); }
    catch (err) { alert((err as Error).message); }
  };

  const handleStopDrag = async (stopId: string, latlng: { lat: number; lng: number }) => {
    try {
      await stopsApi.update(stopId, { lat: latlng.lat, lng: latlng.lng });
      setAllStops((prev) => prev.map((s) => s.id === stopId ? { ...s, lat: latlng.lat, lng: latlng.lng } : s));
    } catch (err) { alert((err as Error).message); }
  };

  const resetFilters = () => {
    setFilterGov("all"); setFilterMode("all"); setFilterTerminal("all"); setFilterActive("all"); setSearchQuery("");
  };

  if (error) return <InlineError message="فشل تحميل بيانات الخريطة" onRetry={fetchData} />;

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 140px)" }}>
      {/* ── Filter Panel ── */}
      {showFilters && (
        <div style={{
          width: 280, flexShrink: 0, overflow: "auto",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", marginLeft: 12,
        }}>
          <div className="panel-header">
            <span className="panel-title"><Filter size={14} style={{ verticalAlign: "middle", marginLeft: 6 }} /> الفلاتر</span>
            <button className="btn btn-xs" onClick={resetFilters}>مسح الكل</button>
          </div>
          <div style={{ padding: 12, display: "grid", gap: 10 }}>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input className="form-input" placeholder="بحث..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingRight: 28, fontSize: 12, padding: "6px 26px 6px 8px" }} />
            </div>

            {/* Governorate */}
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>المحافظة</label>
              <select className="form-select" value={filterGov} onChange={(e) => setFilterGov(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="all">جميع المحافظات</option>
                {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Mode (routes) */}
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>نوع الخط</label>
              <select className="form-select" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="all">جميع الأنواع</option>
                {MODES.map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </div>

            {/* Terminal / Stop */}
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>نوع المحطة</label>
              <select className="form-select" value={filterTerminal} onChange={(e) => setFilterTerminal(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="all">الكل</option>
                <option value="terminal">مجمعات فقط</option>
                <option value="stop">محطات فقط</option>
              </select>
            </div>

            {/* Active / Inactive */}
            <div>
              <label className="form-label" style={{ fontSize: 11 }}>حالة الخط</label>
              <select className="form-select" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="all">الكل</option>
                <option value="active">نشط</option>
                <option value="inactive">معطل</option>
              </select>
            </div>

            {/* Stats */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", display: "grid", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span><MapPin size={10} style={{ verticalAlign: "middle", marginLeft: 4 }} /> محطات</span>
                  <span className="mono">{stops.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span><Route size={10} style={{ verticalAlign: "middle", marginLeft: 4 }} /> خطوط</span>
                  <span className="mono">{routes.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Map Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Controls Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? <EyeOff size={14} /> : <Eye size={14} />}
            {showFilters ? " إخفاء الفلاتر" : " إظهار الفلاتر"}
          </button>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <button className={`btn btn-sm ${editingMode === "add-stop" ? "btn-primary" : ""}`}
            onClick={() => { setEditingMode(editingMode === "add-stop" ? "none" : "add-stop"); setDrawPoints([]); }}>
            <Plus size={14} /> {editingMode === "add-stop" ? "إلغاء" : "إضافة محطة"}
          </button>
          <button className={`btn btn-sm ${editingMode === "draw-route" ? "btn-primary" : ""}`}
            onClick={() => { setEditingMode(editingMode === "draw-route" ? "none" : "draw-route"); setDrawPoints([]); }}>
            <Route size={14} /> {editingMode === "draw-route" ? "إلغاء" : "رسم مسار"}
          </button>
          {editingMode === "draw-route" && drawPoints.length >= 2 && (
            <>
              <button className="btn btn-sm" onClick={handleSnapRoute}
                style={{ borderColor: "var(--accent-2)", color: "var(--accent-2)" }}>
                <Sparkles size={14} /> توليد ذكي
              </button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                const code = prompt("رمز الخط:"); if (!code) return;
                const nameAr = prompt("اسم الخط بالعربية:"); if (!nameAr) return;
                const nameEn = prompt("اسم الخط بالإنجليزية:"); if (!nameEn) return;
                const mode = prompt("النوع (city_bus, brt, serveece, intercity):") || "city_bus";
                try {
                  await routesApi.create({ code, name_ar: nameAr, name_en: nameEn, mode, color: "#3BB0FF",
                    pathGeojson: { type: "LineString", coordinates: drawPoints.map(([lat, lng]) => [lng, lat]) } });
                  setEditingMode("none"); setDrawPoints([]); fetchData();
                } catch (err) { alert((err as Error).message); }
              }}><Check size={14} /> حفظ</button>
              <button className="btn btn-sm" onClick={() => setDrawPoints(drawPoints.slice(0, -1))}>↩ تراجع</button>
              <button className="btn btn-sm" onClick={() => setDrawPoints([])}><X size={14} /> مسح</button>
            </>
          )}
          {editingMode === "draw-route" && (
            <span style={{ fontSize: 11, color: "var(--warn)", marginRight: 4 }}>
              🖱️ يمين=إضافة · اسحب=تحريك · {drawPoints.length} نقطة
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {stops.length} محطة · {routes.length} خط
          </span>
          <button className="btn btn-sm" onClick={fetchData}><RefreshCw size={12} /> تحديث</button>
        </div>

        {/* Map */}
        <div style={{ position: "relative", flex: 1, minHeight: 400 }}>
          {loading ? <MapSkeleton /> : (
            <InteractiveMap
              stops={stops} routes={routes} routeGeoJSON={routeGeoJSON}
              selectedStopId={selectedStop?.id} selectedRouteId={selectedRoute?.id}
              onStopClick={setSelectedStop} onRouteClick={setSelectedRoute}
              onMapClick={handleMapClick} onStopDrag={handleStopDrag}
              editingMode={editingMode} drawPoints={drawPoints}
              onDrawPoint={handleDrawPoint} onUpdateDrawPoints={setDrawPoints}
              height="100%"
            />
          )}
        </div>
      </div>

      {/* ── Selected Stop Details ── */}
      {selectedStop && (
        <div style={{ marginTop: 8 }}>
          <Panel
            title={selectedStop.name_ar}
            subtitle={`${selectedStop.code} · ${selectedStop.governorate}${selectedStop.is_terminal ? " · مجمع" : ""}`}
            headerRight={
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteStop(selectedStop.id)}>
                <Trash2 size={12} /> حذف
              </button>
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontSize: 12 }}>
              <div><span style={{ color: "var(--text-muted)" }}>الإحداثيات: </span><span className="mono">{selectedStop.lat.toFixed(5)}, {selectedStop.lng.toFixed(5)}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>المدينة: </span><span>{selectedStop.city || "—"}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>مظلة: </span><span>{selectedStop.has_shelter ? "✅" : "❌"}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>سهولة وصول: </span><span>{selectedStop.has_accessibility ? "✅" : "❌"}</span></div>
              <div><span style={{ color: "var(--text-muted)" }}>تكييف: </span><span>{selectedStop.has_ac ? "✅" : "❌"}</span></div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
