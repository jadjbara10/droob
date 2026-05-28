// ============================================================================
// دروب (Droob) — Dashboard API Functions Tests
// ============================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  fetchKpis,
  fetchHourlyTrips,
  fetchTopStops,
  fetchRoutes,
  updateRoute,
  fetchStops,
  createStop,
  fetchVehicles,
  addVehicle,
  fetchAlerts,
  createAlert,
  broadcastAlert,
  fetchDailyStats,
  fetchRetentionCohorts,
  downloadReport,
  updateSettings,
  fetchSettings,
  login,
  logout,
  refreshTokens,
  fetchProfile,
  updateProfile,
  isAuthenticated,
} from "@/lib/api";

const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

const createJsonResponse = (data: unknown, status = 200): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response;
};

describe("API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ─── Helper: apiFetch through fetchKpis ───────────────────────────
  describe("authenticated fetch (via fetchKpis)", () => {
    it("returns JSON data on 200", async () => {
      const mockData: import("@/lib/api").KpiResponse = {
        active_users: 150,
        trips_today: 2300,
        vehicles_active: 45,
        vehicles_total: 52,
        avg_delay_minutes: 2.3,
      };
      mockFetch.mockResolvedValueOnce(createJsonResponse(mockData, 200));

      const result = await fetchKpis();
      expect(result).toEqual(mockData);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/dashboard/kpis"),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      );
    });

    it("attaches Authorization header when token stored", async () => {
      localStorage.setItem("droob_access_token", "test-jwt-token");
      mockFetch.mockResolvedValueOnce(createJsonResponse({ active_users: 0, trips_today: 0, vehicles_active: 0, vehicles_total: 0, avg_delay_minutes: 0 }));

      await fetchKpis();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer test-jwt-token" }),
        })
      );
    });

    it("throws on 401 and clears tokens", async () => {
      localStorage.setItem("droob_access_token", "old-token");
      localStorage.setItem("droob_refresh_token", "old-refresh");
      mockFetch.mockResolvedValueOnce(createJsonResponse({}, 401));

      await expect(fetchKpis()).rejects.toThrow(/انتهت الجلسة/);
      expect(localStorage.getItem("droob_access_token")).toBeNull();
      expect(localStorage.getItem("droob_refresh_token")).toBeNull();
    });

    it("throws on non-ok non-401 response", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ error: "server error" }, 500));

      await expect(fetchKpis()).rejects.toThrow("API 500");
    });

    it("throws network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network Error"));
      await expect(fetchKpis()).rejects.toThrow("Network Error");
    });
  });

  // ─── fetchHourlyTrips ──────────────────────────────────────────────
  describe("fetchHourlyTrips", () => {
    it("returns trip data array", async () => {
      const mockData = [
        { hour: "07:00", count: 120 },
        { hour: "08:00", count: 350 },
      ];
      mockFetch.mockResolvedValueOnce(createJsonResponse(mockData));
      const result = await fetchHourlyTrips();
      expect(result).toEqual(mockData);
    });
  });

  // ─── fetchTopStops ─────────────────────────────────────────────────
  describe("fetchTopStops", () => {
    it("returns top stops array", async () => {
      const mockData = [
        { name_ar: "محطة أ", name_en: "Stop A", count: 500 },
        { name_ar: "محطة ب", name_en: "Stop B", count: 430 },
      ];
      mockFetch.mockResolvedValueOnce(createJsonResponse(mockData));
      const result = await fetchTopStops();
      expect(result).toHaveLength(2);
      expect(result[0].name_ar).toBe("محطة أ");
    });
  });

  // ─── Routes ────────────────────────────────────────────────────────
  describe("fetchRoutes", () => {
    it("calls GET /routes", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse([]));
      await fetchRoutes();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/routes"),
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      );
    });
  });

  describe("updateRoute", () => {
    it("calls PATCH /routes/:id", async () => {
      const updated = { id: "r1", code: "B1-new", name_ar: "جديد" };
      mockFetch.mockResolvedValueOnce(createJsonResponse(updated));
      const result = await updateRoute("r1", { name_ar: "جديد" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/routes/r1"),
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name_ar: "جديد" }) })
      );
      expect(result).toEqual(updated);
    });
  });

  // ─── Stops ─────────────────────────────────────────────────────────
  describe("fetchStops", () => {
    it("returns stop array", async () => {
      const stops = [{ id: "s1", code: "ST01", name_ar: "محطة", name_en: "Stop", governorate: "عمان", has_shelter: true, has_lighting: false, accessible: true, lines_count: 3 }];
      mockFetch.mockResolvedValueOnce(createJsonResponse(stops));
      const result = await fetchStops();
      expect(result).toHaveLength(1);
    });
  });

  describe("createStop", () => {
    it("calls POST /stops", async () => {
      const newStop = { name_ar: "جديدة", governorate: "عمان" };
      mockFetch.mockResolvedValueOnce(createJsonResponse({ id: "s-new", ...newStop }));
      await createStop(newStop);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/stops"),
        expect.objectContaining({ method: "POST", body: JSON.stringify(newStop) })
      );
    });
  });

  // ─── Fleet ─────────────────────────────────────────────────────────
  describe("fetchVehicles", () => {
    it("returns vehicle array", async () => {
      const vehicles = [{ id: "v1", plate: "12-3456", driver: "أحمد", line_code: "B1", lat: 31.95, lng: 35.91, speed: 40, status: "active", mode: "brt", governorate: "عمان" }];
      mockFetch.mockResolvedValueOnce(createJsonResponse(vehicles));
      const result = await fetchVehicles();
      expect(result[0].plate).toBe("12-3456");
    });
  });

  describe("addVehicle", () => {
    it("calls POST /vehicles", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ id: "v-new" }));
      await addVehicle({ plate: "99-9999", line_code: "B1" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vehicles"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  // ─── Alerts ────────────────────────────────────────────────────────
  describe("fetchAlerts", () => {
    it("returns alerts", async () => {
      const alerts = [{ id: "a1", type: "delay", severity: "high", title_ar: "تأخير", message_ar: "تأخير 15 دقيقة", affected_lines: ["B1"], affected_governorate: null, created_at: "2026-05-01", status: "active" }];
      mockFetch.mockResolvedValueOnce(createJsonResponse(alerts));
      const result = await fetchAlerts();
      expect(result[0].severity).toBe("high");
    });
  });

  describe("createAlert", () => {
    it("calls POST /alerts", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ id: "a-new" }));
      await createAlert({ type: "accident", message_ar: "حادث" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/alerts"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("broadcastAlert", () => {
    it("calls POST /alerts/:id/broadcast", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ sent: 1500 }));
      const result = await broadcastAlert("a1");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/alerts/a1/broadcast"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result.sent).toBe(1500);
    });
  });

  // ─── Analytics ─────────────────────────────────────────────────────
  describe("fetchDailyStats", () => {
    it("returns daily stats with default 30 days", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse([]));
      await fetchDailyStats();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/analytics/daily?days=30"),
        expect.any(Object)
      );
    });

    it("accepts custom day count", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse([]));
      await fetchDailyStats(7);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/analytics/daily?days=7"),
        expect.any(Object)
      );
    });
  });

  describe("fetchRetentionCohorts", () => {
    it("returns cohort data", async () => {
      const cohorts = [{ week: "2026-W01", rate: 0.78 }];
      mockFetch.mockResolvedValueOnce(createJsonResponse(cohorts));
      const result = await fetchRetentionCohorts();
      expect(result[0].rate).toBe(0.78);
    });
  });

  // ─── Reports ───────────────────────────────────────────────────────
  describe("downloadReport", () => {
    it("returns blob for given type/format", async () => {
      const blob = new Blob(["data"], { type: "application/pdf" });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: async () => blob,
      } as Response);

      const result = await downloadReport("daily", "pdf");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/reports/daily.pdf")
      );
      expect(result).toBeInstanceOf(Blob);
    });
  });

  // ─── Settings ──────────────────────────────────────────────────────
  describe("fetchSettings", () => {
    it("returns settings object", async () => {
      const settings = { site_name: "دروب", max_booking_hours: 24 };
      mockFetch.mockResolvedValueOnce(createJsonResponse(settings));
      const result = await fetchSettings();
      expect(result.site_name).toBe("دروب");
    });
  });

  describe("updateSettings", () => {
    it("calls PATCH /settings", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({}));
      await updateSettings({ site_name: "New" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/settings"),
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ site_name: "New" }) })
      );
    });
  });

  // ─── Auth ──────────────────────────────────────────────────────────
  describe("login", () => {
    it("stores tokens on success", async () => {
      const tokens = { access_token: "access-123", refresh_token: "refresh-456", expires_in: 3600 };
      mockFetch.mockResolvedValueOnce(createJsonResponse(tokens));

      const result = await login("admin@droob.jo", "pass");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "admin@droob.jo", password: "pass" }),
        })
      );
      expect(result.access_token).toBe("access-123");
      expect(localStorage.getItem("droob_access_token")).toBe("access-123");
      expect(localStorage.getItem("droob_refresh_token")).toBe("refresh-456");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "بيانات خاطئة",
      } as Response);
      await expect(login("bad@test.com", "wrong")).rejects.toThrow("بيانات خاطئة");
    });
  });

  describe("logout", () => {
    it("clears tokens even if API call fails", async () => {
      localStorage.setItem("droob_access_token", "token");
      localStorage.setItem("droob_refresh_token", "refresh");
      mockFetch.mockRejectedValueOnce(new Error("Network down"));

      await logout(); // should not throw
      expect(localStorage.getItem("droob_access_token")).toBeNull();
      expect(localStorage.getItem("droob_refresh_token")).toBeNull();
    });

    it("clears tokens on successful API call", async () => {
      localStorage.setItem("droob_access_token", "token");
      localStorage.setItem("droob_refresh_token", "refresh");
      mockFetch.mockResolvedValueOnce(createJsonResponse({}));

      await logout();
      expect(localStorage.getItem("droob_access_token")).toBeNull();
      expect(localStorage.getItem("droob_refresh_token")).toBeNull();
    });
  });

  describe("refreshTokens", () => {
    it("stores new tokens on success", async () => {
      localStorage.setItem("droob_refresh_token", "old-refresh");
      const newTokens = { access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600 };
      mockFetch.mockResolvedValueOnce(createJsonResponse(newTokens));

      const result = await refreshTokens();
      expect(result.access_token).toBe("new-access");
      expect(localStorage.getItem("droob_access_token")).toBe("new-access");
      expect(localStorage.getItem("droob_refresh_token")).toBe("new-refresh");
    });

    it("throws and clears tokens on failure", async () => {
      localStorage.setItem("droob_refresh_token", "bad-refresh");
      localStorage.setItem("droob_access_token", "some-token");
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "invalid",
      } as Response);

      await expect(refreshTokens()).rejects.toThrow(/انتهت الجلسة/);
      expect(localStorage.getItem("droob_access_token")).toBeNull();
      expect(localStorage.getItem("droob_refresh_token")).toBeNull();
    });

    it("throws if no refresh token stored", async () => {
      await expect(refreshTokens()).rejects.toThrow("انتهت الجلسة");
    });
  });

  describe("fetchProfile", () => {
    it("returns user profile", async () => {
      const profile = { id: "u1", email: "a@b.com", name_ar: "مدير", role: "admin", governorate: "عمان", avatar_url: null };
      mockFetch.mockResolvedValueOnce(createJsonResponse(profile));

      const result = await fetchProfile();
      expect(result.role).toBe("admin");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/profile"),
        expect.any(Object)
      );
    });
  });

  describe("updateProfile", () => {
    it("calls PATCH /auth/profile", async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({ id: "u1" }));
      await updateProfile({ name_ar: "اسم جديد" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/profile"),
        expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name_ar: "اسم جديد" }) })
      );
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when token exists", () => {
      localStorage.setItem("droob_access_token", "token");
      expect(isAuthenticated()).toBe(true);
    });

    it("returns false when no token", () => {
      expect(isAuthenticated()).toBe(false);
    });
  });
});