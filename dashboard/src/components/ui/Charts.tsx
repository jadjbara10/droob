// Charts — Simple SVG-based chart components for Droob Dashboard
"use client";

import React from "react";

interface AreaChartProps {
  data: Array<{ label: string; value: number }>;
  width?: number;
  height?: number;
  color?: string;
  showLabels?: boolean;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data, width = 600, height = 200, color = "#00A3FF", showLabels = false,
}) => {
  if (!data.length) return <div className="text-text-tertiary text-sm p-4">لا توجد بيانات</div>;
  const pad = { top: 10, right: 10, bottom: 20, left: 10 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => `${pad.left + (i / Math.max(data.length - 1, 1)) * cw},${pad.top + ch - (d.value / maxV) * ch}`).join(" ");
  const area = `M${pts.split(" ")[0]} L${pts} L${pad.left + cw},${pad.top + ch} L${pad.left},${pad.top + ch} Z`;
  const line = `M${pts.split(" ").join(" L")}`;
  const gradId = `ag-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="مخطط بياني">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {showLabels && data.map((d, i) => {
        const x = pad.left + (i / Math.max(data.length - 1, 1)) * cw;
        const y = pad.top + ch - (d.value / maxV) * ch;
        return <g key={i}><circle cx={x} cy={y} r={3} fill={color} /><text x={x} y={y - 8} textAnchor="middle" fontSize={10} fill="#94A3B8">{d.value}</text></g>;
      })}
    </svg>
  );
};

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  width?: number; height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, width = 600, height = 200 }) => {
  if (!data.length) return <div className="text-text-tertiary text-sm p-4">لا توجد بيانات</div>;
  const pad = { top: 10, right: 10, bottom: 20, left: 10 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(4, (cw / data.length) * 0.7);
  const gap = cw / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="مخطط أعمدة">
      {data.map((d, i) => {
        const x = pad.left + i * gap + (gap - barW) / 2;
        const bh = Math.max(2, (d.value / maxV) * ch);
        return <rect key={i} x={x} y={pad.top + ch - bh} width={barW} height={bh} rx={2} fill={d.color || "#6366F1"} opacity={0.85} />;
      })}
    </svg>
  );
};
