// ============================================================================
// دروب (Droob) — Test Fixtures
// Reusable mock data for all test suites
// ============================================================================
import type {
  TransitStop, TransitRoute, TransitAlert, TransitVehicle,
  Journey, JourneyLeg, Departure, Schedule, CommunityReport,
  TransportMode, Governorate,
} from '@types/transit.types';

// ─── Mock Stop ──────────────────────────────────────────────────────────────
export function createMockStop(overrides: Partial<TransitStop> = {}): TransitStop {
  return {
    id: 'stop-1',
    code: 'AMM-4TH-001',
    name_ar: 'الرابع',
    name_en: '4th Circle',
    lat: 31.9539,
    lng: 35.9106,
    governorate: 'عمان',
    city: 'Amman',
    isTerminal: false,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: true,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-01-15T08:00:00Z',
    ...overrides,
  };
}

// ─── Mock Route ─────────────────────────────────────────────────────────────
export function createMockRoute(overrides: Partial<TransitRoute> = {}): TransitRoute {
  return {
    id: 'route-brt1',
    code: 'BRT1',
    name_ar: 'سويس - المدينة الرياضية',
    name_en: 'Sweis — Sports City',
    mode: 'brt' as TransportMode,
    color: '#E60026',
    agencyId: 'agency-1',
    originStopId: 'stop-sweis',
    destinationStopId: 'stop-sport',
    governorate: 'عمان',
    distance_km: 17.5,
    duration_min: 45,
    fare_jod: 0.500,
    isActive: true,
    hasFridaySchedule: true,
    hasRamadanSchedule: true,
    headway_min: 8,
    vehicleType: 'articulated_bus',
    polyline: [[35.910, 31.950], [35.915, 31.955]],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  } as TransitRoute;
}

// ─── Mock JourneyLeg ─────────────────────────────────────────────────────────
export function createMockLeg(overrides: Partial<JourneyLeg> = {}): JourneyLeg {
  return {
    mode: 'brt' as TransportMode,
    routeId: 'route-brt1',
    routeCode: 'BRT1',
    routeName_ar: 'باص سريع',
    routeName_en: 'BRT',
    routeColor: '#E60026',
    fromStop: createMockStop({ id: 'stop-a', code: 'AMM-A-001', name_ar: 'المحطة أ', name_en: 'Stop A' }),
    toStop: createMockStop({ id: 'stop-b', code: 'AMM-B-001', name_ar: 'المحطة ب', name_en: 'Stop B' }),
    departureTime: '2026-05-25T08:00:00Z',
    arrivalTime: '2026-05-25T08:15:00Z',
    duration_min: 15,
    distance_km: 6.5,
    polyline: [[35.910, 31.950], [35.920, 31.960]],
    fare_jod: 0.500,
    headway_min: 8,
    vehicleOccupancy: 'partial',
    instructions_ar: 'اركب باص سريع BRT1 من المحطة أ إلى المحطة ب',
    instructions_en: 'Board BRT BRT1 from Stop A to Stop B',
    ...overrides,
  };
}

// ─── Mock Journey (multi-leg) ───────────────────────────────────────────────
export function createMockJourney(overrides: Partial<Journey> = {}): Journey {
  const walkLeg: JourneyLeg = {
    mode: 'walking',
    routeId: null,
    routeCode: null,
    routeName_ar: null,
    routeName_en: null,
    routeColor: null,
    fromStop: createMockStop({ id: 'stop-home', name_ar: 'بيتي', name_en: 'My Home', lat: 31.950, lng: 35.905 }),
    toStop: createMockStop({ id: 'stop-a', name_ar: 'المحطة أ', name_en: 'Stop A', lat: 31.952, lng: 35.908 }),
    departureTime: '2026-05-25T07:50:00Z',
    arrivalTime: '2026-05-25T08:00:00Z',
    duration_min: 10,
    distance_km: 0.8,
    polyline: [[35.905, 31.950], [35.908, 31.952]],
    fare_jod: 0,
    headway_min: null,
    vehicleOccupancy: null,
    instructions_ar: 'امشِ من بيتي إلى المحطة أ',
    instructions_en: 'Walk from My Home to Stop A',
  };

  const busLeg = createMockLeg();

  return {
    id: 'journey-1',
    fromName_ar: 'بيتي',
    toName_ar: 'الجامعة',
    fromName_en: 'My Home',
    toName_en: 'University',
    fromLat: 31.950,
    fromLng: 35.905,
    toLat: 32.015,
    toLng: 35.875,
    departureTime: '2026-05-25T07:50:00Z',
    arrivalTime: '2026-05-25T08:25:00Z',
    duration_min: 35,
    totalFare_jod: 0.500,
    walkingDistance_km: 0.8,
    legs: [walkLeg, busLeg],
    ...overrides,
  };
}

// ─── Mock Departure ──────────────────────────────────────────────────────────
export function createMockDeparture(overrides: Partial<Departure> = {}): Departure {
  return {
    routeId: 'route-brt1',
    code: 'BRT1',
    name_ar: 'المدينة الرياضية',
    name_en: 'Sports City',
    mode: 'brt' as TransportMode,
    color: '#E60026',
    fare: 0.500,
    departureTime: '2026-05-25T08:05:00Z',
    waitMinutes: 8,
    occupancy: 'partial',
    status: 'on_time',
    tripId: 'trip-1',
    lat: 31.9539,
    lng: 35.9106,
    ...overrides,
  };
}

// ─── Mock Alert ──────────────────────────────────────────────────────────────
export function createMockAlert(overrides: Partial<TransitAlert> = {}): TransitAlert {
  return {
    id: 'alert-1',
    type: 'delay',
    severity: 'warning',
    title_ar: 'تأخير خط BRT1',
    title_en: 'BRT1 Delay',
    message_ar: 'تأخير 10 دقائق بسبب الازدحام',
    message_en: '10 min delay due to traffic',
    affectedRouteIds: ['route-brt1'],
    affectedStopIds: ['stop-a'],
    governorates: ['عمان'],
    startsAt: '2026-05-25T07:00:00Z',
    endsAt: '2026-05-25T09:00:00Z',
    isActive: true,
    deliveryCount: 150,
    openCount: 89,
    createdAt: '2026-05-25T07:05:00Z',
    ...overrides,
  };
}

// ─── Mock Vehicle ────────────────────────────────────────────────────────────
export function createMockVehicle(overrides: Partial<TransitVehicle> = {}): TransitVehicle {
  return {
    id: 'veh-1',
    plateNumber: 'أ-12345',
    vehicleType: 'articulated_bus',
    routeId: 'route-brt1',
    tripId: 'trip-1',
    driverName: 'أحمد محمد',
    agencyId: 'agency-1',
    lat: 31.9550,
    lng: 35.9120,
    bearing: 45,
    speed_kmh: 30,
    status: 'active',
    occupancy: 'partial',
    lastSeen: '2026-05-25T08:04:00Z',
    ...overrides,
  };
}

// ─── Mock Schedule ──────────────────────────────────────────────────────────
export function createMockSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'sched-1',
    routeId: 'route-brt1',
    stopId: 'stop-a',
    departureTime: '08:00',
    arrivalTime: '08:00',
    dayType: 'weekday',
    isValidFrom: '2025-01-01',
    isValidUntil: '2025-12-31',
    ...overrides,
  };
}

// ─── Mock CommunityReport ────────────────────────────────────────────────────
export function createMockReport(overrides: Partial<CommunityReport> = {}): CommunityReport {
  return {
    id: 'report-1',
    type: 'crowding',
    stopId: 'stop-a',
    routeId: 'route-brt1',
    lat: 31.9539,
    lng: 35.9106,
    message: 'ازدحام شديد في المحطة',
    expiresAt: '2026-05-25T09:00:00Z',
    reporterId: 'user-1',
    createdAt: '2026-05-25T08:00:00Z',
    ...overrides,
  };
}

// ─── Multi-stop fixture ─────────────────────────────────────────────────────
export const MOCK_STOPS: TransitStop[] = [
  createMockStop({ id: 'stop-1', code: 'AMM-4TH-001', name_ar: 'الرابع', name_en: '4th Circle' }),
  createMockStop({ id: 'stop-2', code: 'AMM-BLD-001', name_ar: 'وسط البلد', name_en: 'Downtown', lat: 31.9516, lng: 35.9397 }),
  createMockStop({ id: 'stop-3', code: 'AMM-ABD-001', name_ar: 'العبدلي', name_en: 'Abdali Terminal', lat: 31.9636, lng: 35.9156 }),
  createMockStop({ id: 'stop-4', code: 'AMM-WHD-001', name_ar: 'الوحدات', name_en: 'Wahdat Terminal', lat: 31.9239, lng: 35.8900 }),
  createMockStop({ id: 'stop-5', code: 'AMM-UJ-001', name_ar: 'الجامعة الأردنية', name_en: 'University of Jordan', lat: 32.0156, lng: 35.8747 }),
];

// ─── Multi-route fixture ────────────────────────────────────────────────────
export const MOCK_ROUTES: TransitRoute[] = [
  createMockRoute({ id: 'route-brt1', code: 'BRT1', mode: 'brt' as TransportMode, color: '#E60026' }),
  createMockRoute({ id: 'route-2', code: '2', name_ar: 'عبدون - دابوق', name_en: 'Abdoun — Dabouq', mode: 'city_bus' as TransportMode, color: '#0066CC', headway_min: 15 }),
  createMockRoute({ id: 'route-serv', code: 'SERV-ABD-ZAR', name_ar: 'العبدلي - الزرقاء', name_en: 'Abdali — Zarqa', mode: 'serveece' as TransportMode, color: '#FF8C00', fare_jod: 0.300, headway_min: null }),
];