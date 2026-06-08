// ============================================================================
// دروب (Droob) — Transit Store (Zustand)
// Central state: routes, stops, vehicles, journeys, alerts
// ============================================================================

import { create } from 'zustand';
import { TransitStop, TransitRoute, TransitVehicle, TransitAlert, Journey, Departure, TransportMode } from '../types/transit.types';
import { stopsApi, routesApi, vehiclesApi, alertsApi, tripPlannerApi, departuresApi } from '../services/api-client';

interface TransitState {
  // ── Data ─────────────────────────────────────────────────────────────
  stops: TransitStop[];
  routes: TransitRoute[];
  vehicles: TransitVehicle[];
  alerts: TransitAlert[];
  departures: Departure[];
  journeys: Journey[];

  // ── UI State ─────────────────────────────────────────────────────────
  selectedStop: TransitStop | null;
  selectedRoute: TransitRoute | null;
  selectedModes: TransportMode[];
  userLocation: { lat: number; lng: number } | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterMode: TransportMode | null;
  usingMockData: boolean;

  // ── Favorites ────────────────────────────────────────────────────────
  favoriteStops: string[];
  favoriteRoutes: string[];

  // ── Actions ─────────────────────────────────────────────────────────
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  setSelectedModes: (modes: TransportMode[]) => void;

  // Stops
  fetchNearbyStops: (lat: number, lng: number) => Promise<void>;
  selectStop: (stop: TransitStop | null) => void;
  clearSelectedStop: () => void;
  searchStops: (query: string) => Promise<TransitStop[]>;

  // Routes
  fetchRoutes: (params?: { mode?: string }) => Promise<void>;
  selectRoute: (route: TransitRoute | null) => void;
  clearSelectedRoute: () => void;

  // Search
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;

  // Filter
  setFilterMode: (mode: TransportMode) => void;
  clearFilter: () => void;

  // Loading / Error
  setLoading: (loading: boolean) => void;
  setError: (msg: string) => void;
  clearError: () => void;

  // Trip Planner
  planJourney: (fromLat: number, fromLng: number, toLat: number, toLng: number, params?: Record<string, unknown>) => Promise<Journey[]>;
  setJourneys: (journeys: Journey[]) => void;
  clearJourneys: () => void;

  // Departures
  fetchDepartures: (stopId: string) => Promise<void>;
  updateDepartures: (departures: Departure[]) => void;

  // Vehicles
  fetchVehicles: (routeId?: string) => Promise<void>;
  updateVehicles: (vehicles: TransitVehicle[]) => void;
  updateVehiclePosition: (vehicle: TransitVehicle) => void;

  // Alerts
  fetchAlerts: () => Promise<void>;

  // Favorites
  toggleFavoriteStop: (stopId: string) => void;
  toggleFavoriteRoute: (routeId: string) => void;
}

export const useTransitStore = create<TransitState>((set, get) => ({
  stops: [],
  routes: [],
  vehicles: [],
  alerts: [],
  departures: [],
  journeys: [],
  selectedStop: null,
  selectedRoute: null,
  selectedModes: ['city_bus', 'brt', 'serveece', 'intercity'],
  userLocation: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filterMode: null,
  usingMockData: false,
  favoriteStops: [],
  favoriteRoutes: [],

  setUserLocation: (loc) => set({ userLocation: loc }),

  setSelectedModes: (modes) => set({ selectedModes: modes }),

  fetchNearbyStops: async (lat, lng) => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      const data = await stopsApi.nearby(lat, lng) as { data: TransitStop[] };
      set({ stops: data.data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
    }
  },

  selectStop: (stop) => set({ selectedStop: stop }),
  clearSelectedStop: () => set({ selectedStop: null }),

  searchStops: async (query) => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      const data = await stopsApi.list({ q: query }) as { data: TransitStop[] };
      set({ isLoading: false });
      return data.data;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
      return [];
    }
  },

  fetchRoutes: async (params) => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      // Fetch all routes (pass limit: 500 to get everything, API caps safely)
      const data = await routesApi.list({ limit: 500, ...params }) as any;
      // Handle both response shapes: { data: [...] } or { data: { data: [...] } }
      const routesList = Array.isArray(data?.data) ? data.data : (data?.data?.data || []);
      set({ routes: routesList, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
    }
  },

  selectRoute: (route) => set({ selectedRoute: route }),
  clearSelectedRoute: () => set({ selectedRoute: null }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearch: () => set({ searchQuery: '' }),

  setFilterMode: (mode) => {
    set((s) => ({
      filterMode: s.filterMode === mode ? null : mode,
    }));
  },
  clearFilter: () => set({ filterMode: null }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),

  planJourney: async (fromLat, fromLng, toLat, toLng, params) => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      // Backend returns { from, to, journeys: Journey[], generatedAt }
      const response = await tripPlannerApi.plan({
        fromLat, fromLng, toLat, toLng,
        ...params,
      }) as any;
      // Handle v2 response: { data: { journeys } } or direct: { journeys }
      const journeysList = response?.data?.journeys || response?.journeys || response?.data || [];
      set({ journeys: journeysList, isLoading: false });
      return journeysList;
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
      return [];
    }
  },

  setJourneys: (journeys) => set({ journeys }),
  clearJourneys: () => set({ journeys: [] }),

  fetchDepartures: async (stopId) => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      const data = await departuresApi.getForStop(stopId) as { stop: TransitStop; departures: Departure[]; generatedAt: string };
      set({ departures: data.departures, selectedStop: data.stop, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
    }
  },

  updateDepartures: (departures) => set({ departures }),

  fetchVehicles: async (routeId) => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      const data = await vehiclesApi.list(routeId ? { routeId } : undefined) as { data: TransitVehicle[] };
      set({ vehicles: data.data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
    }
  },

  updateVehicles: (vehicles) => set({ vehicles }),

  updateVehiclePosition: (vehicle) => {
    set((s) => ({
      vehicles: s.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)),
    }));
  },

  fetchAlerts: async () => {
    set({ isLoading: true, error: null, usingMockData: false });
    try {
      const data = await alertsApi.list({ isActive: true }) as { data: TransitAlert[] };
      set({ alerts: data.data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false, usingMockData: true });
    }
  },

  toggleFavoriteStop: (stopId) => {
    set((s) => ({
      favoriteStops: s.favoriteStops.includes(stopId)
        ? s.favoriteStops.filter((id) => id !== stopId)
        : [...s.favoriteStops, stopId],
    }));
  },

  toggleFavoriteRoute: (routeId) => {
    set((s) => ({
      favoriteRoutes: s.favoriteRoutes.includes(routeId)
        ? s.favoriteRoutes.filter((id) => id !== routeId)
        : [...s.favoriteRoutes, routeId],
    }));
  },
}));