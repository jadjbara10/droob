"use client";

/* â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ
   MapPicker â€” reusable map for picking coordinates / drawing routes
   - Right-click: add point (polyline mode)
   - Left-click: pick location (point mode)
   - Drag vertices to move them
   - Right-click vertex: delete it
   - Undo last point
   â•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گâ•گ */

import React, { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Undo2, MousePointer2 } from "lucide-react";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';
const DEFAULT_CENTER: [number, number] = [31.9539, 35.9106];
const DEFAULT_ZOOM = 13;

// â”€â”€â”€ Marker Icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const pickIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#FF8C42;border:2px solid white;border-radius:50%;box-shadow:0 0 10px #FF8C4266;display:flex;align-items:center;justify-content:center;color:white;font-size:8px;font-weight:bold;font-family:sans-serif;"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function createVertexIcon(index: number, isDragging: boolean) {
  const color = isDragging ? "#FF8C42" : "#3BB0FF";
  const size = isDragging ? 22 : 18;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};border:2px solid white;
      border-radius:50%;box-shadow:0 0 8px ${color}66;
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:9px;font-weight:bold;font-family:'IBM Plex Mono',monospace;
      cursor:grab;
    ">${index + 1}</div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  });
}

const ghostIcon = L.divIcon({
  className: "",
  html: `<div style="width:6px;height:6px;background:#445577;border-radius:50%;"></div>`,
  iconSize: [6, 6], iconAnchor: [3, 3],
});

// â”€â”€â”€ Props â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface MapPickerProps {
  mode: "point" | "polyline";
  value?: { lat: number; lng: number } | null;
  polyline?: [number, number][];
  onChange?: (latlng: { lat: number; lng: number }) => void;
  onPolylineChange?: (points: [number, number][]) => void;
  height?: number;
  existingStops?: { lat: number; lng: number; name_ar: string }[];
}

// â”€â”€â”€ Draggable Vertex Marker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function VertexMarker({
  index,
  position,
  onDragEnd,
  onRightClick,
}: {
  index: number;
  position: [number, number];
  onDragEnd: (idx: number, pos: [number, number]) => void;
  onRightClick: (idx: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const el = marker.getElement();
    if (!el) return;

    const handleContext = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      onRightClick(index);
    };

    el.addEventListener("contextmenu", handleContext);
    return () => el.removeEventListener("contextmenu", handleContext);
  }, [index, onRightClick]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={createVertexIcon(index, isDragging)}
      draggable={true}
      eventHandlers={{
        dragstart: () => setIsDragging(true),
        dragend: (e: L.LeafletEvent) => {
          setIsDragging(false);
          const m = e.target as L.Marker;
          const ll = m.getLatLng();
          onDragEnd(index, [ll.lat, ll.lng]);
        },
      }}
    />
  );
}

// â”€â”€â”€ Map Event Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MapHandlers({
  mode,
  onLeftClick,
  onRightClick,
}: {
  mode: string;
  onLeftClick?: (latlng: { lat: number; lng: number }) => void;
  onRightClick?: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode === "point") onLeftClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    contextmenu(e) {
      if (mode === "polyline") {
        onRightClick?.([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

function FlyToMarker({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }, [lat, lng, map]);
  return null;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function MapPicker({
  mode, value, polyline = [], onChange, onPolylineChange,
  height = 300, existingStops = [],
}: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const center: [number, number] = value ? [value.lat, value.lng]
    : polyline.length > 0 ? polyline[Math.floor(polyline.length / 2)]
    : DEFAULT_CENTER;

  const handleDragVertex = useCallback((index: number, pos: [number, number]) => {
    const next = [...polyline];
    next[index] = pos;
    onPolylineChange?.(next);
  }, [polyline, onPolylineChange]);

  const handleDeleteVertex = useCallback((index: number) => {
    const next = polyline.filter((_, i) => i !== index);
    onPolylineChange?.(next);
  }, [polyline, onPolylineChange]);

  const handleAddPoint = useCallback((latlng: [number, number]) => {
    onPolylineChange?.([...polyline, latlng]);
  }, [polyline, onPolylineChange]);

  if (!mounted) {
    return <div className="skeleton" style={{ height, borderRadius: "var(--radius-sm)" }} />;
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Map */}
      <div style={{
        height, borderRadius: "var(--radius-sm)", overflow: "hidden",
        border: "1px solid var(--border)", cursor: mode === "point" ? "crosshair" : "default",
      }}>
        <MapContainer
          center={center}
          zoom={value ? 16 : polyline.length > 0 ? 15 : DEFAULT_ZOOM}
          style={{ height: "100%", width: "100%", background: "#e8ecf0" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />

          <MapHandlers
            mode={mode}
            onLeftClick={onChange}
            onRightClick={handleAddPoint}
          />

          {value && <FlyToMarker lat={value.lat} lng={value.lng} />}

          {/* Ghost markers for other stops */}
          {existingStops.map((s, i) => (
            <Marker key={`ghost-${i}`} position={[s.lat, s.lng]} icon={ghostIcon} />
          ))}

          {/* Picked point (point mode) */}
          {mode === "point" && value && (
            <Marker position={[value.lat, value.lng]} icon={pickIcon} />
          )}

          {/* Polyline */}
          {mode === "polyline" && polyline.length >= 2 && (
            <Polyline
              positions={polyline}
              pathOptions={{
                color: "#FF8C42", weight: 3, opacity: 0.8,
              }}
            />
          )}

          {/* Draggable vertex markers */}
          {mode === "polyline" && polyline.map((p, i) => (
            <VertexMarker
              key={`v-${i}-${p[0].toFixed(4)}-${p[1].toFixed(4)}`}
              index={i}
              position={p}
              onDragEnd={handleDragVertex}
              onRightClick={handleDeleteVertex}
            />
          ))}
        </MapContainer>
      </div>

      {/* Hints & Controls */}
      {mode === "point" ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <MousePointer2 size={12} />
          {value
            ? <span><span className="mono">{value.lng.toFixed(5)}, {value.lat.toFixed(5)}</span></span>
            : "انقر على الخريطة لتحديد الموقع"}
        </div>
      ) : (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)" }}>
            <MousePointer2 size={12} />
            <span style={{ color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--warn)" }}>يمين</strong> لإضافة نقطة ·
              <strong style={{ color: "var(--accent)" }}> اسحب</strong> النقاط ·
              <strong style={{ color: "var(--danger)" }}> يمين</strong> على نقطة لحذفها
            </span>
          </div>
          <span style={{ color: "var(--warn)", fontWeight: 600 }}>
            <span className="mono">{polyline.length}</span> نقطة
          </span>
          {polyline.length > 0 && (
            <>
              <button className="btn btn-xs" onClick={() => onPolylineChange?.(polyline.slice(0, -1))}>
                <Undo2 size={10} /> تراجع
              </button>
              <button className="btn btn-xs" onClick={() => onPolylineChange?.([])}>
                <X size={10} /> مسح الكل
              </button>
            </>
          )}
        </div>
      )}

      {/* Empty state for polyline */}
      {mode === "polyline" && polyline.length === 0 && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: "rgba(17,24,39,0.9)", border: "1px dashed var(--border-active)",
          borderRadius: "var(--radius-sm)", padding: "12px 20px",
          textAlign: "center", pointerEvents: "none", zIndex: 500,
        }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>
            ط§ط¶ط؛ط· <strong style={{ color: "var(--warn)" }}>ط¨ط§ظ„ط²ط± ط§ظ„ط£ظٹظ…ظ†</strong> ط¹ظ„ظ‰ ط§ظ„ط®ط±ظٹط·ط©
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            ظ„ط¥ط¶ط§ظپط© ظ†ظ‚ط§ط· ط§ظ„ظ…ط³ط§ط±
          </div>
        </div>
      )}
    </div>
  );
}

