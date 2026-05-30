// ============================================================================
// دروب (Droob) — DashboardShell Tests
// ============================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement, ReactNode } from "react";
import DashboardShell from "@/components/DashboardShell";

// Configurable pathname for mocking usePathname
let mockPathname = "/";
const mockUseRouter = () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() });

vi.mock("next/navigation", () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AuthProvider
const mockUseAuth = vi.fn(() => ({ user: null, loading: false }));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Sidebar
vi.mock("@/components/Sidebar", () => ({
  default: ({ items }: { items: { href: string; label: string; icon: string }[] }) =>
    createElement("nav", { "data-testid": "sidebar" }, items.map((it) =>
      createElement("span", { key: it.href }, it.label)
    )),
}));

// Mock Spinner
vi.mock("@/components/ui/Spinner", () => ({
  LoadingSpinner: ({ className }: { className?: string }) =>
    createElement("div", { "data-testid": "spinner", className }),
}));

const navItems = [
  { href: "/", label: "الرئيسية", icon: "🏠" },
  { href: "/routes", label: "الخطوط", icon: "🚌" },
  { href: "/fleet", label: "الأسطول", icon: "🚛" },
];

describe("DashboardShell", () => {
  describe("loading state", () => {
    it("renders LoadingSpinner when loading is true", () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      render(createElement(DashboardShell, { children: createElement("div", null, "content") }));
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      expect(screen.queryByText("content")).not.toBeInTheDocument();
    });
  });

  describe("public paths — /login", () => {
    beforeEach(() => {
      mockPathname = "/login";
      mockUseAuth.mockReturnValue({ user: null, loading: false });
    });

    it("renders children without sidebar for /login", () => {
      render(createElement(DashboardShell, { children: createElement("div", null, "صفحة الدخول") }));
      // Sidebar should not be present
      expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
      expect(screen.getByText("صفحة الدخول")).toBeInTheDocument();
    });
  });

  describe("protected paths — with sidebar", () => {
    beforeEach(() => {
      mockPathname = "/routes";
      mockUseAuth.mockReturnValue({ user: { id: "u1", email: "a@b.com", name_ar: "مدير", role: "admin" } as any, loading: false });
    });

    it("renders sidebar and main content", () => {
      render(createElement(DashboardShell, { children: createElement("div", null, "الصفحة المحمية") }));
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByText("الصفحة المحمية")).toBeInTheDocument();
    });

    it("does not render spinner when loaded", () => {
      render(createElement(DashboardShell, { children: createElement("div", null, "content") }));
      expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
    });
  });
});