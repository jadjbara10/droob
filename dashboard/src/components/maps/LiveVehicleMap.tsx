// ============================================================================
// دروب (Droob) — Live Vehicle Map
// deck.gl ScatterplotLayer: real-time vehicle positions colored by transit mode
// ============================================================================

"use client";

import React, { useCallback, useMemo, useRef } from "react";
import DeckGL from "@deck.gl/react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type TransitMode =
  | "city_bus"
  | "brt"
  | "serveece"
  | "intercity";

interface VehiclePoint {
  id: string;
  mode: TransitMode;
  routeCode: string;
  speedKmh: number;
  occupancy: "empty" | "partial" | "full";
  heading: number;
  lat: number;
  lng: number;
}

interface LiveVehicleMapProps {
  vehicles?: VehiclePoint[];
  highlightVehicleId?: string | null;
  isLoading?: boolean;
  height?: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MODE_COLORS: Record<TransitMode, [number, number, number]> = {
  city_bus: [0, 102, 204],
  brt: [230, 0, 38],
  serveece: [255, 140, 0],
  intercity: [107, 33, 168],
};

const MODE_LABELS: Record<TransitMode, string> = {
  city_bus: "باص مدينة",
  brt: "باص سريع",
  serveece: "سرفيس",
  intercity: "بين المدن",
};

const OCCUPANCY_LABELS: Record<VehiclePoint["occupancy"], string> = {
  empty: "فارغ",
  partial: "شاغر جزئي",
  full: "ممتلئ",
};

// ─── LiveVehicleMap Component ──────────────────────────────────────────────

const LiveVehicleMap: React.FC<LiveVehicleMapProps> = ({
  vehicles = [],
  highlightVehicleId = null,
  isLoading = false,
  height = 360,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Tooltip State ─────────────────────────────────────────────────
  const [tooltip, setTooltip] = React.useState<{
    x: number;
    y: number;
    vehicle: VehiclePoint;
  } | null>(null);

  // ─── Compute data for layers ───────────────────────────────────────
  const scatterData = useMemo(() => {
    return vehicles.map((v) => {
      const hl = v.id === highlightVehicleId;
      const baseColor = MODE_COLORS[v.mode] || [128, 128, 128];
      return {
        ...v,
        coordinates: [v.lng, v.lat] as [number, number],
        color: baseColor,
        size: hl ? 20 : 10,
        opacity: hl ? 1 : 0.85,
        radiusPixels: hl ? 12 : 6,
      };
    });
  }, [vehicles, highlightVehicleId]);

  // ─── Layers ────────────────────────────────────────────────────────
  const layers = useMemo(() => {
    // deck.gl v9 import
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ScatterplotLayer } = require("@deck.gl/layers");

    return [
      new ScatterplotLayer({
        id: "vehicles",
        data: scatterData,
        pickable: true,
        stroked: true,
        filled: true,
        radiusUnits: "pixels",
        lineWidthMinPixels: 2,
        getPosition: (d: Record<string, unknown>) => d.coordinates as [number, number],
        getFillColor: (d: Record<string, unknown>) => d.color as [number, number, number],
        getLineColor: [255, 255, 255],
        getRadius: (d: Record<string, unknown>) => (d.radiusPixels as number) || 8,
        getLineWidth: 2,

        onHover: (info: Record<string, unknown>) => {
          if (info.picked && info.object) {
            setTooltip({
              x: (info.x as number) || 0,
              y: (info.y as number) || 0,
              vehicle: info.object as unknown as VehiclePoint,
            });
          } else {
            setTooltip(null);
          }
        },
      }),
    ];
  }, [scatterData]);

  // ─── View State ────────────────────────────────────────────────────
  const initialViewState = useMemo(
    () => ({
      latitude: 31.9566, // Amman center
      longitude: 35.945,
      zoom: 12,
      minZoom: 8,
      maxZoom: 18,
      pitch: 0,
      bearing: 0,
    }),
    [],
  );

  // ─── Legend helper ─────────────────────────────────────────────────
  const Legend: React.FC = useCallback(
    () => (
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5 rounded-card bg-surface/90 backdrop-blur-sm border border-border px-3 py-2 shadow-md text-xs">
        <span className="font-semibold text-text-primary mb-0.5">وسائط النقل</span>
        {(Object.entries(MODE_COLORS) as [TransitMode, [number, number, number]][]).map(
          ([mode, rgb]) => (
            <div key={mode} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                style={{ backgroundColor: `rgb(${rgb.join(",")})` }}
              />
              <span className="text-text-secondary whitespace-nowrap">
                {MODE_LABELS[mode]}
              </span>
            </div>
          ),
        )}
      </div>
    ),
    [],
  );

  // ─── Loading State ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className="relative w-full rounded-card border border-border bg-surface-2 overflow-hidden"
        style={{ height }}
      >
        {/* Shimmer */}
        <div className="absolute inset-0 animate-pulse">
          <div className="h-full w-full bg-surface-3" />
          <div className="absolute bottom-4 left-4 z-10 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-surface/80 rounded-card px-2 py-1.5">
                <div className="w-2 h-2 rounded-full bg-text-tertiary/30" />
                <div className="w-14 h-3 rounded bg-text-tertiary/20" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 animate-spin text-brand-blue/50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm text-text-tertiary">جاري تحميل الخريطة...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty State ───────────────────────────────────────────────────
  if (!vehicles || vehicles.length === 0) {
    return (
      <div
        ref={containerRef}
        className="relative w-full rounded-card border border-border bg-surface-2 overflow-hidden flex items-center justify-center"
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-3 text-text-tertiary">
          <svg
            className="w-16 h-16 opacity-20"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="15" y="25" width="70" height="50" rx="10" />
            <circle cx="30" cy="82" r="7" />
            <circle cx="70" cy="82" r="7" />
            <line x1="10" y1="15" x2="90" y2="85" strokeWidth="2" opacity="0.3" />
          </svg>
          <p className="text-sm font-medium">لا توجد مركبات نشطة حالياً</p>
          <p className="text-xs">ستظهر المركبات هنا بمجرد بدء التشغيل</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-card border border-border overflow-hidden shadow-sm bg-surface"
      style={{ height }}
    >
      <DeckGL
        initialViewState={initialViewState}
        controller
        layers={layers}
        getCursor={() => "pointer"}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Base map tile layer rendered via deck.gl */}
      </DeckGL>

      {/* Legend */}
      <Legend />

      {/* Vehicle count badge */}
      <div className="absolute top-3 left-3 z-10 rounded-pill bg-surface/90 backdrop-blur-sm border border-border px-3 py-1 shadow-sm text-xs font-medium text-text-secondary">
        <span className="tabular-nums text-text-primary font-bold">{vehicles.length}</span>
        {" مركبة نشطة"}
      </div>

      {/* Highlighted vehicle banner */}
      {highlightVehicleId && (
        <div className="absolute top-3 right-16 z-10 rounded-pill bg-brand-blue/90 backdrop-blur-sm px-3 py-1 shadow-sm text-xs font-medium text-white">
          مركبة محددة: <span className="tabular-nums font-bold">{highlightVehicleId}</span>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 rounded-card bg-surface/95 backdrop-blur-md border border-border shadow-lg px-3 py-2 text-xs pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            maxWidth: 200,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: `rgb(${MODE_COLORS[tooltip.vehicle.mode].join(",")})`,
              }}
            />
            <span className="font-bold text-text-primary">
              {MODE_LABELS[tooltip.vehicle.mode]}
            </span>
          </div>
          <div className="space-y-0.5 text-text-secondary">
            <div className="flex justify-between gap-3">
              <span>الرمز:</span>
              <span className="font-mono font-bold text-text-primary">
                {tooltip.vehicle.routeCode}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>السرعة:</span>
              <span className="tabular-nums">
                {tooltip.vehicle.speedKmh.toLocaleString("ar-JO")} كم/س
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>الحالة:</span>
              <span>{OCCUPANCY_LABELS[tooltip.vehicle.occupancy]}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { LiveVehicleMap };
export default LiveVehicleMap;