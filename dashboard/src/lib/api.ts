/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Dashboard API Client
   ═══════════════════════════════════════════════════════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const API_VERSION = "/api/v1";
const TIMEOUT_MS = 15_000;

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

// ─── Token Management ──────────────────────────────────────────────────────

let authToken: string | null = null;

if (typeof window !== "undefined") {
  authToken = localStorage.getItem("droob_token");
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("droob_token", token);
    else localStorage.removeItem("droob_token");
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuthToken() {
  setAuthToken(null);
}

// ─── Core Fetch ────────────────────────────────────────────────────────────

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { body, params, ...fetchOptions } = options;

  let url = `${API_URL}${API_VERSION}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": "ar",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Auto-refresh token on 401 and retry once
    if (response.status === 401 && authToken) {
      const refreshToken = typeof window !== "undefined" ? localStorage.getItem("droob_refresh") : null;
      if (refreshToken && !endpoint.includes("/auth/")) {
        try {
          const refreshRes = await fetch(`${API_URL}${API_VERSION}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newToken = refreshData.success ? refreshData.data.accessToken : refreshData.accessToken;
            if (newToken) {
              setAuthToken(newToken);
              if (typeof window !== "undefined") {
                localStorage.setItem("droob_refresh", refreshData.success ? refreshData.data.refreshToken : refreshData.refreshToken);
              }
              // Retry with new token
              headers["Authorization"] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, {
                ...fetchOptions,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                if (retryData && typeof retryData === "object" && "success" in retryData && (retryData as any).success === true) {
                  return (retryData as any).data as T;
                }
                return retryData as T;
              }
            }
          }
        } catch {
          // Refresh failed, continue to error
        }
      }
    }

    if (!response.ok) {
      const err = data as { error?: { message_ar?: string; code?: string }; message?: string };
      throw new ApiRequestError(
        response.status,
        err.error?.code || "UnknownError",
        err.error?.message_ar || err.message || "حدث خطأ غير متوقع",
      );
    }

    // Auto-unwrap { success: true, data: ... } envelope from backend
    if (data && typeof data === "object" && "success" in data && (data as any).success === true) {
      return (data as any).data as T;
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new ApiRequestError(408, "Timeout", "انتهت مهلة الطلب");
    }
    throw new ApiRequestError(0, "NetworkError", "تعذر الاتصال بالخادم");
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── API Endpoints ────────────────────────────────────────────────────────

// Dashboard
export const dashboardApi = {
  getKpis: () => apiFetch<{
    active_users: number;
    trips_today: number;
    vehicles_active: number;
    vehicles_total: number;
    avg_delay_minutes: number;
  }>("/dashboard/kpis"),

  getHourlyTrips: (date?: string) =>
    apiFetch<{ date: string; data: { hour: number; count: number }[] }>(
      "/dashboard/hourly-trips",
      { params: { date } },
    ),

  getTopStops: () =>
    apiFetch<{
      data: { stop_id: string; stop_name_ar: string; stop_name_en: string; governorate: string; route_count: number }[];
    }>("/dashboard/top-stops"),

  getRouteStats: () =>
    apiFetch<{ data: { mode: string; count: number; active_count: number }[] }>(
      "/dashboard/route-stats",
    ),
};

// Admin
export const adminApi = {
  getSystemHealth: () =>
    apiFetch<{
      cpu_percent: number;
      memory_used_gb: number;
      memory_total_gb: number;
      disk_used_gb: number;
      disk_total_gb: number;
      uptime_hours: number;
      status: string;
      platform: string;
      hostname: string;
    }>("/admin/system-health"),

  getDbStats: () =>
    apiFetch<{
      total_routes: number;
      total_stops: number;
      total_vehicles: number;
      total_users: number;
      total_ads: number;
      db_size: string;
    }>("/admin/db-stats"),

  getUserRoles: () =>
    apiFetch<{
      super_admin: number;
      admin: number;
      operator: number;
      editor: number;
      viewer: number;
      total: number;
    }>("/admin/user-roles"),

  getApiUsage: () =>
    apiFetch<{
      requests_today: number;
      requests_this_hour: number;
      avg_response_ms: number;
      error_rate_pct: number;
      rate_limit_hits: number;
    }>("/admin/api-usage"),

  getGeometryStats: () =>
    apiFetch<{
      total: number;
      nullGeom: number;
      nullGeoLat: number;
      haveValidGeom: number;
    }>("/admin/geometry-stats"),

  fixGeometries: () =>
    apiFetch<{ success: boolean; message: string; fixed: number }>("/admin/fix-geometries", { method: "POST" }),
};

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{
      user: { id: string; email: string; name: string; role: string; preferredLang: string };
      accessToken: string;
      refreshToken: string;
    }>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  getProfile: () =>
    apiFetch<{
      id: string;
      email: string;
      phone: string | null;
      name: string;
      role: string;
      preferredLang: string;
      created_at: string;
    }>("/auth/profile"),

  refreshToken: (refreshToken: string) =>
    apiFetch<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    }),

  logout: () =>
    apiFetch<{ message: string }>("/auth/logout", { method: "POST" }),
};

// Stops
export const stopsApi = {
  list: (params?: {
    q?: string; governorate?: string; limit?: number; offset?: number; isTerminal?: boolean;
  }) => apiFetch<{ data: StopRecord[]; total?: number }>("/stops", { params: params as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) => apiFetch<StopRecord>(`/stops/${id}`),

  create: (data: StopCreateInput) =>
    apiFetch<StopRecord>("/stops", { method: "POST", body: data }),

  update: (id: string, data: Partial<StopCreateInput>) =>
    apiFetch<StopRecord>(`/stops/${id}`, { method: "PATCH", body: data }),

  delete: (id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/stops/${id}`, { method: "DELETE" }),
};

export interface StopRecord {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  governorate: string;
  city: string | null;
  is_terminal: boolean;
  has_shelter: boolean;
  has_lighting: boolean;
  has_accessibility: boolean;
  has_ticket_machine: boolean;
  has_ac: boolean;
  photo_url: string | null;
  parent_station_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface StopCreateInput {
  code: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  governorate: string;
  city?: string;
  isTerminal?: boolean;
  hasShelter?: boolean;
  hasLighting?: boolean;
  hasAccessibility?: boolean;
  hasTicketMachine?: boolean;
  hasAc?: boolean;
}

// Routes
export const routesApi = {
  list: (params?: {
    q?: string; mode?: string; governorate?: string; isActive?: boolean;
    limit?: number; offset?: number; includePaths?: boolean;
  }) => apiFetch<{ data: RouteRecord[]; total?: number }>("/routes", { params: params as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) => apiFetch<RouteRecord & { agency?: AgencyRecord; stops: RouteStopRecord[] }>(`/routes/${id}`),

  create: (data: RouteCreateInput) =>
    apiFetch<RouteRecord>("/routes", { method: "POST", body: data }),

  update: (id: string, data: Partial<RouteCreateInput>) =>
    apiFetch<RouteRecord>(`/routes/${id}`, { method: "PATCH", body: data }),

  delete: (id: string) =>
    apiFetch<{ deleted: boolean; id: string }>(`/routes/${id}`, { method: "DELETE" }),

  getStops: (id: string) =>
    apiFetch<{ stops: RouteStopRecord[] }>(`/routes/${id}/stops`),

  addStop: (routeId: string, data: { stopId: string; seq: number; isBoardingZone?: boolean }) =>
    apiFetch(`/routes/${routeId}/stops`, { method: "POST", body: data }),

  removeStop: (routeId: string, stopId: string) =>
    apiFetch(`/routes/${routeId}/stops/${stopId}`, { method: "DELETE" }),
};

export interface RouteRecord {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  mode: string;
  agency_id: string | null;
  color: string;
  origin_stop_id: string | null;
  destination_stop_id: string | null;
  path_geojson: unknown;
  distance: number | null;
  base_fare: string;
  fare_min: string | null;
  fare_max: string | null;
  is_active: boolean;
  headway_peak: number | null;
  headway_offpeak: number | null;
  first_departure: string | null;
  last_departure: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteStopRecord {
  seq: number;
  isBoardingZone: boolean;
  stop: StopRecord;
}

export interface AgencyRecord {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  mode: string;
}

export interface RouteCreateInput {
  code: string;
  name_ar: string;
  name_en: string;
  mode: string;
  agencyId?: string;
  color?: string;
  originStopId?: string;
  destinationStopId?: string;
  pathGeojson?: unknown;
  distance?: number;
  baseFare?: number;
  isActive?: boolean;
  headwayPeak?: number;
  headwayOffpeak?: number;
  firstDeparture?: string;
  lastDeparture?: string;
}

// Alerts
export const alertsApi = {
  list: (params?: { severity?: string; governorate?: string; active?: boolean; limit?: number }) =>
    apiFetch<{ data: AlertRecord[] }>("/alerts", { params: params as Record<string, string | number | boolean | undefined> }),

  getById: (id: string) => apiFetch<AlertRecord>(`/alerts/${id}`),

  create: (data: AlertCreateInput) =>
    apiFetch<AlertRecord>("/alerts", { method: "POST", body: data }),

  update: (id: string, data: Partial<AlertCreateInput>) =>
    apiFetch<AlertRecord>(`/alerts/${id}`, { method: "PATCH", body: data }),

  emergency: (data: { message_ar: string; message_en: string; governorate?: string }) =>
    apiFetch<AlertRecord>("/alerts/emergency", { method: "POST", body: data }),
};

export interface AlertRecord {
  id: string;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  severity: string;
  type: string;
  affected_route_ids: string[] | null;
  governorate: string | null;
  start_at: string;
  end_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertCreateInput {
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  severity: string;
  type: string;
  affectedRouteIds?: string[];
  governorate?: string;
  startAt: string;
  endAt?: string;
  isActive?: boolean;
}

// Activity
export const activityApi = {
  list: (params?: { entityType?: string; userId?: string; action?: string; limit?: number; offset?: number }) =>
    apiFetch<{ data: ActivityRecord[]; total: number; limit: number; offset: number }>(
      "/activity",
      { params: params as Record<string, string | number | boolean | undefined> },
    ),
};

export interface ActivityRecord {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

// Vehicles
export const vehiclesApi = {
  list: (params?: { routeCode?: string; mode?: string }) =>
    apiFetch<{ vehicles: VehiclePosition[]; generatedAt: string }>("/vehicles", { params: params as Record<string, string | number | boolean | undefined> }),

  listDb: () =>
    apiFetch<VehicleRecord[]>("/vehicles/db"),

  getById: (id: string) => apiFetch<VehicleRecord & { livePosition: unknown }>(`/vehicles/${id}`),
};

export interface VehicleRecord {
  id: string;
  plate: string;
  type: string;
  agency_id: string | null;
  assigned_route_id: string | null;
  capacity: number;
  driver_name: string | null;
  lat: number | null;
  lng: number | null;
  bearing: number | null;
  speed: number | null;
  is_active: boolean;
  last_gps_update: string | null;
}

export interface VehiclePosition {
  vehicleId: string;
  lat: number;
  lng: number;
  routeCode: string;
  mode: string;
}

// Reports
export const reportsApi = {
  list: (params?: { type?: string; severity?: string; governorate?: string; hoursAgo?: number; limit?: number }) =>
    apiFetch<{ reports: CommunityReport[]; total: number; generatedAt: string }>("/reports", { params: params as Record<string, string | number | boolean | undefined> }),

  analytics: () =>
    apiFetch<{ byType: Record<string, number>; byDay: Record<string, number>; total: number }>("/reports/analytics"),
};

export interface CommunityReport {
  id: string;
  type: string;
  severity: string;
  lat: number;
  lng: number;
  route_code: string | null;
  stop_id: string | null;
  message_ar: string | null;
  message_en: string | null;
  user_id: string | null;
  governorate: string | null;
  is_resolved: boolean;
  expires_at: string;
  created_at: string;
}

// Users Admin
export const usersAdminApi = {
  list: (params?: { q?: string; role?: string; limit?: number; offset?: number }) =>
    apiFetch<{ data: AdminUserRecord[]; total: number; limit: number; offset: number }>(
      "/admin/users",
      { params: params as Record<string, string | number | boolean | undefined> },
    ),

  create: (data: { email: string; password: string; name: string; role: string; phone?: string; preferredLang?: string }) =>
    apiFetch<AdminUserRecord>("/admin/users", { method: "POST", body: data }),

  update: (id: string, data: { email?: string; name?: string; role?: string; phone?: string; preferredLang?: string }) =>
    apiFetch<AdminUserRecord>(`/admin/users/${id}`, { method: "PATCH", body: data }),

  resetPassword: (id: string, newPassword: string) =>
    apiFetch<{ message: string; userId: string }>(`/admin/users/${id}/reset-password`, {
      method: "PATCH",
      body: { newPassword },
    }),

  delete: (id: string) =>
    apiFetch<{ deleted: boolean; id: string; name: string }>(`/admin/users/${id}`, { method: "DELETE" }),
};

export interface AdminUserRecord {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  preferredLang: string | null;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Snap Route (OSRM road-matching)
export const snapRouteApi = {
  snap: (points: [number, number][]) =>
    apiFetch<{
      points: [number, number][];
      distance_km: number;
      duration_min: number;
      original_count: number;
      snapped_count: number;
      geojson: { type: string; coordinates: number[][] };
    }>("/admin/snap-route", { method: "POST", body: { points } }),
};

// Ads
export const adsApi = {
  getStats: (days?: number) =>
    apiFetch<{
      revenueByType: { ad_type: string; total_revenue: number; impressions: number; clicks: number; rewards: number }[];
      revenueByNetwork: { ad_network: string; total_revenue: number; impressions: number }[];
      dailyRevenue: { date: string; revenue: number; impressions: number }[];
      fillRate: { total: number; filled: number } | null;
      days: number;
    }>("/ads/stats", { params: { days } }),

  checkAdFree: () =>
    apiFetch<{ isAdFree: boolean; subscription: unknown }>("/ads/check-adfree"),
};

// Fares
export const faresApi = {
  list: (params?: { routeId?: string; fromGovernorate?: string; toGovernorate?: string }) =>
    apiFetch<FareRule[]>("/fares", { params: params as Record<string, string | number | boolean | undefined> }),
};

export interface FareRule {
  id: string;
  route_id: string | null;
  from_governorate: string | null;
  to_governorate: string | null;
  distance_min_km: number | null;
  distance_max_km: number | null;
  fare_amount: string;
  currency: string;
}
