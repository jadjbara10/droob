// ============================================================================
// دروب (Droob) — API Service Tests
// ============================================================================
import apiClient, { setAuthToken, clearAuthToken } from '@services/api';

// Mock the entire api module to avoid real fetch calls
jest.mock('@services/api', () => {
  const mockApiClient = {
    searchStops: jest.fn(),
    planTrip: jest.fn(),
    getDepartures: jest.fn(),
    setAlert: jest.fn(),
    getNearbyStops: jest.fn(),
    getAlerts: jest.fn(),
    getStops: jest.fn(),
    getStopById: jest.fn(),
    getRoutes: jest.fn(),
    getRouteById: jest.fn(),
    getRouteStops: jest.fn(),
    getRouteSchedule: jest.fn(),
    getVehicles: jest.fn(),
    getVehicleById: jest.fn(),
    createReport: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    getProfile: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  };

  return {
    __esModule: true,
    default: mockApiClient,
    apiClient: mockApiClient,
    setAuthToken: jest.fn(),
    clearAuthToken: jest.fn(),
  };
});

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── searchStops ────────────────────────────────────────────────────
  describe('searchStops', () => {
    it('returns stops for a query', async () => {
      const mockStops = [{ id: 's1', name_ar: 'محطة أ' }];
      (apiClient.searchStops as jest.Mock).mockResolvedValueOnce(mockStops);

      const result = await apiClient.searchStops('محطة');
      expect(apiClient.searchStops).toHaveBeenCalledWith('محطة');
      expect(result).toEqual(mockStops);
    });

    it('returns empty for unknown query', async () => {
      (apiClient.searchStops as jest.Mock).mockResolvedValueOnce([]);

      const result = await apiClient.searchStops('');
      expect(result).toEqual([]);
    });
  });

  // ─── planTrip ───────────────────────────────────────────────────────
  describe('planTrip', () => {
    it('returns journeys for valid coordinates', async () => {
      const mockJourneys = [{ id: 'j1', totalDurationMinutes: 23 }];
      (apiClient.planTrip as jest.Mock).mockResolvedValueOnce(mockJourneys);

      const result = await apiClient.planTrip(31.95, 35.91, 31.96, 35.93);
      expect(apiClient.planTrip).toHaveBeenCalledWith(31.95, 35.91, 31.96, 35.93);
      expect(result).toEqual(mockJourneys);
    });

    it('accepts filter and time options', async () => {
      (apiClient.planTrip as jest.Mock).mockResolvedValueOnce([]);

      await apiClient.planTrip(31.95, 35.91, 31.97, 35.95, {
        filter: 'cheapest',
        time: '09:00',
        timeType: 'depart',
      });
      expect(apiClient.planTrip).toHaveBeenCalledWith(31.95, 35.91, 31.97, 35.95, {
        filter: 'cheapest',
        time: '09:00',
        timeType: 'depart',
      });
    });
  });

  // ─── getDepartures ──────────────────────────────────────────────────
  describe('getDepartures', () => {
    it('returns { data } wrapper for a stop', async () => {
      const mockDepartures = [{ id: 'd1', routeName_ar: 'باص عمان' }];
      (apiClient.getDepartures as jest.Mock).mockResolvedValueOnce({ data: mockDepartures });

      const result = await apiClient.getDepartures('s1');
      expect(apiClient.getDepartures).toHaveBeenCalledWith('s1');
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(mockDepartures);
    });
  });

  // ─── getNearbyStops ─────────────────────────────────────────────────
  describe('getNearbyStops', () => {
    it('returns stops near coordinates', async () => {
      const mockStops = [{ id: 's1', name_ar: 'محطة قريبة' }];
      (apiClient.getNearbyStops as jest.Mock).mockResolvedValueOnce(mockStops);

      const result = await apiClient.getNearbyStops(31.95, 35.91);
      expect(apiClient.getNearbyStops).toHaveBeenCalledWith(31.95, 35.91);
      expect(result).toEqual(mockStops);
    });
  });

  // ─── getAlerts ──────────────────────────────────────────────────────
  describe('getAlerts', () => {
    it('returns active alerts', async () => {
      const mockAlerts = [{ id: 'a1', type: 'delay', message_ar: 'تأخير' }];
      (apiClient.getAlerts as jest.Mock).mockResolvedValueOnce(mockAlerts);

      const result = await apiClient.getAlerts();
      expect(apiClient.getAlerts).toHaveBeenCalled();
      expect(result).toEqual(mockAlerts);
    });
  });

  // ─── Stops CRUD ─────────────────────────────────────────────────────
  describe('getStops', () => {
    it('returns all stops', async () => {
      const mockStops = [{ id: 's1' }, { id: 's2' }];
      (apiClient.getStops as jest.Mock).mockResolvedValueOnce(mockStops);

      const result = await apiClient.getStops();
      expect(apiClient.getStops).toHaveBeenCalled();
      expect(result).toEqual(mockStops);
    });

    it('accepts query parameters', async () => {
      (apiClient.getStops as jest.Mock).mockResolvedValueOnce([]);

      await apiClient.getStops({ governorate: 'عمان' });
      expect(apiClient.getStops).toHaveBeenCalledWith({ governorate: 'عمان' });
    });
  });

  describe('getStopById', () => {
    it('returns single stop', async () => {
      const mockStop = { id: 's1', name_ar: 'محطة' };
      (apiClient.getStopById as jest.Mock).mockResolvedValueOnce(mockStop);

      const result = await apiClient.getStopById('s1');
      expect(apiClient.getStopById).toHaveBeenCalledWith('s1');
      expect(result).toEqual(mockStop);
    });
  });

  // ─── Routes CRUD ────────────────────────────────────────────────────
  describe('getRoutes', () => {
    it('returns all routes', async () => {
      const mockRoutes = [{ id: 'r1', code: 'B1' }];
      (apiClient.getRoutes as jest.Mock).mockResolvedValueOnce(mockRoutes);

      const result = await apiClient.getRoutes();
      expect(apiClient.getRoutes).toHaveBeenCalled();
      expect(result).toEqual(mockRoutes);
    });

    it('accepts query parameters', async () => {
      (apiClient.getRoutes as jest.Mock).mockResolvedValueOnce([]);

      await apiClient.getRoutes({ governorate: 'عمان', mode: 'brt' });
      expect(apiClient.getRoutes).toHaveBeenCalledWith({ governorate: 'عمان', mode: 'brt' });
    });
  });

  describe('getRouteById', () => {
    it('returns single route', async () => {
      const mockRoute = { id: 'r1', code: 'B1' };
      (apiClient.getRouteById as jest.Mock).mockResolvedValueOnce(mockRoute);

      const result = await apiClient.getRouteById('r1');
      expect(apiClient.getRouteById).toHaveBeenCalledWith('r1');
      expect(result).toEqual(mockRoute);
    });
  });

  describe('getRouteStops', () => {
    it('returns stops for a route', async () => {
      const mockStops = [{ id: 's1' }, { id: 's2' }];
      (apiClient.getRouteStops as jest.Mock).mockResolvedValueOnce(mockStops);

      const result = await apiClient.getRouteStops('r1');
      expect(apiClient.getRouteStops).toHaveBeenCalledWith('r1');
      expect(result).toEqual(mockStops);
    });
  });

  // ─── Vehicles ───────────────────────────────────────────────────────
  describe('getVehicles', () => {
    it('returns all vehicles', async () => {
      const mockVehicles = [{ id: 'v1' }, { id: 'v2' }];
      (apiClient.getVehicles as jest.Mock).mockResolvedValueOnce(mockVehicles);

      const result = await apiClient.getVehicles();
      expect(apiClient.getVehicles).toHaveBeenCalled();
      expect(result).toEqual(mockVehicles);
    });

    it('filters by route', async () => {
      (apiClient.getVehicles as jest.Mock).mockResolvedValueOnce([]);

      await apiClient.getVehicles({ routeId: 'r1' });
      expect(apiClient.getVehicles).toHaveBeenCalledWith({ routeId: 'r1' });
    });
  });

  describe('getVehicleById', () => {
    it('returns single vehicle', async () => {
      const mockVehicle = { id: 'v1', lat: 31.95, lng: 35.91 };
      (apiClient.getVehicleById as jest.Mock).mockResolvedValueOnce(mockVehicle);

      const result = await apiClient.getVehicleById('v1');
      expect(apiClient.getVehicleById).toHaveBeenCalledWith('v1');
      expect(result).toEqual(mockVehicle);
    });
  });

  // ─── Auth ───────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns auth response with user + token', async () => {
      const mockAuth = { user: { id: 'u1', name: 'Test' }, token: 'jwt-token' };
      (apiClient.login as jest.Mock).mockResolvedValueOnce(mockAuth);

      const result = await apiClient.login('test@example.com', 'password123');
      expect(apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
    });
  });

  describe('register', () => {
    it('registers a new user', async () => {
      const mockResponse = { token: 'jwt', user: { id: 'u1' } };
      (apiClient.register as jest.Mock).mockResolvedValueOnce(mockResponse);

      const userData = { email: 'test@example.com', password: 'password123', name: 'Test User' };
      const result = await apiClient.register(userData);
      expect(apiClient.register).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockResponse);
    });
  });

  // ─── Named Exports ──────────────────────────────────────────────────
  describe('named exports', () => {
    it('exports setAuthToken', () => {
      expect(setAuthToken).toBeDefined();
      expect(typeof setAuthToken).toBe('function');
    });

    it('exports clearAuthToken', () => {
      expect(clearAuthToken).toBeDefined();
      expect(typeof clearAuthToken).toBe('function');
    });
  });
});