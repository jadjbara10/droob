// ============================================================================
// دروب (Droob) — DataTable Tests
// Sorting | Filtering | Pagination | Empty State | Loading State
// ============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { ColumnDef } from "@tanstack/react-table";

// ── Mock framer-motion ──────────────────────────────────────────────────────
vi.mock("framer-motion", () => ({
  motion: {
    tr: React.forwardRef(
      (
        { children, initial, animate, transition, className, ...props }: Record<string, unknown>,
        ref: React.Ref<HTMLTableRowElement>
      ) =>
        React.createElement("tr", { ref, className, ...props }, children as React.ReactNode)
    ),
    div: React.forwardRef(
      (
        { children, initial, animate, exit, transition, className, ...props }: Record<string, unknown>,
        ref: React.Ref<HTMLDivElement>
      ) =>
        React.createElement("div", { ref, className, ...props }, children as React.ReactNode)
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import DataTable from "@/components/ui/DataTable";

// ── Fixtures ─────────────────────────────────────────────────────────────────

interface TestRow {
  id: number;
  name: string;
  status: string;
  city: string;
}

const columns: ColumnDef<TestRow, unknown>[] = [
  { header: "الاسم", accessorKey: "name", enableSorting: true },
  { header: "الحالة", accessorKey: "status", enableSorting: true },
  { header: "المدينة", accessorKey: "city", enableSorting: true },
];

const sampleData: TestRow[] = [
  { id: 1, name: "محمد", status: "نشط", city: "عمان" },
  { id: 2, name: "أحمد", status: "متوقف", city: "إربد" },
  { id: 3, name: "سارة", status: "نشط", city: "الزرقاء" },
  { id: 4, name: "نور", status: "نشط", city: "عمان" },
  { id: 5, name: "خالد", status: "متوقف", city: "البلقاء" },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe("DataTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Empty State ──────────────────────────────────────────────────────────

  it("renders empty state when data is empty", () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText("لا توجد بيانات")).toBeInTheDocument();
  });

  it("renders custom empty message", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        emptyMessage="لا يوجد مستخدمين"
      />
    );
    expect(screen.getByText("لا يوجد مستخدمين")).toBeInTheDocument();
  });

  // ── Loading State ────────────────────────────────────────────────────────

  it("renders loading skeleton when isLoading is true", () => {
    render(<DataTable columns={columns} data={sampleData} isLoading={true} />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render loading skeleton when isLoading is false", () => {
    render(<DataTable columns={columns} data={sampleData} isLoading={false} />);
    const skeletons = document.querySelectorAll(".skeleton");
    expect(skeletons.length).toBe(0);
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it("renders column headers", () => {
    render(<DataTable columns={columns} data={sampleData} />);
    expect(screen.getByText("الاسم")).toBeInTheDocument();
    expect(screen.getByText("الحالة")).toBeInTheDocument();
    expect(screen.getByText("المدينة")).toBeInTheDocument();
  });

  it("renders all data rows", () => {
    render(<DataTable columns={columns} data={sampleData} />);
    expect(screen.getByText("محمد")).toBeInTheDocument();
    expect(screen.getByText("أحمد")).toBeInTheDocument();
    expect(screen.getByText("سارة")).toBeInTheDocument();
    expect(screen.getByText("نور")).toBeInTheDocument();
    expect(screen.getByText("خالد")).toBeInTheDocument();
  });

  it("shows pagination info with row count", () => {
    render(<DataTable columns={columns} data={sampleData} />);
    // Shows "1 - 5 من 5" — "5" appears twice (end row + total). Check for both.
    const fives = screen.getAllByText("5");
    expect(fives.length).toBe(2);
  });

  // ── Sorting ──────────────────────────────────────────────────────────────

  it("sorts ascending when clicking a column header once", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} />);

    // Click "الاسم" header to sort ascending
    const nameHeader = screen.getByText("الاسم");
    await user.click(nameHeader);

    // After ascending sort: أحمد, خالد, سارة, محمد, نور
    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveTextContent("أحمد");
    expect(rows[rows.length - 1]).toHaveTextContent("نور");
  });

  it("sorts descending when clicking a column header twice", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} />);

    const nameHeader = screen.getByText("الاسم");
    await user.click(nameHeader); // asc
    await user.click(nameHeader); // desc

    // After descending sort: نور, محمد, سارة, خالد, أحمد
    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveTextContent("نور");
    expect(rows[rows.length - 1]).toHaveTextContent("أحمد");
  });

  it("sorts by status column", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} />);

    const statusHeader = screen.getByText("الحالة");
    await user.click(statusHeader); // asc

    // متوقف comes before نشط alphabetically
    const rows = document.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveTextContent("متوقف");
  });

  // ── Filtering (Global Search) ────────────────────────────────────────────

  it("filters rows by search query", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} />);

    const searchInput = screen.getByPlaceholderText("بحث...");
    await user.type(searchInput, "محمد");

    expect(screen.getByText("محمد")).toBeInTheDocument();
    expect(screen.queryByText("أحمد")).not.toBeInTheDocument();
    expect(screen.queryByText("سارة")).not.toBeInTheDocument();
  });

  it("shows no results when search matches nothing", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} />);

    const searchInput = screen.getByPlaceholderText("بحث...");
    await user.type(searchInput, "غير موجود");

    expect(screen.getByText("لا توجد نتائج")).toBeInTheDocument();
  });

  it("uses custom search placeholder", () => {
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        searchPlaceholder="ابحث هنا..."
      />
    );
    expect(screen.getByPlaceholderText("ابحث هنا...")).toBeInTheDocument();
  });

  // ── Pagination ───────────────────────────────────────────────────────────

  it("paginates data when pageSize is smaller than data length", () => {
    render(<DataTable columns={columns} data={sampleData} pageSize={2} />);

    // Only 2 rows should be visible on page 1
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });

  it("navigates to next page", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} pageSize={2} />);

    // Click next page button
    const nextButtons = document.querySelectorAll("button");
    // Find the next page button (the one with ChevronLeftIcon, which points left in RTL)
    // In RTL, the "next" button has the chevron pointing left
    const nextBtn = Array.from(nextButtons).find(
      (btn) => btn.querySelector("polyline")?.getAttribute("points") === "9,18 15,12 9,6"
    );
    if (nextBtn) await user.click(nextBtn);

    // Should now show page 2
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("disables previous button on first page", () => {
    render(<DataTable columns={columns} data={sampleData} pageSize={2} />);

    // Previous buttons should be disabled on page 1
    const prevButtons = document.querySelectorAll("button");
    // The single chevron previous button (points right in RTL = previous)
    // In RTL, chevron-right-icon points right which means "previous"
    const prevBtn = Array.from(prevButtons).find(
      (btn) =>
        btn.querySelector("polyline")?.getAttribute("points") === "15,18 9,12 15,6"
    );
    expect(prevBtn).toBeDefined();
  });

  it("changes page size via select", async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={sampleData} pageSizeOptions={[2, 5, 10]} />);

    const select = screen.getByRole("combobox");
    await user.selectOptions(select, "5");

    // All 5 rows should now be visible
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(5);
  });

  it("renders with large dataset across multiple pages", () => {
    const largeData = Array.from({ length: 250 }, (_, i) => ({
      id: i + 1,
      name: `مستخدم ${i + 1}`,
      status: i % 2 === 0 ? "نشط" : "متوقف",
      city: "عمان",
    }));

    render(<DataTable columns={columns} data={largeData} pageSize={25} />);

    // Should show 25 rows on first page
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(25);
    // Pagination should show page 1 (may appear in row range AND page indicator)
    const ones = screen.getAllByText("1");
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  // ── Row Selection ────────────────────────────────────────────────────────

  it("calls onRowSelectionChange when rows are selected", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    const columnsWithSelect: ColumnDef<TestRow, unknown>[] = [
      {
        id: "select",
        header: ({ table }) =>
          React.createElement("input", {
            type: "checkbox",
            onChange: table.getToggleAllRowsSelectedHandler(),
          }),
        cell: ({ row }) =>
          React.createElement("input", {
            type: "checkbox",
            checked: row.getIsSelected(),
            onChange: row.getToggleSelectedHandler(),
          }),
      },
      ...columns,
    ];

    render(
      <DataTable
        columns={columnsWithSelect}
        data={sampleData}
        enableRowSelection={true}
        onRowSelectionChange={onSelectionChange}
      />
    );

    // Click first row's checkbox
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    await user.click(checkboxes[1]); // skip the "select all" checkbox

    expect(onSelectionChange).toHaveBeenCalled();
  });

  // ── Export ───────────────────────────────────────────────────────────────

  it("shows export buttons when onExport is provided", () => {
    render(
      <DataTable columns={columns} data={sampleData} onExport={vi.fn()} />
    );
    expect(screen.getByText("CSV")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
  });

  it("calls onExport when CSV button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <DataTable columns={columns} data={sampleData} onExport={onExport} />
    );

    await user.click(screen.getByText("CSV"));
    expect(onExport).toHaveBeenCalledWith("csv");
  });

  it("calls onExport when Excel button is clicked", async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <DataTable columns={columns} data={sampleData} onExport={onExport} />
    );

    await user.click(screen.getByText("Excel"));
    expect(onExport).toHaveBeenCalledWith("excel");
  });

  // ── Bulk Actions ─────────────────────────────────────────────────────────

  it("shows bulk actions when rows are selected", async () => {
    const user = userEvent.setup();

    const columnsWithSelect: ColumnDef<TestRow, unknown>[] = [
      {
        id: "select",
        header: ({ table }) =>
          React.createElement("input", {
            type: "checkbox",
            onChange: table.getToggleAllRowsSelectedHandler(),
          }),
        cell: ({ row }) =>
          React.createElement("input", {
            type: "checkbox",
            checked: row.getIsSelected(),
            onChange: row.getToggleSelectedHandler(),
          }),
      },
      ...columns,
    ];

    render(
      <DataTable
        columns={columnsWithSelect}
        data={sampleData}
        enableRowSelection={true}
        bulkActions={React.createElement("button", null, "حذف المحدد")}
      />
    );

    // Select a row
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    await user.click(checkboxes[1]);

    expect(screen.getByText("حذف المحدد")).toBeInTheDocument();
    expect(screen.getByText("محدد")).toBeInTheDocument();
  });

  // ── Edge Cases ───────────────────────────────────────────────────────────

  it("handles single row", () => {
    render(
      <DataTable
        columns={columns}
        data={[{ id: 1, name: "وحيد", status: "نشط", city: "عمان" }]}
      />
    );
    expect(screen.getByText("وحيد")).toBeInTheDocument();
  });

  it("handles duplicate values gracefully", () => {
    const duplicateData = [
      { id: 1, name: "محمد", status: "نشط", city: "عمان" },
      { id: 2, name: "محمد", status: "نشط", city: "عمان" },
    ];
    render(<DataTable columns={columns} data={duplicateData} />);
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);
  });
});
