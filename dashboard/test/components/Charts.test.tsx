// ============================================================================
// دروب (Droob) — Charts Tests
// AreaChart + DonutChart rendering
// ============================================================================
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { AreaChart, DonutChart } from "@/components/ui/Charts";

// ── AreaChart ────────────────────────────────────────────────────────────────

describe("AreaChart", () => {
  it("renders SVG with viewBox", () => {
    const { container } = render(
      <AreaChart data={[{ label: "06:00", value: 80 }]} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox");
    expect(svg).toHaveAttribute("aria-label", "Area chart showing trips per hour");
  });

  it("renders with single data point", () => {
    const { container } = render(
      <AreaChart data={[{ label: "12:00", value: 300 }]} />
    );
    // Should render at least one circle for the data point
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders with multiple data points", () => {
    const { container } = render(
      <AreaChart
        data={[
          { label: "06:00", value: 80 },
          { label: "07:00", value: 250 },
          { label: "08:00", value: 400 },
          { label: "09:00", value: 350 },
        ]}
      />
    );
    // Should render paths for area fill and line
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("renders X-axis labels", () => {
    render(
      <AreaChart
        data={[
          { label: "06:00", value: 80 },
          { label: "07:00", value: 250 },
        ]}
      />
    );
    expect(screen.getByText("06:00")).toBeInTheDocument();
    expect(screen.getByText("07:00")).toBeInTheDocument();
  });

  it("renders Y-axis labels in Arabic locale", () => {
    render(
      <AreaChart
        data={[
          { label: "06:00", value: 80 },
          { label: "07:00", value: 250 },
        ]}
      />
    );
    // Should render Y-axis values with Arabic-Indic digits
    const yLabels = document.querySelectorAll("text");
    const yTexts = Array.from(yLabels).map((t) => t.textContent);
    const arabicLabels = yTexts.filter((t) => t && /[٠-٩]/.test(t));
    expect(arabicLabels.length).toBeGreaterThan(0);
  });

  it("renders gradient definition", () => {
    const { container } = render(
      <AreaChart data={[{ label: "06:00", value: 80 }]} />
    );
    const gradient = container.querySelector("linearGradient");
    expect(gradient).toBeInTheDocument();
    expect(gradient?.id).toBe("areaGrad");
  });

  it("applies custom color", () => {
    const { container } = render(
      <AreaChart
        data={[{ label: "06:00", value: 80 }]}
        color="#FF0000"
      />
    );
    // The stroke on the line path should be #FF0000
    const paths = container.querySelectorAll("path");
    const linePath = Array.from(paths).find(
      (p) => p.getAttribute("fill") === "none"
    );
    expect(linePath).toBeInTheDocument();
    expect(linePath?.getAttribute("stroke")).toBe("#FF0000");
  });

  it("renders with custom height", () => {
    const { container } = render(
      <AreaChart
        data={[{ label: "06:00", value: 80 }]}
        height={400}
      />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders grid lines", () => {
    const { container } = render(
      <AreaChart
        data={[
          { label: "06:00", value: 80 },
          { label: "07:00", value: 250 },
        ]}
      />
    );
    // Grid lines are rendered as <line> elements with strokeDasharray
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBeGreaterThan(0);
  });

  it("handles zero values", () => {
    const { container } = render(
      <AreaChart
        data={[
          { label: "06:00", value: 0 },
          { label: "07:00", value: 0 },
        ]}
      />
    );
    // Should still render paths even with all zeros
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("handles large values", () => {
    const { container } = render(
      <AreaChart
        data={[
          { label: "A", value: 999999 },
          { label: "B", value: 1 },
        ]}
      />
    );
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("renders with many data points (24 hours)", () => {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      label: `${String(i).padStart(2, "0")}:00`,
      value: Math.floor(Math.random() * 500),
    }));
    const { container } = render(<AreaChart data={hourlyData} />);
    // Should have circles for data points (with skip logic for many points)
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThan(0);
  });
});

// ── DonutChart ───────────────────────────────────────────────────────────────

describe("DonutChart", () => {
  const sampleData = [
    { name: "عمان", value: 150, color: "#1A4F8A" },
    { name: "إربد", value: 80, color: "#2E7D32" },
    { name: "الزرقاء", value: 45, color: "#E65100" },
  ];

  it("renders SVG with viewBox", () => {
    const { container } = render(<DonutChart data={sampleData} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox");
  });

  it("renders total in center text", () => {
    render(<DonutChart data={sampleData} />);
    // Total = 150 + 80 + 45 = 275, rendered as Arabic text
    expect(screen.getByText("رحلة")).toBeInTheDocument();
    // The total should be rendered (we check for the SVG text element presence)
    const centerText = document.querySelectorAll("svg text");
    const totalTexts = Array.from(centerText).filter((t) =>
      /[٠-٩]/.test(t.textContent || "")
    );
    expect(totalTexts.length).toBeGreaterThan(0);
  });

  it("renders legend items", () => {
    render(<DonutChart data={sampleData} />);
    expect(screen.getByText("عمان")).toBeInTheDocument();
    expect(screen.getByText("إربد")).toBeInTheDocument();
    expect(screen.getByText("الزرقاء")).toBeInTheDocument();
  });

  it("renders legend percentage labels", () => {
    render(<DonutChart data={sampleData} />);
    // "150 / 275 = 54.5% → 55%" roughly, "80 / 275 = 29%", "45 / 275 = 16%"
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("29%")).toBeInTheDocument();
    expect(screen.getByText("16%")).toBeInTheDocument();
  });

  it("renders background circle", () => {
    const { container } = render(<DonutChart data={sampleData} />);
    const circles = container.querySelectorAll("circle");
    // Background ring + any other circles? DonutChart has only one <circle> for bg
    expect(circles.length).toBe(1);
  });

  it("renders segment paths for each data point", () => {
    const { container } = render(<DonutChart data={sampleData} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(sampleData.length);
  });

  it("renders with single segment", () => {
    const { container } = render(
      <DonutChart data={[{ name: "عمان", value: 100, color: "#1A4F8A" }]} />
    );
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(1);
  });

  it("renders with custom size", () => {
    const { container } = render(
      <DonutChart data={sampleData} size={300} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "300");
    expect(svg).toHaveAttribute("height", "300");
  });

  it("handles zero total gracefully", () => {
    const { container } = render(
      <DonutChart data={[{ name: "فارغ", value: 0, color: "#999" }]} />
    );
    // Should still render SVG even with zero data
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders colored legend dots", () => {
    const { container } = render(<DonutChart data={sampleData} />);
    const coloredSpans = container.querySelectorAll("span.rounded-full");
    expect(coloredSpans.length).toBe(sampleData.length);
    expect(coloredSpans[0]).toHaveStyle({ backgroundColor: "#1A4F8A" });
  });

  it("handles many segments", () => {
    const manySegments = Array.from({ length: 10 }, (_, i) => ({
      name: `قسم ${i + 1}`,
      value: (i + 1) * 10,
      color: `hsl(${i * 36}, 70%, 50%)`,
    }));
    const { container } = render(<DonutChart data={manySegments} />);
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBe(10);
  });
});
