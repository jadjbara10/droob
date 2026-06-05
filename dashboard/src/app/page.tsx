"use client";

import React, { useState, useEffect } from "react";
import { useKpis, useHourlyTrips, useVehicles } from "@/lib/hooks";
import DashboardShell from "@/components/DashboardShell";
import LiveVehicleMap from "@/components/maps/LiveVehicleMap";
import type { KpiResponse, TripHour } from "@/lib/api";

export default function DashboardPage() {
  const { data: kpis } = useKpis();
  const { data: trips } = useHourlyTrips();
  const { data: vehicles } = useVehicles();
  const [now, setNow] = useState("");

  useEffect(() => {
    setNow(new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }));
    const interval = setInterval(() => {
      setNow(new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const kpi = (kpis || {
    active_users: 0, trips_today: 0, vehicles_active: 0,
    vehicles_total: 0, avg_delay_minutes: 0,
  }) as KpiResponse;

  const hourly: TripHour[] = Array.isArray(trips) && trips.length > 0
    ? trips
    : Array.from({ length: 24 }, (_, i) => ({ hour: `${i}`, count: 0 }));
  const maxT = Math.max(...hourly.map((h) => h.count), 1);

  const vehiclesList = Array.isArray(vehicles) ? vehicles : [];

  const kpiCards = [
    { label: "المركبات النشطة", value: kpi.vehicles_active, change: "", color: "#00A3FF", icon: "🚌" },
    { label: "الرحلات اليوم", value: kpi.trips_today.toLocaleString("ar"), change: "", color: "#6366F1", icon: "👥" },
    { label: "متوسط التأخير", value: `${kpi.avg_delay_minutes} د`, change: "", color: "#10B981", icon: "🎯" },
    { label: "إجمالي المركبات", value: kpi.vehicles_total, change: "", color: "#F59E0B", icon: "🔔" },
    { label: "المستخدمين النشطين", value: kpi.active_users.toLocaleString("ar"), change: "", color: "#8B5CF6", icon: "🗺️" },
  ];

  return (
    <DashboardShell headerProps={{ title: "لوحة القيادة" }}>
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {kpiCards.map((card, i) => (
          <div key={i} className="rounded-card bg-surface border border-border p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px opacity-40"
              style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
            <div className="flex justify-between mb-2">
              <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className="text-[28px] font-extrabold leading-none" style={{ color: card.color }}>
              {typeof card.value === "number" ? card.value.toLocaleString("ar") : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Live Map + Line Status */}
      <div className="grid grid-cols-[2fr_1fr] gap-5 mb-6">
        {/* Live Vehicle Map */}
        <div className="rounded-card bg-surface border border-border overflow-hidden" style={{ minHeight: 360 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-text-primary">🗺️ الخريطة الحية</span>
            <span className="text-xs text-text-tertiary">{vehiclesList.length} مركبة نشطة</span>
          </div>
          <div style={{ height: 320 }}>
            <LiveVehicleMap vehicles={vehiclesList.map((v: any) => ({
              id: v.id ?? "",
              mode: (v.type === "brt_bus" ? "brt" : v.type === "minivan" ? "serveece" : v.type === "coach" ? "intercity" : "city_bus") as any,
              routeCode: v.assigned_route_id ?? "",
              speedKmh: v.speed ?? 0,
              occupancy: (v.occupancy ?? "empty") as "empty" | "partial" | "full",
              heading: v.bearing ?? 0,
              lat: v.lat ?? 31.95,
              lng: v.lng ?? 35.91,
            }))} />
          </div>
        </div>

        {/* Active Line Health */}
        <div className="rounded-card bg-surface border border-border p-4">
          <div className="font-semibold text-text-primary mb-3">📋 صحة الخطوط</div>
          <div className="space-y-3">
            {[
              { name: "BRT1", pct: 85, color: "#10B981" },
              { name: "خط ٧", pct: 55, color: "#F59E0B" },
              { name: "S03", pct: 92, color: "#10B981" },
              { name: "BRT2", pct: 78, color: "#10B981" },
              { name: "خط ١٥", pct: 45, color: "#EF4444" },
            ].map((line) => (
              <div key={line.name} className="flex items-center gap-3">
                <span className="text-sm font-semibold text-text-primary w-14">{line.name}</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${line.pct}%`, backgroundColor: line.color,
                  }} />
                </div>
                <span className="text-xs text-text-tertiary w-10 text-left">{line.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trips by Hour Chart */}
      <div className="rounded-card bg-surface border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-text-primary">📊 الرحلات بالساعة</span>
          <span className="text-xs text-text-tertiary">آخر تحديث: {now}</span>
        </div>
        <div className="flex items-end gap-1 h-40">
          {hourly.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour}:00 — ${h.count} رحلة`}>
              <div className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${Math.max(4, (h.count / maxT) * 100)}%`,
                  background: "linear-gradient(180deg, #00A3FF, #6366F1)",
                  minHeight: 2,
                }} />
              {i % 4 === 0 && (
                <span className="text-[9px] text-text-tertiary">{h.hour}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
