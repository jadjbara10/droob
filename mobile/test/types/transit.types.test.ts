// ============================================================================
// دروب (Droob) — Transit Types Shape Tests
// Validates the shape of transit-related TypeScript types
// ============================================================================
import type {
  TransportMode,
  TransitStop,
  TransitRoute,
  TransitVehicle,
  TransitAlert,
  Journey,
  JourneyLeg,
  Departure,
  PlanRequest,
  StopFeature,
} from '@types/transit.types';

describe('Type Shapes — Compile-time + runtime validation', () => {
  // ─── TransportMode ──────────────────────────────────────────────────────
  it('TransportMode is one of four values', () => {
    const modes: TransportMode[] = ['city_bus', 'brt', 'serveece', 'intercity'];
    expect(modes).toHaveLength(4);
  });

  // ─── TransitStop ────────────────────────────────────────────────────────
  it('TransitStop has required fields', () => {
    const stop: TransitStop = {
      id: 'stop-001',
      name_ar: 'دوار الداخلية',
      name_en: 'Interior Circle',
      code: 'IC01',
      lat: 31.95,
      lng: 35.91,
      modes: ['city_bus', 'brt'],
      governorate: 'عمان',
      isTerminal: true,
    };
    expect(stop.id).toBeTruthy();
    expect(stop.name_ar).toBeTruthy();
    expect(stop.name_en).toBeTruthy();
    expect(stop.lat).toBeGreaterThan(29);
    expect(stop.lng).toBeGreaterThan(35);
    expect(stop.modes.length).toBeGreaterThan(0);
  });

  it('TransitStop optional fields can be omitted', () => {
    const stop: TransitStop = {
      id: 'stop-002',
      name_ar: 'مجمع سفريات الجنوب',
      name_en: 'South Station',
      lat: 31.9,
      lng: 35.93,
      governorate: 'عمان',
    };
    expect(stop.code).toBeUndefined();
    expect(stop.modes).toBeUndefined();
    expect(stop.isTerminal).toBeUndefined();
  });

  // ─── StopFeature (GeoJSON-like) ─────────────────────────────────────────
  it('StopFeature has GeoJSON-like structure', () => {
    const feature: StopFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [35.91, 31.95],
      },
      properties: {
        id: 'stop-003',
        name_ar: 'محطة',
        name_en: 'Station',
        code: 'ST3',
        modes: ['serveece'],
        governorate: 'إربد',
      },
    };
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toHaveLength(2);
    expect(feature.properties.id).toBeTruthy();
  });

  // ─── TransitRoute ───────────────────────────────────────────────────────
  it('TransitRoute has required fields', () => {
    const route: TransitRoute = {
      id: 'route-001',
      code: 'B1',
      name_ar: 'باص عمان',
      name_en: 'Amman Bus',
      mode: 'brt',
      color: '#E60026',
      governorate: 'عمان',
      stops: ['s1', 's2', 's3'],
      isActive: true,
    };
    expect(route.mode).toBe('brt');
    expect(route.color).toMatch(/^#/);
    expect(route.stops.length).toBeGreaterThan(1);
  });

  it('TransitRoute optional fields can be omitted', () => {
    const route: TransitRoute = {
      id: 'route-002',
      name_ar: 'سرفيس جبل الحسين',
      name_en: 'Jabal Al-Hussein Serveece',
      mode: 'serveece',
      color: '#FF8C00',
      governorate: 'عمان',
      stops: ['s5', 's6'],
      isActive: true,
    };
    expect(route.code).toBeUndefined();
    expect(route.schedule).toBeUndefined();
    expect(route.fare).toBeUndefined();
  });

  // ─── TransitVehicle ─────────────────────────────────────────────────────
  it('TransitVehicle has position, heading, and status', () => {
    const vehicle: TransitVehicle = {
      id: 'v-001',
      routeId: 'route-001',
      routeCode: 'B1',
      lat: 31.95,
      lng: 35.91,
      heading: 90,
      speed: 40,
      status: 'on_time',
      occupancy: 'partial',
      updatedAt: new Date().toISOString(),
    };
    expect(vehicle.lat).toBeGreaterThan(0);
    expect(vehicle.heading).toBeGreaterThanOrEqual(0);
    expect(vehicle.heading).toBeLessThan(360);
    expect(['on_time', 'delayed', 'cancelled']).toContain(vehicle.status);
    expect(['empty', 'partial', 'full']).toContain(vehicle.occupancy);
  });

  // ─── Departure ──────────────────────────────────────────────────────────
  it('Departure has expected fields', () => {
    const departure: Departure = {
      id: 'dep-001',
      routeId: 'route-001',
      stopId: 'stop-001',
      routeName_ar: 'باص عمان',
      routeName_en: 'Amman Bus',
      code: 'B1',
      mode: 'brt',
      destination_ar: 'دوار المدينة',
      destination_en: 'City Circle',
      scheduledTime: '08:30',
      estimatedTime: '08:32',
      waitMinutes: 5,
      status: 'on_time',
      occupancy: 'partial',
      fare: 0.5,
    };
    expect(departure.waitMinutes).toBeGreaterThanOrEqual(0);
    expect(departure.mode).toBeTruthy();
    expect(departure.destination_ar).toBeTruthy();
  });

  // ─── JourneyLeg ─────────────────────────────────────────────────────────
  it('JourneyLeg has route info and timing', () => {
    const leg: JourneyLeg = {
      mode: 'brt',
      routeId: 'route-001',
      routeCode: 'B1',
      routeName_ar: 'باص عمان',
      routeName_en: 'Amman Bus',
      fromStopId: 's1',
      fromStopName_ar: 'محطة أ',
      toStopId: 's2',
      toStopName_ar: 'محطة ب',
      departureTime: '08:00',
      arrivalTime: '08:15',
      durationMinutes: 15,
      headsign_ar: 'دوار المدينة',
      polyline: 'abc~def~ghi',
      fare: 0.5,
    };
    expect(leg.durationMinutes).toBeGreaterThan(0);
    expect(leg.departureTime).toBeTruthy();
    expect(leg.arrivalTime).toBeTruthy();
    expect(leg.fromStopId).not.toBe(leg.toStopId);
  });

  it('JourneyLeg walking mode has different fields', () => {
    const leg: JourneyLeg = {
      mode: 'walking',
      fromStopName_ar: 'موقعك',
      toStopName_ar: 'محطة أ',
      durationMinutes: 8,
      distanceMeters: 600,
      polyline: 'walk~poly~line',
    };
    expect(leg.mode).toBe('walking');
    expect(leg.distanceMeters).toBeGreaterThan(0);
    expect(leg.routeId).toBeUndefined();
    expect(leg.fare).toBeUndefined();
  });

  // ─── Journey ────────────────────────────────────────────────────────────
  it('Journey composes legs with totals', () => {
    const journey: Journey = {
      id: 'j-001',
      legs: [
        {
          mode: 'walking',
          fromStopName_ar: 'موقعك',
          toStopName_ar: 'محطة أ',
          durationMinutes: 5,
          distanceMeters: 400,
        },
        {
          mode: 'brt',
          routeId: 'route-001',
          routeCode: 'B1',
          routeName_ar: 'باص عمان',
          fromStopId: 's1',
          fromStopName_ar: 'محطة أ',
          toStopId: 's2',
          toStopName_ar: 'محطة ب',
          departureTime: '08:05',
          arrivalTime: '08:20',
          durationMinutes: 15,
          headsign_ar: 'دوار المدينة',
          fare: 0.5,
        },
      ],
      totalDurationMinutes: 20,
      totalFare: 0.5,
      transfers: 1,
      departureTime: '08:00',
      arrivalTime: '08:20',
    };
    expect(journey.legs).toHaveLength(2);
    expect(journey.totalDurationMinutes).toBe(20);
    expect(journey.transfers).toBe(1);
    expect(journey.totalFare).toBeGreaterThan(0);
  });

  // ─── TransitAlert ───────────────────────────────────────────────────────
  it('TransitAlert has bilingual messages and severity', () => {
    const alert: TransitAlert = {
      id: 'alert-001',
      type: 'delay',
      severity: 'warning',
      message_ar: 'تأخير على خط الباص السريع',
      message_en: 'Delay on BRT line',
      affectedRoutes: ['route-001'],
      startTime: new Date().toISOString(),
      endTime: null,
      isRead: false,
    };
    expect(alert.message_ar).toBeTruthy();
    expect(alert.message_en).toBeTruthy();
    expect(['info', 'warning', 'critical']).toContain(alert.severity);
    expect(['delay', 'diversion', 'closure', 'emergency', 'maintenance']).toContain(alert.type);
  });

  // ─── PlanRequest ────────────────────────────────────────────────────────
  it('PlanRequest has origin/destination coordinates', () => {
    const req: PlanRequest = {
      fromLat: 31.95,
      fromLng: 35.91,
      toLat: 31.98,
      toLng: 35.88,
    };
    expect(req.fromLat).toBeLessThan(req.toLat); // going north
    expect(req.fromLng).toBeGreaterThan(req.toLng); // going west
  });

  it('PlanRequest optional parameters accept valid values', () => {
    const req: PlanRequest = {
      fromLat: 31.95,
      fromLng: 35.91,
      toLat: 31.98,
      toLng: 35.88,
      time: '14:00',
      timeType: 'depart',
      maxWalkMeters: 1000,
      maxTransfers: 2,
      preferredModes: ['brt', 'city_bus'],
      preference: 'fewer_transfers',
    };
    expect(req.maxWalkMeters).toBe(1000);
    expect(req.maxTransfers).toBe(2);
    expect(req.preferredModes).toHaveLength(2);
  });
});