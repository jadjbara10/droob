// ============================================================================
// دروب (Droob) — DataTable Component
// TanStack Table v8 | Sortable columns | Row selection | Bulk actions | Export
// ============================================================================

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type ColumnFiltersState,
  type PaginationState,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

// ─── Icons ─────────────────────────────────────────────────────────────────

const SortAscIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={clsx("w-3 h-3", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,15 12,9 18,15" />
  </svg>
);

const SortDescIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={clsx("w-3 h-3", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6,9 12,15 18,9" />
  </svg>
);

const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
  </svg>
);

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

const ExportIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

// ─── Types ─────────────────────────────────────────────────────────────────

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  pageSize?: number;
  pageSizeOptions?: number[];
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: TData[]) => void;
  onExport?: (format: "csv" | "excel") => void;
  bulkActions?: React.ReactNode;
  searchPlaceholder?: string;
  searchColumn?: string;
  emptyMessage?: string;
  isLoading?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DataTable<TData>({
  columns,
  data,
  pageSize = 25,
  pageSizeOptions = [25, 50, 100],
  enableRowSelection = false,
  onRowSelectionChange,
  onExport,
  bulkActions,
  searchPlaceholder = "بحث...",
  searchColumn,
  emptyMessage = "لا توجد بيانات",
  isLoading = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "auto",
  });

  const selectedCount = Object.keys(rowSelection).length;
  const totalRows = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original);
      onRowSelectionChange(selectedRows);
    }
  }, [rowSelection, onRowSelectionChange, table]);

  // Export handler
  const handleExport = useCallback(
    (format: "csv" | "excel") => {
      if (onExport) {
        onExport(format);
        return;
      }

      // Default CSV export
      const headers = columns
        .filter((c) => c.header && typeof c.header === "string")
        .map((c) => c.header as string);

      const rows = table.getFilteredRowModel().rows.map((row) =>
        columns
          .filter((c) => c.header && typeof c.header === "string")
          .map((col) => {
            const cell = row.getVisibleCells().find((c) => c.column.id === col.id);
            return cell?.getValue() ?? "";
          })
      );

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
    [columns, table, onExport]
  );

  // ── Loading State ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="data-table-wrap">
        <div className="p-4 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: columns.length }).map((_, j) => (
                <div
                  key={j}
                  className="skeleton h-4 rounded-input"
                  style={{ width: j === 0 ? "48px" : `${Math.random() * 100 + 60}px` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────
  if (!data || data.length === 0) {
    return (
      <div className="data-table-wrap">
        <div className="empty-state">
          <div className="text-4xl mb-3 opacity-30">📋</div>
          <p className="text-sm text-text-secondary">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Search + Bulk actions */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-[320px]">
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder={searchPlaceholder}
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full h-9 pl-3 pr-9 rounded-input bg-surface border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
            />
          </div>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedCount > 0 && bulkActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-blue text-white rounded-card shadow-md text-xs"
              >
                <span className="font-bold tabular-nums">{selectedCount}</span>
                <span>محدد</span>
                <div className="w-px h-4 bg-white/30 mx-1" />
                {bulkActions}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Export */}
        <div className="flex items-center gap-2">
          {onExport && (
            <>
              <button
                onClick={() => handleExport("csv")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-input transition-colors border border-border"
              >
                <ExportIcon className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={() => handleExport("excel")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-input transition-colors border border-border"
              >
                <ExportIcon className="w-3.5 h-3.5" />
                Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={clsx(isSorted && "sorted")}
                      style={{
                        width: header.column.id === "select" ? "48px" : undefined,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {isSorted === "asc" && <SortAscIcon />}
                        {isSorted === "desc" && <SortDescIcon />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className={clsx(row.getIsSelected() && "selected")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 text-xs">
        {/* Row count */}
        <div className="text-text-tertiary">
          {totalRows > 0 ? (
            <>
              <span className="tabular-nums font-medium text-text-secondary">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>
              {" - "}
              <span className="tabular-nums font-medium text-text-secondary">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  totalRows
                )}
              </span>
              {" من "}
              <span className="tabular-nums font-medium text-text-secondary">{totalRows}</span>
            </>
          ) : (
            "لا توجد نتائج"
          )}
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-1">
          {/* Page size selector */}
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 px-2 rounded-input bg-surface border border-border text-text-primary text-xs focus:outline-none focus:border-brand-blue cursor-pointer"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / صفحة
              </option>
            ))}
          </select>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Navigation buttons */}
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="w-8 h-8 rounded-input flex items-center justify-center hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
            <ChevronRightIcon className="w-4 h-4 -mr-2" />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="w-8 h-8 rounded-input flex items-center justify-center hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          {/* Page indicator */}
          <span className="tabular-nums px-2 text-text-primary font-medium min-w-[40px] text-center">
            {totalPages > 0 ? table.getState().pagination.pageIndex + 1 : 0}
          </span>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="w-8 h-8 rounded-input flex items-center justify-center hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => table.setPageIndex(totalPages - 1)}
            disabled={!table.getCanNextPage()}
            className="w-8 h-8 rounded-input flex items-center justify-center hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            <ChevronLeftIcon className="w-4 h-4 -mr-2" />
          </button>
        </div>
      </div>
    </div>
  );
}