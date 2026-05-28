// ============================================================================
// دروب (Droob) — Transit Store Tests (Zustand)
// ============================================================================
import { useTransitStore } from '@stores/transit.store';
import type { TransitStop, TransitRoute, TransitVehicle, Departure, TransportMode } from '@types/transit.types';

// Mock the API service
jest.mock('@services/api', () => ({
  fetchStops: jest.fn(),
  fetchRoutes: jest.fn(),
  fetchDepartures: jest.fn(),
  fetchVehicles: jest.fn(),
  planJourney: jest.fn(),
}));

describe('useTransitStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTransitStore.setState({
      stops: [],
      routes: [],
      departures: [],
      vehicles: [],
      selectedStop: null,
      selectedRoute: null,
      isLoading: false,
      error: null,
      journeys: [],
      searchQuery: '',
      filterMode: null,
    });
  });

  // ─── Initial State ──────────────────────────────────────────────────
  it('has correct initial state', () => {
    const state = useTransitStore.getState();
    expect(state.stops).toEqual([]);
    expect(state.routes).toEqual([]);
    expect(state.departures).toEqual([]);
    expect(state.vehicles).toEqual([]);
    expect(state.selectedStop).toBeNull();
    expect(state.selectedRoute).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.journeys).toEqual([]);
    expect(state.searchQuery).toBe('');
    expect(state.filterMode).toBeNull();
  });

  // ─── Stop Selection ─────────────────────────────────────────────────
  it('selectStop sets selectedStop', () => {
    const stop: TransitStop = {
      id: 's1',
      name_ar: 'محطة أ',
      name_en: 'Stop A',
      lat: 31.95,
      lng: 35.91,
      governorate: 'عمان',
    };

    useTransitStore.getState().selectStop(stop);
    expect(useTransitStore.getState().selectedStop).toEqual(stop);
  });

  it('clearSelectedStop resets selectedStop to null', () => {
    useTransitStore.setState({
      selectedStop: {
        id: 's1',
        name_ar: 'محطة أ',
        name_en: 'Stop A',
        lat: 31.95,
        lng: 35.91,
        governorate: 'عمان',
      },
    });

    useTransitStore.getState().clearSelectedStop();
    expect(useTransitStore.getState().selectedStop).toBeNull();
  });

  // ─── Route Selection ───────────────────────────────────────────────
  it('selectRoute sets selectedRoute', () => {
    const route: TransitRoute = {
      id: 'r1',
      code: 'B1',
      name_ar: 'باص عمان',
      name_en: 'Amman Bus',
      mode: 'brt',
      color: '#E60026',
      governorate: 'عمان',
      stops: ['s1', 's2'],
      isActive: true,
    };

    useTransitStore.getState().selectRoute(route);
    expect(useTransitStore.getState().selectedRoute).toEqual(route);
  });

  it('clearSelectedRoute resets selectedRoute to null', () => {
    useTransitStore.setState({
      selectedRoute: {
        id: 'r1',
        code: 'B1',
        name_ar: 'باص عمان',
        name_en: 'Amman Bus',
        mode: 'brt',
        color: '#E60026',
        governorate: 'عمان',
        stops: ['s1', 's2'],
        isActive: true,
      },
    });

    useTransitStore.getState().clearSelectedRoute();
    expect(useTransitStore.getState().selectedRoute).toBeNull();
  });

  // ─── Search ─────────────────────────────────────────────────────────
  it('setSearchQuery updates search query', () => {
    useTransitStore.getState().setSearchQuery('باص');
    expect(useTransitStore.getState().searchQuery).toBe('باص');
  });

  it('clearSearch resets search query', () => {
    useTransitStore.setState({ searchQuery: 'test' });
    useTransitStore.getState().clearSearch();
    expect(useTransitStore.getState().searchQuery).toBe('');
  });

  // ─── Filter ─────────────────────────────────────────────────────────
  it('setFilterMode sets transport mode filter', () => {
    useTransitStore.getState().setFilterMode('brt');
    expect(useTransitStore.getState().filterMode).toBe('brt');
  });

  it('clearFilter resets mode filter to null', () => {
    useTransitStore.setState({ filterMode: 'city_bus' });
    useTransitStore.getState().clearFilter();
    expect(useTransitStore.getState().filterMode).toBeNull();
  });

  it('setFilterMode toggles filter when same mode selected', () => {
    useTransitStore.setState({ filterMode: 'brt' });
    useTransitStore.getState().setFilterMode('brt');
    expect(useTransitStore.getState().filterMode).toBeNull();
  });

  // ─── Loading State ──────────────────────────────────────────────────
  it('setLoading updates loading state', () => {
    useTransitStore.getState().setLoading(true);
    expect(useTransitStore.getState().isLoading).toBe(true);

    useTransitStore.getState().setLoading(false);
    expect(useTransitStore.getState().isLoading).toBe(false);
  });

  // ─── Error State ────────────────────────────────────────────────────
  it('setError sets error message', () => {
    useTransitStore.getState().setError('Network error');
    expect(useTransitStore.getState().error).toBe('Network error');
  });

  it('clearError resets error to null', () => {
    useTransitStore.setState({ error: 'Some error' });
    useTransitStore.getState().clearError();
    expect(useTransitStore.getState().error).toBeNull();
  });

  // ─── Vehicles ───────────────────────────────────────────────────────
  it('updateVehicles replaces vehicle list', () => {
    const vehicles: TransitVehicle[] = [
      {
        id: 'v1', routeId: 'r1', routeCode: 'B1',
        lat: 31.95, lng: 35.91, heading: 90, speed: 40,
        status: 'on_time', occupancy: 'partial',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v2', routeId: 'r1', routeCode: 'B1',
        lat: 31.96, lng: 35.92, heading: 180, speed: 35,
        status: 'on_time', occupancy: 'empty',
        updatedAt: new Date().toISOString(),
      },
    ];

    useTransitStore.getState().updateVehicles(vehicles);
    expect(useTransitStore.getState().vehicles).toHaveLength(2);
  });

  // ─── Departures ─────────────────────────────────────────────────────
  it('updateDepartures replaces departure list', () => {
    const departures: Departure[] = [
      {
        id: 'd1', routeId: 'r1', stopId: 's1',
        routeName_ar: 'باص عمان', routeName_en: 'Amman Bus',
        code: 'B1', mode: 'brt',
        destination_ar: 'دوار', destination_en: 'Circle',
        scheduledTime: '08:30', estimatedTime: '08:32',
        waitMinutes: 5, status: 'on_time', occupancy: 'partial',
        fare: 0.5,
      },
    ];

    useTransitStore.getState().updateDepartures(departures);
    expect(useTransitStore.getState().departures).toHaveLength(1);
  });

  // ─── Favorites ──────────────────────────────────────────────────────
  it('toggleFavorite add/removes stop from favorites', () => {
    useTransitStore.getState().toggleFavoriteStop('s1');
    expect(useTransitStore.getState().favoriteStops).toContain('s1');

    useTransitStore.getState().toggleFavoriteStop('s1');
    expect(useTransitStore.getState().favoriteStops).not.toContain('s1');
  });

  it('toggleFavoriteRoute add/removes route from favorites', () => {
    useTransitStore.getState().toggleFavoriteRoute('r1');
    expect(useTransitStore.getState().favoriteRoutes).toContain('r1');

    useTransitStore.getState().toggleFavoriteRoute('r1');
    expect(useTransitStore.getState().favoriteRoutes).not.toContain('r1');
  });

  // ─── Journeys ───────────────────────────────────────────────────────
  it('setJourneys replaces journey list', () => {
    const journeys = [
      {
        id: 'j1',
        legs: [
          {
            mode: 'walking' as const,
            fromStopName_ar: 'موقعك',
            toStopName_ar: 'محطة أ',
            durationMinutes: 5,
            distanceMeters: 400,
          },
        ],
        totalDurationMinutes: 5,
        totalFare: 0,
        transfers: 0,
        departureTime: '08:00',
        arrivalTime: '08:05',
      },
    ];

    useTransitStore.getState().setJourneys(journeys);
    expect(useTransitStore.getState().journeys).toHaveLength(1);
  });

  it('clearJourneys resets journey list', () => {
    useTransitStore.setState({
      journeys: [{
        id: 'j1',
        legs: [],
        totalDurationMinutes: 5,
        totalFare: 0,
        transfers: 0,
        departureTime: '08:00',
        arrivalTime: '08:05',
      }],
    });

    useTransitStore.getState().clearJourneys();
    expect(useTransitStore.getState().journeys).toHaveLength(0);
  });
});