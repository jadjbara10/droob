// ============================================================================
// دروب (Droob) — Sidebar Tests
// ============================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import * as AuthProviderMod from "@/components/AuthProvider";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AuthProvider
vi.mock("@/components/AuthProvider", () => ({
  useAuth: vi.fn(),
}));

const navItems = [
  { href: "/", label: "الرئيسية", icon: "🏠" },
  { href: "/routes", label: "الخطوط", icon: "🚌" },
  { href: "/fleet", label: "الأسطول", icon: "🚛" },
];

const mockUseAuth = AuthProviderMod.useAuth as ReturnType<typeof vi.fn>;

function setAuthUser(user: Partial<{
  id: string; email: string; name_ar: string; role: string; governorate: string;
}> | null, logout = vi.fn()) {
  mockUseAuth.mockReturnValue({ user, logout });
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthUser({
      id: "u1",
      email: "admin@droob.jo",
      name_ar: "محمد أحمد",
      role: "admin",
      governorate: "عمان",
    });
  });

  it("renders the brand name دروب", () => {
    render(<Sidebar items={navItems} />);
    expect(screen.getByText("دروب")).toBeInTheDocument();
    expect(screen.getByText("لوحة التحكم")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    render(<Sidebar items={navItems} />);
    navItems.forEach((item) => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      expect(screen.getByText(item.icon)).toBeInTheDocument();
    });
  });

  it("highlights the active route", () => {
    render(<Sidebar items={navItems} />);
    const activeLink = screen.getByText("الرئيسية").closest("a");
    expect(activeLink?.className).toContain("bg-[#1A4F8A]");
    expect(activeLink?.className).toContain("text-white");
  });

  it("does not highlight inactive routes", () => {
    render(<Sidebar items={navItems} />);
    const inactiveLink = screen.getByText("الخطوط").closest("a");
    expect(inactiveLink?.className).toContain("text-gray-600");
    expect(inactiveLink?.className).not.toContain("bg-[#1A4F8A]");
  });

  it("displays user name in footer", () => {
    render(<Sidebar items={navItems} />);
    expect(screen.getByText("محمد أحمد")).toBeInTheDocument();
  });

  it("displays role label", () => {
    render(<Sidebar items={navItems} />);
    expect(screen.getByText("مدير النظام")).toBeInTheDocument();
  });

  it("shows user initials", () => {
    render(<Sidebar items={navItems} />);
    // "محمد أحمد" initials: م + أ = "مأ"
    expect(screen.getByText("مأ")).toBeInTheDocument();
  });

  it("shows default initials for missing name", () => {
    setAuthUser({ id: "u2", email: "viewer@droob.jo", name_ar: "", role: "viewer" });

    render(<Sidebar items={navItems} />);
    expect(screen.getByText("م")).toBeInTheDocument();
  });

  it("displays viewer role label", () => {
    setAuthUser({ id: "u3", email: "v@b.com", name_ar: "علي", role: "viewer" });

    render(<Sidebar items={navItems} />);
    expect(screen.getByText("مطّلع")).toBeInTheDocument();
  });

  it("calls logout on تسجيل الخروج button click", () => {
    const mockLogoutFn = vi.fn();
    setAuthUser({
      id: "u1",
      email: "admin@droob.jo",
      name_ar: "محمد أحمد",
      role: "admin",
    }, mockLogoutFn);

    render(<Sidebar items={navItems} />);
    const logoutBtn = screen.getByText("تسجيل الخروج").closest("button");
    expect(logoutBtn).not.toBeNull();
    fireEvent.click(logoutBtn!);
    expect(mockLogoutFn).toHaveBeenCalledTimes(1);
  });

  it("has the correct nav item count", () => {
    render(<Sidebar items={navItems} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(navItems.length);
  });
});