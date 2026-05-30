// ============================================================================
// دروب (Droob) — API Service
// Re-exports api-client with the exact shape expected by all screens
// ============================================================================
import {
  stopsApi, routesApi, tripPlannerApi, departuresApi,
  vehiclesApi, alertsApi, reportsApi, authApi,
  setAuthToken, clearAuthToken,
} from './api-client';

const apiClient = {
  // Stop search (TripPlannerScreen, SearchScreen)
  searchStops: async (q: string) => {
    const data = await stopsApi.list({ q, limit: 10 });
    return data;
  },

  // Trip planner (TripPlannerScreen)
  planTrip: async (
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
    opts?: { filter?: string; time?: string; timeType?: 'depart' | 'arrive' },
  ) => {
    const data = await tripPlannerApi.plan({
      fromLat, fromLng, toLat, toLng,
      preference: opts?.filter,
      time: opts?.time,
      timeType: opts?.timeType,
    });
    return data;
  },

  // Departures (DeparturesScreen) — returns { data: Departure[] }
  getDepartures: async (stopId: string, date?: string) => {
    const data = await departuresApi.getForStop(stopId, date);
    return { data } as { data: any[] };
  },

  // Bell alert (DeparturesScreen)
  setAlert: async (tripId: string, minutes: number) => {
    return { ok: true };
  },

  // Nearby stops (HomeScreen)
  getNearbyStops: async (lat: number, lng: number) => {
    const data = await stopsApi.nearby(lat, lng);
    return data;
  },

  // Recent stops (SearchScreen) — stored locally via MMKV, fallback to empty
  getRecentStops: async () => {
    try {
      const MMKV = require('react-native-mmkv').MMKV;
      const storage = new MMKV();
      const raw = storage.getString('recent_stops');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Save recent stop (SearchScreen)
  saveRecentStop: async (stopData: Record<string, unknown>) => {
    try {
      const MMKV = require('react-native-mmkv').MMKV;
      const storage = new MMKV();
      const existing = JSON.parse(storage.getString('recent_stops') || '[]');
      const filtered = existing.filter((s: any) => s.id !== stopData.id);
      filtered.unshift(stopData);
      storage.set('recent_stops', JSON.stringify(filtered.slice(0, 10)));
    } catch { /* no-op */ }
  },

  // Alerts list (HomeScreen)
  getAlerts: async () => {
    const data = await alertsApi.list({ isActive: true });
    return data;
  },

  // Stops CRUD
  getStops: (params?: Record<string, any>) => stopsApi.list(params || {}),
  getStopById: (id: string) => stopsApi.getById(id),

  // Routes CRUD
  getRoutes: (params?: Record<string, any>) => routesApi.list(params || {}),
  getRouteById: (id: string) => routesApi.getById(id),
  getRouteStops: (id: string) => routesApi.getStops(id),
  getRouteSchedule: (id: string, dayType?: string) => routesApi.getSchedule(id, dayType),

  // Vehicles
  getVehicles: (params?: Record<string, any>) => vehiclesApi.list(params),
  getVehicleById: (id: string) => vehiclesApi.getById(id),

  // Reports
  createReport: (data: any) => reportsApi.create(data),

  // Auth
  login: (email: string, password: string) => authApi.login(email, password),
  register: (data: any) => authApi.register(data),
  refreshToken: (token: string) => authApi.refresh(token),
  getProfile: () => authApi.profile(),
  setToken: setAuthToken,
  clearToken: clearAuthToken,
};

export { apiClient, setAuthToken, clearAuthToken };
export default apiClient;