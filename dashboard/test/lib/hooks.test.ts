// ============================================================================
// دروب (Droob) — Dashboard Hooks Tests
// ============================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { createElement, useState, useCallback } from "react";
import {
  useApi,
  useApiPolling,
  useMutation,
  useKpis,
  useHourlyTrips,
  useTopStops,
  useRoutes,
  useStops,
  useVehicles,
  useAlerts,
  useDailyStats,
  useRetentionCohorts,
  useSettings,
  useUpdateSettings,
} from "@/lib/hooks";

// Mock all API functions
vi.mock("@/lib/api", () => {
  return {
    fetchKpis: vi.fn(),
    fetchHourlyTrips: vi.fn(),
    fetchTopStops: vi.fn(),
    fetchRoutes: vi.fn(),
    updateRoute: vi.fn(),
    fetchStops: vi.fn(),
    createStop: vi.fn(),
    fetchVehicles: vi.fn(),
    addVehicle: vi.fn(),
    fetchAlerts: vi.fn(),
    createAlert: vi.fn(),
    broadcastAlert: vi.fn(),
    fetchDailyStats: vi.fn(),
    fetchRetentionCohorts: vi.fn(),
    downloadReport: vi.fn(),
    fetchSettings: vi.fn(),
    updateSettings: vi.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mocked = await import("@/lib/api");
// Individual typed mocks
const mockFetchKpis = mocked.fetchKpis as ReturnType<typeof vi.fn>;
const mockFetchHourlyTrips = mocked.fetchHourlyTrips as ReturnType<typeof vi.fn>;
const mockFetchTopStops = mocked.fetchTopStops as ReturnType<typeof vi.fn>;
const mockFetchRoutes = mocked.fetchRoutes as ReturnType<typeof vi.fn>;
const mockFetchStops = mocked.fetchStops as ReturnType<typeof vi.fn>;
const mockFetchVehicles = mocked.fetchVehicles as ReturnType<typeof vi.fn>;
const mockFetchAlerts = mocked.fetchAlerts as ReturnType<typeof vi.fn>;
const mockFetchDailyStats = mocked.fetchDailyStats as ReturnType<typeof vi.fn>;
const mockFetchRetentionCohorts = mocked.fetchRetentionCohorts as ReturnType<typeof vi.fn>;
const mockFetchSettings = mocked.fetchSettings as ReturnType<typeof vi.fn>;
const mockUpdateSettings = mocked.updateSettings as ReturnType<typeof vi.fn>;
const mockCreateStop = mocked.createStop as ReturnType<typeof vi.fn>;

const createWrapper = () => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return children;
  };
};

describe("useApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state and returns data on success", async () => {
    const mockData = { items: [1, 2, 3] };
    const fetcher = vi.fn().mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useApi(fetcher), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("sets error on fetch failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("فشل الاتصال بالخادم"));

    const { result } = renderHook(() => useApi(fetcher), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("فشل الاتصال بالخادم");
  });

  it("sets generic error for non-Error rejections", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce("string error");

    const { result } = renderHook(() => useApi(fetcher), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("string error");
  });

  it("does not update state when unmounted", async () => {
    const fetcher = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 100))
    );
    const { result, unmount } = renderHook(() => useApi(fetcher), { wrapper: createWrapper() });

    // Unmount before the promise resolves
    unmount();

    // Wait a bit — should not throw or update state
    await new Promise((r) => setTimeout(r, 200));
    // No assertion needed — test passes if no errors
  });

  it("supports refetch", async () => {
    let data = { v: 1 };
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(data));

    const { result } = renderHook(() => useApi(fetcher), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.data).toEqual({ v: 1 });

    data = { v: 2 };
    fetcher.mockResolvedValueOnce(data);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ v: 2 });
    });
  });
});

describe("useApiPolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches data and refreshes on interval", async () => {
    const mockData = { x: 1 };
    const fetcher = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useApiPolling(fetcher, 5000), { wrapper: createWrapper() });

    // Initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);

    // After interval, fetcher called again
    const mockData2 = { x: 2 };
    fetcher.mockResolvedValueOnce(mockData2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(result.current.data).toEqual(mockData2);
  });
});

describe("useMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes mutation and returns result", async () => {
    const mutator = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useMutation(mutator), { wrapper: createWrapper() });

    let output: unknown;
    await act(async () => {
      output = await result.current.execute("arg1", "arg2");
    });

    expect(output).toEqual({ success: true });
    expect(mutator).toHaveBeenCalledWith("arg1", "arg2");
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error state on failure", async () => {
    const mutator = vi.fn().mockRejectedValue(new Error("فشلت العملية"));
    const { result } = renderHook(() => useMutation(mutator), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.execute(); } catch { /* expected */ }
    });

    expect(result.current.error).toBe("فشلت العملية");
    expect(result.current.loading).toBe(false);
  });

  it("resetError clears the error", async () => {
    const mutator = vi.fn().mockRejectedValue(new Error("فشلت العملية"));
    const { result } = renderHook(() => useMutation(mutator), { wrapper: createWrapper() });

    await act(async () => {
      try { await result.current.execute(); } catch { /* expected */ }
    });

    expect(result.current.error).toBe("فشلت العملية");

    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe("Specific Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── useKpis ────────────────────────────────────────────────────────
  it("useKpis polls fetchKpis every 30s", async () => {
    const mockKpis = { active_users: 150, trips_today: 2300, vehicles_active: 45, vehicles_total: 52, avg_delay_minutes: 2.3 };
    mockFetchKpis.mockResolvedValue(mockKpis);

    const { result } = renderHook(() => useKpis(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    expect(result.current.data).toEqual(mockKpis);
    expect(mockFetchKpis).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(mockFetchKpis).toHaveBeenCalledTimes(2);
  });

  // ─── useHourlyTrips ────────────────────────────────────────────────
  it("useHourlyTrips fetches once", async () => {
    const mockTrips = [{ hour: "08:00", count: 350 }];
    mockFetchHourlyTrips.mockResolvedValue(mockTrips);

    const { result } = renderHook(() => useHourlyTrips(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data).toEqual(mockTrips);
  });

  // ─── useTopStops ───────────────────────────────────────────────────
  it("useTopStops fetches top stops", async () => {
    const mockTop = [{ name_ar: "أ", name_en: "A", count: 500 }];
    mockFetchTopStops.mockResolvedValue(mockTop);

    const { result } = renderHook(() => useTopStops(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.[0]?.count).toBe(500);
  });

  // ─── useRoutes ─────────────────────────────────────────────────────
  it("useRoutes fetches routes", async () => {
    mockFetchRoutes.mockResolvedValue([{ id: "r1", code: "B1" }]);

    const { result } = renderHook(() => useRoutes(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data).toHaveLength(1);
  });

  // ─── useStops ──────────────────────────────────────────────────────
  it("useStops fetches stops", async () => {
    mockFetchStops.mockResolvedValue([{ id: "s1", name_ar: "محطة" }]);

    const { result } = renderHook(() => useStops(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.[0]?.id).toBe("s1");
  });

  // ─── useVehicles (polls every 15s) ──────────────────────────────────
  it("useVehicles polls every 15s", async () => {
    mockFetchVehicles.mockResolvedValue([{ id: "v1" }]);

    const { result } = renderHook(() => useVehicles(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockFetchVehicles).toHaveBeenCalledTimes(1);
    expect(result.current.data).toHaveLength(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(mockFetchVehicles).toHaveBeenCalledTimes(2);
  });

  // ─── useAlerts (polls every 30s) ────────────────────────────────────
  it("useAlerts polls every 30s", async () => {
    mockFetchAlerts.mockResolvedValue([{ id: "a1", severity: "high" }]);

    const { result } = renderHook(() => useAlerts(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.[0]?.severity).toBe("high");

    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(mockFetchAlerts).toHaveBeenCalledTimes(2);
  });

  // ─── useDailyStats ─────────────────────────────────────────────────
  it("useDailyStats passes days parameter", async () => {
    mockFetchDailyStats.mockResolvedValue([{ day: "2026-01-01", dau: 1200, trips: 5000 }]);

    const { result } = renderHook(() => useDailyStats(7), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(mockFetchDailyStats).toHaveBeenCalledWith(7);
    expect(result.current.data).toHaveLength(1);
  });

  // ─── useRetentionCohorts ───────────────────────────────────────────
  it("useRetentionCohorts fetches retention data", async () => {
    mockFetchRetentionCohorts.mockResolvedValue([{ week: "W01", rate: 0.75 }]);

    const { result } = renderHook(() => useRetentionCohorts(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.[0]?.rate).toBe(0.75);
  });

  // ─── useSettings ───────────────────────────────────────────────────
  it("useSettings fetches settings", async () => {
    mockFetchSettings.mockResolvedValue({ site_name: "دروب" });

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.site_name).toBe("دروب");
  });

  // ─── useUpdateSettings ─────────────────────────────────────────────
  it("useUpdateSettings calls updateSettings mutator", async () => {
    mockUpdateSettings.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateSettings(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute({ site_name: "New" });
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({ site_name: "New" });
  });
});

describe("useMutation for stop creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useCreateStop calls createStop", async () => {
    const useCreateStop = (await import("@/lib/hooks")).useCreateStop;
    mockCreateStop.mockResolvedValue({ id: "s-new", name_ar: "جديدة" });

    const { result } = renderHook(() => useCreateStop(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.execute({ name_ar: "جديدة" });
    });

    expect(mockCreateStop).toHaveBeenCalledWith({ name_ar: "جديدة" });
  });
});