// ============================================================================
// دروب (Droob) — TripChart Tests
// ============================================================================
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { TripDataPoint } from "@/components/TripChart";

// Mock recharts ResponsiveContainer to render children in test
vi.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockResponsiveContainer = ({ children }: any) =>
    React.createElement(
      "div",
      { "data-testid": "responsive-container" },
      children
    );
  return {
    AreaChart: ({ children }: any) =>
      React.createElement("div", { "data-testid": "area-chart" }, children),
    Area: () => React.createElement("div", { "data-testid": "area" }),
    XAxis: () => React.createElement("div", { "data-testid": "xaxis" }),
    YAxis: () => React.createElement("div", { "data-testid": "yaxis" }),
    CartesianGrid: () =>
      React.createElement("div", { "data-testid": "cartesian-grid" }),
    Tooltip: () => React.createElement("div", { "data-testid": "tooltip" }),
    ResponsiveContainer: MockResponsiveContainer,
  };
});

import { TripChart } from "@/components/TripChart";

describe("TripChart", () => {
  it("renders empty state when data is empty", () => {
    render(<TripChart data={[]} />);
    expect(screen.getByText("لا توجد بيانات للرحلات")).toBeInTheDocument();
  });

  it("renders chart with valid data", () => {
    const data: TripDataPoint[] = [
      { hour: "06:00", count: 80 },
      { hour: "07:00", count: 250 },
      { hour: "08:00", count: 400 },
      { hour: "09:00", count: 350 },
    ];

    render(<TripChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("displays title", () => {
    render(<TripChart data={[{ hour: "08:00", count: 100 }]} />);
    expect(screen.getByText("الرحلات حسب الساعة")).toBeInTheDocument();
  });

  it("handles single data point", () => {
    const data: TripDataPoint[] = [{ hour: "14:00", count: 500 }];
    render(<TripChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("handles large dataset", () => {
    const data: TripDataPoint[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}:00`,
      count: Math.floor(Math.random() * 1000),
    }));
    render(<TripChart data={data} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders loading skeleton", () => {
    render(<TripChart data={[]} loading={true} />);
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});