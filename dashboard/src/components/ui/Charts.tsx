// ============================================================================
// دروب (Droob) — Chart Components
// AreaChart + DonutChart — SVG-based, no external library dependency
// ============================================================================

import React, { useMemo } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface ChartDataPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: ChartDataPoint[];
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  height?: number;
}

interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  size?: number;
}

// ─── AreaChart ─────────────────────────────────────────────────────────────

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  color = "var(--brand-blue, #1A4F8A)",
  gradientFrom = "var(--brand-blue, #1A4F8A)",
  gradientTo = "transparent",
  height = 220,
}) => {
  const width = 600;
  const padW = 8;
  const padB = 24;
  const padT = 8;

  const graphW = width - padW * 2;
  const graphH = height - padB - padT;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const areaPath = useMemo(() => {
    const stepX = graphW / (data.length - 1 || 1);
    const topPoints = data
      .map((d, i) => {
        const x = padW + i * stepX;
        const y = padT + graphH - (d.value / maxVal) * graphH;
        return `${x},${y}`;
      })
      .join(" ");

    return `M${padW},${padT + graphH} L${topPoints} L${padW + graphW},${padT + graphH} Z`;
  }, [data, maxVal, graphW, graphH, padW, padT]);

  const linePath = useMemo(() => {
    const stepX = graphW / (data.length - 1 || 1);
    return data
      .map((d, i) => {
        const x = padW + i * stepX;
        const y = padT + graphH - (d.value / maxVal) * graphH;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [data, maxVal, graphW, graphH, padW, padT]);

  // Y-axis labels
  const yLabels = useMemo(() => {
    const ticks = 5;
    return Array.from({ length: ticks }, (_, i) => {
      const val = Math.round((maxVal / (ticks - 1)) * (ticks - 1 - i));
      const y = padT + (i / (ticks - 1)) * graphH;
      return { label: val.toLocaleString("ar-JO"), y };
    });
  }, [maxVal, graphH, padT]);

  const gradientId = "areaGrad";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Area chart showing trips per hour"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={gradientFrom} stopOpacity="0.25" />
          <stop offset="100%" stopColor={gradientTo} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((l, i) => (
        <g key={i}>
          <line
            x1={padW}
            y1={l.y}
            x2={padW + graphW}
            y2={l.y}
            stroke="var(--border, #E5E7EB)"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
          <text
            x={padW - 4}
            y={l.y + 3}
            textAnchor="end"
            className="text-text-tertiary"
            fontSize="9"
            fontFamily="system-ui"
          >
            {l.label}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots (only show some for performance) */}
      {data.map((d, i) => {
        if (data.length <= 16 || i % 2 === 0) {
          const stepX = graphW / (data.length - 1 || 1);
          const x = padW + i * stepX;
          const y = padT + graphH - (d.value / maxVal) * graphH;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="var(--surface, #FFFFFF)"
              stroke={color}
              strokeWidth="1.5"
            />
          );
        }
        return null;
      })}

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (data.length <= 16 || i % 3 === 0) {
          const stepX = graphW / (data.length - 1 || 1);
          const x = padW + i * stepX;
          return (
            <text
              key={i}
              x={x}
              y={height - 4}
              textAnchor="middle"
              className="text-text-tertiary"
              fontSize="9"
              fontFamily="system-ui"
            >
              {d.label}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
};

// ─── DonutChart ─────────────────────────────────────────────────────────────

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 220 }) => {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const radius = size * 0.3;
  const strokeWidth = radius * 0.5;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Build segments
  const segments = useMemo(() => {
    let cumulative = -Math.PI / 2; // start from top
    return data.map((d) => {
      const pct = d.value / total;
      const arc = pct * Math.PI * 2;
      const start = cumulative;
      const end = cumulative + arc;
      cumulative = end;

      const x1 = center + radius * Math.cos(start);
      const y1 = center + radius * Math.sin(start);
      const x2 = center + radius * Math.cos(end);
      const y2 = center + radius * Math.sin(end);
      const largeArc = arc > Math.PI ? 1 : 0;

      const path = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      ].join(" ");

      return { ...d, pct, path, start, end };
    });
  }, [data, total, center, radius]);

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="flex-shrink-0"
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--surface-3, #F1F3F5)"
          strokeWidth={strokeWidth}
        />

        {/* Data rings */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        ))}

        {/* Center text */}
        <text
          x={center}
          y={center - 8}
          textAnchor="middle"
          className="fill-text-primary"
          fontSize="22"
          fontWeight="700"
          fontFamily="system-ui"
        >
          {total.toLocaleString("ar-JO")}
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          className="fill-text-tertiary"
          fontSize="11"
          fontFamily="system-ui"
        >
          رحلة
        </text>
      </svg>

      {/* Legend */}
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: d.color }}
            />
            <div className="flex items-baseline gap-1">
              <span className="text-text-primary font-medium">{d.name}</span>
              <span className="text-xs text-text-tertiary tabular-nums">
                {Math.round((d.value / total) * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};