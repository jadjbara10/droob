// ============================================================================
// دروب (Droob) — Data Fetching Hooks
// ============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchKpis, fetchHourlyTrips, fetchTopStops,
  fetchRoutes, updateRoute, importGtfs,
  fetchStops, createStop, importStopsCsv, updateStop, deleteStop,
  fetchVehicles, addVehicle,
  fetchAlerts, createAlert, broadcastAlert,
  fetchDailyStats, fetchRetentionCohorts,
  fetchUsers, createUser, updateUser, deleteUser,
  fetchSettings, updateSettings,
  fetchDrivers,
  fetchReports, resolveReport,
  generateInviteCode, listInviteCodes, revokeInviteCode,
  KpiResponse, TripHour, TopStop, RouteListItem,
  StopItem, VehicleItem, AlertItem, DailyStat, UserItem, ReportItem, InviteCode,
} from "./api";

// ─── Generic useApi Hook ──────────────────────────────────────────────
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (mounted.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (mounted.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setState({ data: null, loading: false, error: msg || "فشل الاتصال بالخادم" });
      }
    }
  }, deps);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, [load]);

  return { ...state, refetch: load };
}

// ─── Auto-Refreshing Hook ────────────────────────────────────────────
export function useApiPolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = []
) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await fetcher();
      if (mounted.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (err) {
      if (mounted.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setState((s) => ({ ...s, loading: false, error: msg || "فشل الاتصال بالخادم" }));
      }
    }
  }, deps);

  useEffect(() => {
    mounted.current = true;
    load();
    const timer = setInterval(load, intervalMs);
    return () => { mounted.current = false; clearInterval(timer); };
  }, [load]);

  return { ...state, refetch: load };
}

// ─── Mutation Hook ───────────────────────────────────────────────────
export function useMutation<T, Args extends unknown[]>(
  mutator: (...args: Args) => Promise<T>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: Args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutator(...args);
      setLoading(false);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err) || "فشلت العملية";
      setError(msg);
      setLoading(false);
      throw err;
    }
  }, [mutator]);

  return { execute, loading, error, resetError: () => setError(null) };
}

// ─── Specific Hooks ──────────────────────────────────────────────────

// Dashboard KPIs — auto-refresh every 30s
export function useKpis() {
  return useApiPolling(fetchKpis, 30000);
}

export function useHourlyTrips() {
  return useApi(fetchHourlyTrips);
}

export function useTopStops() {
  return useApi(fetchTopStops);
}

// Routes
export function useRoutes() {
  return useApi(fetchRoutes);
}

export function useUpdateRoute() {
  return useMutation(updateRoute);
}

export function useImportGtfs() {
  return useMutation((file: File) => importGtfs(file));
}

// Stops
export function useStops() {
  return useApi(fetchStops);
}

export function useCreateStop() {
  return useMutation((data: Partial<StopItem>) => createStop(data));
}

export function useImportStopsCsv() {
  return useMutation((file: File) => importStopsCsv(file));
}

export function useUpdateStop() {
  return useMutation((id: string, data: Partial<StopItem>) => updateStop(id, data));
}

export function useDeleteStop() {
  return useMutation((id: string) => deleteStop(id));
}

// Fleet
export function useVehicles() {
  return useApiPolling(fetchVehicles, 15000);
}

export function useAddVehicle() {
  return useMutation((data: Partial<VehicleItem>) => addVehicle(data));
}

// Alerts
export function useAlerts() {
  return useApiPolling(fetchAlerts, 30000);
}

export function useCreateAlert() {
  return useMutation((data: Partial<AlertItem>) => createAlert(data));
}

export function useBroadcastAlert() {
  return useMutation((alertId: string) => broadcastAlert(alertId));
}

// Analytics
export function useDailyStats(days: number = 30) {
  return useApi(() => fetchDailyStats(days), [days]);
}

export function useRetentionCohorts() {
  return useApi(fetchRetentionCohorts);
}

// Users
export function useUsers() {
  return useApi(fetchUsers);
}

export function useCreateUser() {
  return useMutation((data: Partial<UserItem>) => createUser(data));
}

export function useUpdateUser() {
  return useMutation((id: string, data: Partial<UserItem>) => updateUser(id, data));
}

export function useDeleteUser() {
  return useMutation((id: string) => deleteUser(id));
}

// Settings
export function useSettings() {
  return useApi(() => fetchSettings());
}

export function useUpdateSettings() {
  return useMutation((data: Record<string, unknown>) => updateSettings(data));
}

// Drivers (from vehicles endpoint)
export function useDrivers() {
  return useApi(fetchDrivers);
}

// Reports (Community Corrections)
export function useReports() {
  return useApi(fetchReports);
}

export function useResolveReport() {
  return useMutation((id: string, action: "approve" | "reject") => resolveReport(id, action));
}

// Beta Invite Codes
export function useInviteCodes() {
  return useApi(listInviteCodes);
}

export function useGenerateInviteCode() {
  return useMutation(() => generateInviteCode());
}

export function useRevokeInviteCode() {
  return useMutation((code: string) => revokeInviteCode(code));
}