/* ═══════════════════════════════════════════════════════════════════════════
   Panel — Surface container with header
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";

interface PanelProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function Panel({
  title,
  subtitle,
  headerRight,
  children,
  className = "",
  bodyClassName = "",
  noPadding = false,
}: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      {(title || headerRight) && (
        <div className="panel-header">
          <div>
            {title && <div className="panel-title">{title}</div>}
            {subtitle && <div className="panel-subtitle">{subtitle}</div>}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className={noPadding ? "" : `panel-body ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
}
