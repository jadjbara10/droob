/**
 * API Client — fetches data from backend with offline fallback
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.droob-jo.com/api/v1";

// ─── Types ───────────────────────────────────────────────

export interface ApiStop {
  id: string;
  name: string;
  name_en?: string;
  governorate: string;
  lat: number;
  lng: number;
  type: string;
  category?: string;
}

export interface ApiRoute {
  id: string;
  name: string;
  name_en?: string;
  from_stop_id: string;
  to_stop_id: string;
  from_name?: string;
  to_name?: string;
  type: string;
  governorate: string;
  stops?: string[];
  geometry?: [number, number][];
  distance_km?: number;
  travel_time_min?: number;
}

// ─── Fetch helpers ───────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Stop API ────────────────────────────────────────────

export async function fetchAllStops(): Promise<ApiStop[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/stops`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("⚠️ API unreachable for stops:", err);
    return [];
  }
}

export async function fetchStopById(id: string): Promise<ApiStop | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/stops/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Route API ───────────────────────────────────────────

export async function fetchAllRoutes(): Promise<ApiRoute[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/routes`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("⚠️ API unreachable for routes:", err);
    return [];
  }
}

export async function fetchRouteById(id: string): Promise<ApiRoute | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/routes/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Search API ──────────────────────────────────────────

export async function searchAPI(query: string): Promise<{
  stops: ApiStop[];
  routes: ApiRoute[];
}> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { stops: [], routes: [] };
  }
}

// ─── Sync API ────────────────────────────────────────────

export async function fetchSyncData(): Promise<{
  version: string;
  stops: ApiStop[];
  routes: ApiRoute[];
}> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/sync/data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { version: "0", stops: [], routes: [] };
  }
}