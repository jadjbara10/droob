// دروب (Droob) — Trip Chart Component
import React from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

export interface TripDataPoint {
  hour: string;
  count: number;
}

interface TripChartProps {
  data: TripDataPoint[];
  loading?: boolean;
}

export function TripChart({ data, loading }: TripChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse" />
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 mb-4">الرحلات حسب الساعة</h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-gray-400 text-sm">لا توجد بيانات للرحلات</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <h3 className="text-base font-semibold text-gray-900 mb-4">الرحلات حسب الساعة</h3>
      <ResponsiveContainer width="100%" height={192}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tripGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A4F8A" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1A4F8A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12, border: "none",
              boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            }}
            formatter={(v: number) => [`${v} رحلة`, "العدد"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#1A4F8A"
            strokeWidth={2.5}
            fill="url(#tripGradient)"
            dot={false}
            activeDot={{ r: 5, fill: "#1A4F8A" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}