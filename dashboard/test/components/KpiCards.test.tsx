// ============================================================================
// دروب (Droob) — KpiCards Tests
// ============================================================================
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCards } from "@/components/KpiCards";
import type { KpiData } from "@/components/KpiCards";

describe("KpiCards", () => {
  it("renders all 5 KPI cards with correct data", () => {
    const kpiData: KpiData = {
      active_users: 1250,
      trips_today: 18720,
      vehicles_active: 48,
      vehicles_total: 55,
      avg_delay_minutes: 3.2,
    };

    render(<KpiCards data={kpiData} />);

    // Card titles should be present
    expect(screen.getByText("المستخدمين النشطين")).toBeInTheDocument();
    expect(screen.getByText("الرحلات اليوم")).toBeInTheDocument();
    expect(screen.getByText("المركبات النشطة")).toBeInTheDocument();
    expect(screen.getByText("إجمالي المركبات")).toBeInTheDocument();
    expect(screen.getByText("متوسط التأخير")).toBeInTheDocument();

    // Numeric values — use regex to match both Arabic-Indic and Western digits
    expect(screen.getByText(/[1١][,٬]?[2٢][5٥][0٠]/)).toBeInTheDocument(); // 1250
    expect(screen.getByText(/[1١][8٨][,٬]?[7٧][2٢][0٠]/)).toBeInTheDocument(); // 18720
    expect(screen.getByText("48 / 55")).toBeInTheDocument();
    expect(screen.getByText(/[3٣]\.[3٣]?[2٢]/)).toBeInTheDocument(); // 3.2
    expect(screen.getByText("دقيقة")).toBeInTheDocument();
  });

  it("renders with zero values", () => {
    const kpiData: KpiData = {
      active_users: 0,
      trips_today: 0,
      vehicles_active: 0,
      vehicles_total: 0,
      avg_delay_minutes: 0,
    };

    render(<KpiCards data={kpiData} />);
    // "0 / 0" appears as direct text
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
  });

  it("renders large number with comma formatting", () => {
    const kpiData: KpiData = {
      active_users: 999999,
      trips_today: 1234567,
      vehicles_active: 500,
      vehicles_total: 520,
      avg_delay_minutes: 15.7,
    };

    render(<KpiCards data={kpiData} />);
    expect(screen.getByText(/[9٩]{3}[,٬]?[9٩]{3}/)).toBeInTheDocument(); // 999,999
    expect(screen.getByText(/[1١][,٬]?[2٢][3٣][4٤][,٬]?[5٥][6٦][7٧]/)).toBeInTheDocument(); // 1,234,567
    expect(screen.getByText("500 / 520")).toBeInTheDocument();
    expect(screen.getByText(/[1١][5٥]\.[7٧]/)).toBeInTheDocument(); // 15.7
  });

  it("renders skeleton when data is undefined", () => {
    render(<KpiCards />);
    // 5 skeleton cards
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(5);
  });
});