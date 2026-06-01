const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface KpiResponse {
  active_users: number;
  trips_today: number;
  vehicles_active: number;
  vehicles_total: number;
  avg_delay_minutes: number;
}

export interface TripHour {
  hour: string;
  count: number;
}

export interface TopStop {
  name_ar: string;
  name_en: string;
  count: number;
}

export interface RouteListItem {
  id: string;
  code: string;
  name_ar: string;
  mode: string;
  origin_ar: string;
  dest_ar: string;
  duration: number;
  fare: number;
  status: string;
  headway: number | null;
  vehicles: number;
}

export interface StopItem {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  governorate: string;
  has_shelter: boolean;
  has_lighting: boolean;
  accessible: boolean;
  lines_count: number;
}

export interface VehicleItem {
  id: string;
  plate: string;
  driver: string;
  line_code: string;
  lat: number;
  lng: number;
  speed: number;
  status: string;
  mode: string;
  governorate: string;
}

export interface AlertItem {
  id: string;
  type: string;
  severity: string;
  title_ar: string;
  message_ar: string;
  affected_lines: string[];
  affected_governorate: string | null;
  created_at: string;
  status: string;
}

export interface DailyStat {
  day: string;
  dau: number;
  trips: number;
}

// ─── Auth types ───────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  name_ar: string;
  role: "admin" | "operator" | "viewer";
  governorate: string | null;
  avatar_url: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ---- API Functions ----

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("droob_access_token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("droob_access_token");
      localStorage.removeItem("droob_refresh_token");
      window.location.href = "/login";
    }
    throw new Error("انتهت الجلسة — يرجى تسجيل الدخول مجدداً");
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Dashboard KPIs
export function fetchKpis(): Promise<KpiResponse> {
  return apiFetch<KpiResponse>("/dashboard/kpis");
}

export function fetchHourlyTrips(): Promise<TripHour[]> {
  return apiFetch<TripHour[]>("/dashboard/hourly-trips");
}

export function fetchTopStops(): Promise<TopStop[]> {
  return apiFetch<TopStop[]>("/dashboard/top-stops");
}

// Routes
export function fetchRoutes(): Promise<RouteListItem[]> {
  return apiFetch<RouteListItem[]>("/routes");
}

export function updateRoute(id: string, data: Partial<RouteListItem>): Promise<RouteListItem> {
  return apiFetch<RouteListItem>(`/routes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function importGtfs(file: File): Promise<{ imported: number }> {
  const form = new FormData();
  form.append("gtfs", file);
  return fetch(`${API_BASE}/routes/import-gtfs`, { method: "POST", body: form }).then((r) => r.json());
}

// Stops
export function fetchStops(): Promise<StopItem[]> {
  return apiFetch<StopItem[]>("/stops");
}

export function createStop(data: Partial<StopItem>): Promise<StopItem> {
  return apiFetch<StopItem>("/stops", { method: "POST", body: JSON.stringify(data) });
}

export function importStopsCsv(file: File): Promise<{ imported: number }> {
  const form = new FormData();
  form.append("csv", file);
  return fetch(`${API_BASE}/stops/import-csv`, { method: "POST", body: form }).then((r) => r.json());
}

// Fleet
export function fetchVehicles(): Promise<VehicleItem[]> {
  return apiFetch<VehicleItem[]>("/vehicles");
}

export function addVehicle(data: Partial<VehicleItem>): Promise<VehicleItem> {
  return apiFetch<VehicleItem>("/vehicles", { method: "POST", body: JSON.stringify(data) });
}

// Alerts
export function fetchAlerts(): Promise<AlertItem[]> {
  return apiFetch<AlertItem[]>("/alerts");
}

export function createAlert(data: Partial<AlertItem>): Promise<AlertItem> {
  return apiFetch<AlertItem>("/alerts", { method: "POST", body: JSON.stringify(data) });
}

export function broadcastAlert(alertId: string): Promise<{ sent: number }> {
  return apiFetch<{ sent: number }>(`/alerts/${alertId}/broadcast`, { method: "POST" });
}

// Analytics
export function fetchDailyStats(days?: number): Promise<DailyStat[]> {
  return apiFetch<DailyStat[]>(`/analytics/daily?days=${days || 30}`);
}

export function fetchRetentionCohorts(): Promise<{ week: string; rate: number }[]> {
  return apiFetch<{ week: string; rate: number }[]>("/analytics/retention");
}

// ─── Users ────────────────────────────────────────────────────────────
export interface UserItem {
  id: string;
  name_ar: string;
  name_en: string;
  email: string;
  phone: string;
  role: "super_admin" | "operator" | "editor" | "viewer";
  governorate: string;
  created_at: string;
  status: "active" | "inactive";
}

export function fetchUsers(): Promise<UserItem[]> {
  return apiFetch<UserItem[]>("/users");
}

export function createUser(data: Partial<UserItem>): Promise<UserItem> {
  return apiFetch<UserItem>("/users", { method: "POST", body: JSON.stringify(data) });
}

export function updateUser(id: string, data: Partial<UserItem>): Promise<UserItem> {
  return apiFetch<UserItem>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}

// Reports
export function downloadReport(type: string, format: "pdf" | "csv" | "excel"): Promise<Blob> {
  return fetch(`${API_BASE}/reports/${type}.${format}`).then((r) => r.blob());
}

// Settings
export function updateSettings(data: Record<string, unknown>): Promise<void> {
  return apiFetch<void>("/settings", { method: "PATCH", body: JSON.stringify(data) });
}

export function fetchSettings(): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>("/settings");
}

// ─── Auth ─────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || "فشل تسجيل الدخول — تحقق من بيانات الاعتماد");
  }
  const tokens: AuthTokens = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem("droob_access_token", tokens.accessToken);
    localStorage.setItem("droob_refresh_token", tokens.refreshToken);
  }
  return tokens;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } catch { /* ignore */ }
  if (typeof window !== "undefined") {
    localStorage.removeItem("droob_access_token");
    localStorage.removeItem("droob_refresh_token");
  }
}

export async function refreshTokens(): Promise<AuthTokens> {
  const refreshToken =
    typeof window !== "undefined" ? localStorage.getItem("droob_refresh_token") : null;
  if (!refreshToken) throw new Error("انتهت الجلسة");
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("droob_access_token");
      localStorage.removeItem("droob_refresh_token");
    }
    throw new Error("انتهت الجلسة — يرجى تسجيل الدخول مجدداً");
  }
  const tokens: AuthTokens = await res.json();
  if (typeof window !== "undefined") {
    localStorage.setItem("droob_access_token", tokens.accessToken);
    localStorage.setItem("droob_refresh_token", tokens.refreshToken);
  }
  return tokens;
}

export async function fetchProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/profile");
}

export async function updateProfile(
  data: Partial<Pick<UserProfile, "name_ar" | "avatar_url">>
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/profile", { method: "PATCH", body: JSON.stringify(data) });
}

/** Check on mount if there's a stored token */
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("droob_access_token");
}