"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   DataTable — RTL Arabic table with pagination, search, filters
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useState, useMemo } from "react";
import { ChevronRight, ChevronLeft, Search } from "lucide-react";

export interface Column<T = any> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable({
  columns,
  data,
  searchPlaceholder = "بحث...",
  searchKeys = [],
  pageSizeOptions = [10, 25, 50, 100],
  defaultPageSize = 25,
  isLoading = false,
  emptyMessage = "لا توجد بيانات للعرض",
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const q = search.toLowerCase();
    return data.filter((row: any) =>
      searchKeys.some((key: string) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, search, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div>
      {/* Search + PageSize */}
      {(searchKeys.length > 0 || true) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 12,
          }}
        >
          {searchKeys.length > 0 && (
            <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                className="form-input"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{ paddingRight: 32 }}
              />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>صفوف:</span>
            <select
              className="form-select"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{ width: 80, padding: "6px 10px" }}
            >
              {pageSizeOptions.map((n: number) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        {isLoading ? (
          <div style={{ padding: 16 }}>
            {Array.from({ length: 5 }).map((_: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                {columns.map((_c: any, j: number) => (
                  <div
                    key={j}
                    className="skeleton"
                    style={{ flex: 1, height: 14, borderRadius: 4 }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col: any) => (
                  <th key={col.key} className={col.className}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((row: any, idx: number) => (
                <tr key={idx}>
                  {columns.map((col: any) => (
                    <td key={col.key} className={col.className}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          <span>
            عرض {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, filtered.length)} من{" "}
            {filtered.length.toLocaleString("ar-JO")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              className="btn btn-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              <ChevronRight size={14} />
            </button>
            <span style={{ padding: "0 8px" }}>
              {safePage} / {totalPages}
            </span>
            <button
              className="btn btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
