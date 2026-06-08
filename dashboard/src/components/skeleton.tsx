/* ═══════════════════════════════════════════════════════════════════════════
   Skeleton Loading Components
   ═══════════════════════════════════════════════════════════════════════════ */

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />;
}

export function SkeletonRow() {
  return <div className="skeleton skeleton-row" />;
}

export function SkeletonText({ width = "100%" }: { width?: string }) {
  return <div className="skeleton skeleton-text" style={{ width }} />;
}

export function SkeletonHeading() {
  return <div className="skeleton skeleton-heading" />;
}

export function KpiCardSkeleton() {
  return (
    <div className="kpi-card">
      <div className="skeleton skeleton-text" style={{ width: "50%" }} />
      <div className="skeleton" style={{ height: 36, width: "70%", marginTop: 8, borderRadius: 8 }} />
      <div className="skeleton skeleton-text-sm" style={{ marginTop: 12 }} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: 16 }}>
      <div className="skeleton skeleton-heading" style={{ width: "30%" }} />
      <div style={{ marginTop: 12 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="skeleton" style={{ flex: 1, height: 14, borderRadius: 4 }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div
      className="skeleton"
      style={{ width: "100%", height: 400, borderRadius: "var(--radius)" }}
    />
  );
}
