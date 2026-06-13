"use client";

/* â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
   Interactive Map â€” Leaflet dark theme, stops/routes markers, CRUD actions
   â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { StopRecord, RouteRecord } from "@/lib/api";

// â”€â”€â”€ Tile layers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TILE_LAYERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://carto.com/">CARTO</a>',
    label: "ط¯ط§ظƒظ†",
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://carto.com/">CARTO</a>',
    label: "ظپط§طھط­",
  },
  colorful: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: "ظ…ظ„ظˆظ†",
  },
};
type TileStyle = keyof typeof TILE_LAYERS;

// â”€â”€â”€ Default center: Amman 4th Circle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_CENTER: [number, number] = [31.9539, 35.9106];
const DEFAULT_ZOOM = 13;

// â”€â”€â”€ Custom Marker Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function createStopIcon(color: string = "#3BB0FF") {
  return L.divIcon({
    className: "custom-stop-marker",
    html: `<div style="
      width:12px;height:12px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 0 8px ${color}66;
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function createTerminalIcon() {
  return L.divIcon({
    className: "custom-terminal-marker",
    html: `<div style="
      width:16px;height:16px;
      background:var(--accent-2);
      border:2px solid white;
      border-radius:4px;
      box-shadow:0 0 10px var(--accent-2)66;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// â”€â”€â”€ Mode colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MODE_COLORS: Record<string, string> = {
  city_bus: "#3BB0FF",
  brt: "#FF4D6A",
  serveece: "#00E5A0",
  intercity: "#FF8C42",
};

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface InteractiveMapProps {
  stops?: StopRecord[];
  routes?: RouteRecord[];
  routeGeoJSON?: any; // GeoJSON FeatureCollection for lightweight map rendering
  selectedStopId?: string | null;
  selectedRouteId?: string | null;
  onStopClick?: (stop: StopRecord) => void;
  onRouteClick?: (route: RouteRecord) => void;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  onStopDrag?: (stopId: string, latlng: { lat: number; lng: number }) => void;
  editingMode?: "none" | "add-stop" | "draw-route";
  drawPoints?: [number, number][];
  onDrawPoint?: (latlng: [number, number]) => void;
  onUpdateDrawPoints?: (points: [number, number][]) => void;
  height?: number | string;
  showControls?: boolean;
}

// â”€â”€â”€ Map Event Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MapClickHandler({
  onMapClick,
  editingMode,
  onDrawPoint,
  onDeleteLastPoint,
}: {
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
  editingMode?: string;
  onDrawPoint?: (latlng: [number, number]) => void;
  onDeleteLastPoint?: () => void;
}) {
  useMapEvents({
    click(e) {
      if (editingMode === "add-stop" && onMapClick) {
        onMapClick(e.latlng);
      }
    },
    contextmenu(e) {
      if (editingMode === "draw-route" && onDrawPoint) {
        onDrawPoint([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

// â”€â”€â”€ Fit bounds to markers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FitBounds({ stops }: { stops?: StopRecord[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops && stops.length > 0) {
      const bounds = L.latLngBounds(
        stops.map((s) => [s.lat, s.lng] as [number, number]),
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  }, [stops, map]);
  return null;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function InteractiveMap({
  stops = [],
  routes = [],
  routeGeoJSON,
  selectedStopId,
  selectedRouteId,
  onStopClick,
  onRouteClick,
  onMapClick,
  onStopDrag,
  editingMode = "none",
  drawPoints = [],
  onDrawPoint,
  onUpdateDrawPoints,
  height = 500,
  showControls = true,
}: InteractiveMapProps) {
  const [mounted, setMounted] = useState(false);
  const [mapStyle, setMapStyle] = useState<TileStyle>("light");

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="skeleton"
        style={{ width: "100%", height, borderRadius: "var(--radius)" }}
      />
    );
  }

  return (
    <div style={{ height, borderRadius: "var(--radius)", overflow: "hidden" }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", background: "#e8ecf0" }}
        zoomControl={showControls}
        attributionControl={showControls}
      >
        <TileLayer url={TILE_LAYERS[mapStyle].url} attribution={TILE_LAYERS[mapStyle].attr} />

        <MapClickHandler
          onMapClick={onMapClick}
          editingMode={editingMode}
          onDrawPoint={onDrawPoint}
        />

        <FitBounds stops={stops} />

        {/* Stops Markers */}
        {stops.map((stop) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={stop.is_terminal ? createTerminalIcon() : createStopIcon(
              selectedStopId === stop.id ? "#FF8C42" : "#3BB0FF",
            )}
            draggable={editingMode === "add-stop"}
            eventHandlers={{
              click: () => onStopClick?.(stop),
              dragend: (e: L.LeafletEvent) => {
                const marker = e.target;
                const pos = marker.getLatLng();
                onStopDrag?.(stop.id, { lat: pos.lat, lng: pos.lng });
              },
            }}
          >
            <Popup>
              <div style={{ fontFamily: "'Tajawal', sans-serif", minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {stop.name_ar}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                  {stop.code} آ· {stop.governorate}
                  {stop.is_terminal && (
                    <span className="badge badge-success" style={{ marginRight: 6 }}>
                      ظ…ط¬ظ…ط¹
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11 }}>
                  {stop.has_shelter && <span className="tag tag-info">ظ…ط¸ظ„ط©</span>}
                  {stop.has_accessibility && <span className="tag tag-success">ط³ظ‡ظˆظ„ط© ظˆطµظˆظ„</span>}
                  {stop.has_ac && <span className="tag tag-info">طھظƒظٹظٹظپ</span>}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                  {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Route Polylines from GeoJSON (lightweight, all routes) */}
        {routeGeoJSON?.features?.map((feature: any, idx: number) => {
          const coords = feature.geometry?.coordinates;
          if (!coords || coords.length < 2) return null;
          const path = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);
          const props = feature.properties || {};
          const color = MODE_COLORS[props.mode] || props.color || "#3BB0FF";
          return (
            <Polyline
              key={`geo-${idx}`}
              positions={path}
              pathOptions={{ color, weight: 2, opacity: 0.65 }}
            />
          );
        })}

        {/* Route Polylines (from routes list - for selected/highlighted) */}
        {routes.map((route) => {
          const path = extractPath(route);
          if (!path || path.length < 2) return null;
          const isSelected = selectedRouteId === route.id;
          const color = MODE_COLORS[route.mode] || route.color || "#3BB0FF";
          return (
            <Polyline
              key={route.id}
              positions={path}
              pathOptions={{
                color: isSelected ? "#FF8C42" : color,
                weight: isSelected ? 4 : 2.5,
                opacity: isSelected ? 1 : 0.7,
              }}
              eventHandlers={{
                click: () => onRouteClick?.(route),
              }}
            />
          );
        })}

        {/* Drawing polyline (for new route) â€” with numbered draggable vertices */}
        {drawPoints.length >= 2 && (
          <Polyline
            positions={drawPoints}
            pathOptions={{
              color: "#FF8C42",
              weight: 3,
              opacity: 0.9,
            }}
          />
        )}
        {drawPoints.map((p, i) => (
          <Marker
            key={`dp-${i}`}
            position={p}
            icon={L.divIcon({
              className: "",
              html: `<div style="
                width:20px;height:20px;
                background:#FF8C42;border:2px solid white;
                border-radius:50%;box-shadow:0 0 8px #FF8C4266;
                display:flex;align-items:center;justify-content:center;
                color:white;font-size:10px;font-weight:bold;font-family:'IBM Plex Mono',monospace;
                cursor:grab;
              ">${i + 1}</div>`,
              iconSize: [20, 20], iconAnchor: [10, 10],
            })}
            draggable={editingMode === "draw-route"}
            eventHandlers={{
              dragend: (e: L.LeafletEvent) => {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                const newPoints = [...drawPoints];
                newPoints[i] = [ll.lat, ll.lng];
                onUpdateDrawPoints?.(newPoints);
              },
            }}
          />
        ))}

        {/* Map Style Switcher */}
        <div className="leaflet-top leaflet-right" style={{ marginTop: 80 }}>
          <div className="leaflet-control" style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:4,display:"flex",gap:2}}>
            {(Object.keys(TILE_LAYERS) as TileStyle[]).map(style => (
              <button
                key={style}
                onClick={(e) => { e.stopPropagation(); setMapStyle(style); }}
                style={{
                  padding:"4px 8px",fontSize:11,border:"none",borderRadius:4,cursor:"pointer",
                  background: mapStyle === style ? "var(--accent)" : "transparent",
                  color: mapStyle === style ? "#fff" : "var(--text-secondary)",
                }}
              >
                {TILE_LAYERS[style].label}
              </button>
            ))}
          </div>
        </div>
      </MapContainer>

      {/* Editing mode indicator */}
      {editingMode !== "none" && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 14px",
            fontSize: 12,
            color: "var(--warn)",
            fontWeight: 500,
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          {editingMode === "add-stop" && "ط§ظ†ظ‚ط± ط¹ظ„ظ‰ ط§ظ„ط®ط±ظٹط·ط© ظ„ط¥ط¶ط§ظپط© ظ…ط­ط·ط©"}
          {editingMode === "draw-route" &&
            `ط±ط³ظ… ظ…ط³ط§ط± â€” ${drawPoints.length} ظ†ظ‚ط·ط©`}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function extractPath(route: RouteRecord): [number, number][] | null {
  if (route.path_geojson) {
    try {
      const geojson = typeof route.path_geojson === "string"
        ? JSON.parse(route.path_geojson)
        : route.path_geojson;
      if (geojson.type === "LineString" && Array.isArray(geojson.coordinates)) {
        return geojson.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
      }
    } catch {
      // fall through
    }
  }
  return null;
}

