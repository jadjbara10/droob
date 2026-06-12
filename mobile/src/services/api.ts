// ============================================================================
// دروب (Droob) — API Service Layer
//
// Typed interface between UI screens and the Fastify backend.
//
// Responsibilities:
//   - Provides fully typed functions matching every backend endpoint
//   - Uses the low-level api-client (timeout, retry, JWT auth)
//   - Falls back to realistic mock data when offline (isNetworkError)
//   - Keeps MMKV persistence separated into ./storage
//
// Usage:
//   import { searchStops, getAlerts, login } from '@/services/api';
//   // or
//   import api from '@/services/api';
//   api.searchStops('...');
// ============================================================================

// ─── Imports ───────────────────────────────────────────────────────────────

import {
  stopsApi,
  routesApi,
  tripPlannerApi,
  departuresApi,
  vehiclesApi,
  alertsApi,
  reportsApi,
  authApi,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  isNetworkError,
  ApiError,
  OfflineError,
} from './api-client';

import type {
  Stop,
  Route,
  Departure,
  Journey,
  TransitVehicle,
  TransitAlert,
  CommunityReport,
  AppUser,
  TransportMode,
  Governorate,
  PaginatedResponse,
  DepartureBoardResponse,
} from '@/types';

import {
  getRecentStops,
  saveRecentStop,
  clearRecentStops,
} from './storage';

import {
  cacheData,
  getCachedData,
  queueOfflineAction,
} from './offline-cache';

import NetInfo from '@react-native-community/netinfo';

export type { RecentStop } from './storage';

// ─── Re-exports (from api-client) ──────────────────────────────────────────
// Convenience re-exports so callers only need one import.
export { setAuthToken, clearAuthToken, getAuthToken, isNetworkError, ApiError, OfflineError };

// ─── Re-exports (from storage) ─────────────────────────────────────────────

export { getRecentStops, saveRecentStop, clearRecentStops };

// ─── API-Specific Types ────────────────────────────────────────────────────

/** Filters for listing routes. */
export interface RouteFilters {
  mode?: TransportMode;
  governorate?: Governorate;
  isActive?: boolean;
}

/** Filters for listing alerts. */
export interface AlertFilters {
  isActive?: boolean;
  governorate?: Governorate;
}

/** Filters for listing community reports. */
export interface ReportFilters {
  type?: string;
  stopId?: string;
  routeId?: string;
}

/** Options for the trip planner. All fields optional — sensible defaults apply. */
export interface PlannerOptions {
  time?: string;
  timeType?: 'depart' | 'arrive';
  maxWalkMeters?: number;
  maxTransfers?: number;
  preferredModes?: TransportMode[];
  preference?: 'fastest' | 'fewest_transfers' | 'least_walking' | 'wheelchair_accessible';
}

/** Payload for creating a community report. */
export interface CreateReportData {
  type: string;
  stopId?: string;
  routeId?: string;
  lat: number;
  lng: number;
  message: string;
}

/** Payload for user registration. */
export interface RegisterData {
  fullName_ar: string;
  fullName_en: string;
  email: string;
  password: string;
  phone: string;
}

/** Successful auth response. */
export interface AuthResponse {
  token: string;
  user: AppUser;
}

/** Token refresh response. */
export interface RefreshResponse {
  token: string;
}

/** App settings — persisted locally, not on the backend (for now). */
export interface AppSettings {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  alertMinutes: number[];
  favoriteRouteIds: string[];
  homeLocation: { lat: number; lng: number } | null;
  workLocation: { lat: number; lng: number } | null;
}

/** Auth identifier — accepts email or phone. */
export type AuthIdentifier = string;

// ─── Mock Data (Offline Fallback) ──────────────────────────────────────────
// Realistic sample data for Amman / Jordan transit.
// Used when the device is offline or the backend is unreachable.

const MOCK_STOPS: Stop[] = [
  {
    id: 'stop-001',
    code: 'AMM-ABD-001',
    name_ar: 'عبدلي',
    name_en: 'Abdali',
    lat: 31.9565,
    lng: 35.9068,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: true,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: true,
    hasTicketMachine: true,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-002',
    code: 'AMM-SPT-002',
    name_ar: 'المدينة الرياضية',
    name_en: 'Sports City',
    lat: 31.9796,
    lng: 35.8948,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: false,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: false,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-003',
    code: 'AMM-UOJ-003',
    name_ar: 'الجامعة الأردنية',
    name_en: 'University of Jordan',
    lat: 32.0163,
    lng: 35.8741,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: false,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: true,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-004',
    code: 'AMM-SWF-004',
    name_ar: 'الصويفية',
    name_en: 'Sweifieh',
    lat: 31.9478,
    lng: 35.8712,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: false,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: false,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-005',
    code: 'AMM-7TH-005',
    name_ar: 'الدوار السابع',
    name_en: '7th Circle',
    lat: 31.9539,
    lng: 35.8617,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: false,
    hasShelter: false,
    hasLighting: true,
    hasAccessibility: false,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-006',
    code: 'AMM-GDN-006',
    name_ar: 'الحدائق',
    name_en: 'Gardens',
    lat: 31.9833,
    lng: 35.8833,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: false,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: true,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-007',
    code: 'AMM-MUH-007',
    name_ar: 'المهاجرين',
    name_en: 'Al-Muhajireen',
    lat: 31.9544,
    lng: 35.9247,
    governorate: 'عمان',
    city: 'عمان',
    isTerminal: true,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: true,
    hasTicketMachine: true,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
  {
    id: 'stop-008',
    code: 'ZAR-MN-008',
    name_ar: 'محطة الزرقاء',
    name_en: 'Zarqa Station',
    lat: 32.0815,
    lng: 36.1008,
    governorate: 'الزرقاء',
    city: 'الزرقاء',
    isTerminal: true,
    hasShelter: true,
    hasLighting: true,
    hasAccessibility: false,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
    distance_m: undefined,
  },
];

const MOCK_ROUTES: Route[] = [
  {
    id: 'route-brt1',
    code: 'BRT1',
    name_ar: 'باص سريع 1',
    name_en: 'BRT Line 1',
    mode: 'brt',
    color: '#E53935',
    agencyId: 'agency-001',
    originStopId: 'stop-004',
    destinationStopId: 'stop-007',
    originName_ar: 'الصويفية',
    originName_en: 'Sweifieh',
    destinationName_ar: 'المهاجرين',
    destinationName_en: 'Al-Muhajireen',
    governorate: 'عمان',
    distance_km: 12.5,
    duration_min: 35,
    fare_jod: 0.50,
    isActive: true,
    hasFridaySchedule: true,
    hasRamadanSchedule: true,
    headway_min: 5,
    vehicleType: 'brt_articulated',
    polyline: [
      [35.8712, 31.9478],
      [35.8765, 31.9502],
      [35.8834, 31.9539],
      [35.8948, 31.9632],
      [35.9068, 31.9565],
      [35.9247, 31.9544],
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
  {
    id: 'route-bus2',
    code: '2',
    name_ar: 'خط 2',
    name_en: 'Route 2',
    mode: 'city_bus',
    color: '#1E88E5',
    agencyId: 'agency-001',
    originStopId: 'stop-001',
    destinationStopId: 'stop-002',
    originName_ar: 'عبدلي',
    originName_en: 'Abdali',
    destinationName_ar: 'المدينة الرياضية',
    destinationName_en: 'Sports City',
    governorate: 'عمان',
    distance_km: 8.3,
    duration_min: 25,
    fare_jod: 0.35,
    isActive: true,
    hasFridaySchedule: true,
    hasRamadanSchedule: true,
    headway_min: 10,
    vehicleType: 'bus_standard',
    polyline: [
      [35.9068, 31.9565],
      [35.8965, 31.9687],
      [35.8948, 31.9796],
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
  {
    id: 'route-serv-abd-ju',
    code: 'SERV-ABD-JU',
    name_ar: 'عبدلي - الجامعة',
    name_en: 'Abdali - University',
    mode: 'serveece',
    color: '#43A047',
    agencyId: 'agency-002',
    originStopId: 'stop-001',
    destinationStopId: 'stop-003',
    originName_ar: 'عبدلي',
    originName_en: 'Abdali',
    destinationName_ar: 'الجامعة الأردنية',
    destinationName_en: 'University of Jordan',
    governorate: 'عمان',
    distance_km: 10.1,
    duration_min: 30,
    fare_jod: 0.75,
    isActive: true,
    hasFridaySchedule: false,
    hasRamadanSchedule: true,
    headway_min: null,
    vehicleType: 'serveece_hatchback',
    polyline: [
      [35.9068, 31.9565],
      [35.8876, 31.9721],
      [35.8741, 32.0163],
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
  {
    id: 'route-int-amm-zar',
    code: 'INT-AMM-ZAR',
    name_ar: 'عمان - الزرقاء',
    name_en: 'Amman - Zarqa',
    mode: 'intercity',
    color: '#FDD835',
    agencyId: 'agency-003',
    originStopId: 'stop-001',
    destinationStopId: 'stop-008',
    originName_ar: 'عبدلي',
    originName_en: 'Abdali',
    destinationName_ar: 'محطة الزرقاء',
    destinationName_en: 'Zarqa Station',
    governorate: 'الزرقاء',
    distance_km: 22.0,
    duration_min: 45,
    fare_jod: 1.50,
    isActive: true,
    hasFridaySchedule: true,
    hasRamadanSchedule: true,
    headway_min: 30,
    vehicleType: 'bus_coach',
    polyline: [
      [35.9068, 31.9565],
      [35.9884, 32.0012],
      [36.1008, 32.0815],
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
  {
    id: 'route-bus7',
    code: '7',
    name_ar: 'خط 7',
    name_en: 'Route 7',
    mode: 'city_bus',
    color: '#8E24AA',
    agencyId: 'agency-001',
    originStopId: 'stop-006',
    destinationStopId: 'stop-005',
    originName_ar: 'الحدائق',
    originName_en: 'Gardens',
    destinationName_ar: 'الدوار السابع',
    destinationName_en: '7th Circle',
    governorate: 'عمان',
    distance_km: 6.7,
    duration_min: 20,
    fare_jod: 0.35,
    isActive: true,
    hasFridaySchedule: true,
    hasRamadanSchedule: true,
    headway_min: 12,
    vehicleType: 'bus_standard',
    polyline: [
      [35.8833, 31.9833],
      [35.8712, 31.9701],
      [35.8617, 31.9539],
    ],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  },
];

const MOCK_DEPARTURES: Departure[] = [
  {
    routeId: 'route-brt1',
    code: 'BRT1',
    name_ar: 'المهاجرين',
    name_en: 'Al-Muhajireen',
    mode: 'brt',
    color: '#E53935',
    fare: 0.50,
    departureTime: new Date(Date.now() + 3 * 60000).toISOString(),
    waitMinutes: 3,
    occupancy: 'partial',
    status: 'on_time',
    tripId: 'trip-brt1-001',
    lat: 31.9565,
    lng: 35.9068,
  },
  {
    routeId: 'route-brt1',
    code: 'BRT1',
    name_ar: 'المهاجرين',
    name_en: 'Al-Muhajireen',
    mode: 'brt',
    color: '#E53935',
    fare: 0.50,
    departureTime: new Date(Date.now() + 10 * 60000).toISOString(),
    waitMinutes: 10,
    occupancy: 'empty',
    status: 'on_time',
    tripId: 'trip-brt1-002',
    lat: 31.9565,
    lng: 35.9068,
  },
  {
    routeId: 'route-brt1',
    code: 'BRT1',
    name_ar: 'المهاجرين',
    name_en: 'Al-Muhajireen',
    mode: 'brt',
    color: '#E53935',
    fare: 0.50,
    departureTime: new Date(Date.now() + 18 * 60000).toISOString(),
    waitMinutes: 18,
    occupancy: 'full',
    status: 'on_time',
    tripId: 'trip-brt1-003',
    lat: 31.9565,
    lng: 35.9068,
  },
  {
    routeId: 'route-bus2',
    code: '2',
    name_ar: 'المدينة الرياضية',
    name_en: 'Sports City',
    mode: 'city_bus',
    color: '#1E88E5',
    fare: 0.35,
    departureTime: new Date(Date.now() + 5 * 60000).toISOString(),
    waitMinutes: 5,
    occupancy: 'partial',
    status: 'on_time',
    tripId: 'trip-bus2-001',
    lat: 31.9565,
    lng: 35.9068,
  },
  {
    routeId: 'route-serv-abd-ju',
    code: 'SERV-ABD-JU',
    name_ar: 'الجامعة الأردنية',
    name_en: 'University of Jordan',
    mode: 'serveece',
    color: '#43A047',
    fare: { min: 0.50, max: 0.75 },
    departureTime: new Date(Date.now() + 7 * 60000).toISOString(),
    waitMinutes: 7,
    occupancy: 'partial',
    status: 'on_time',
    tripId: 'trip-serv-001',
    lat: 31.9565,
    lng: 35.9068,
  },
  {
    routeId: 'route-int-amm-zar',
    code: 'INT-AMM-ZAR',
    name_ar: 'الزرقاء',
    name_en: 'Zarqa',
    mode: 'intercity',
    color: '#FDD835',
    fare: 1.50,
    departureTime: new Date(Date.now() + 25 * 60000).toISOString(),
    waitMinutes: 25,
    occupancy: 'empty',
    status: 'delayed',
    tripId: 'trip-int-001',
    lat: 31.9565,
    lng: 35.9068,
  },
  {
    routeId: 'route-bus7',
    code: '7',
    name_ar: 'الدوار السابع',
    name_en: '7th Circle',
    mode: 'city_bus',
    color: '#8E24AA',
    fare: 0.35,
    departureTime: new Date(Date.now() + 4 * 60000).toISOString(),
    waitMinutes: 4,
    occupancy: 'full',
    status: 'on_time',
    tripId: 'trip-bus7-001',
    lat: 31.9565,
    lng: 35.9068,
  },
];

const MOCK_ALERTS: TransitAlert[] = [
  {
    id: 'alert-001',
    type: 'delay',
    severity: 'warning',
    title_ar: 'تأخير على خط باص سريع 1',
    title_en: 'Delay on BRT Line 1',
    message_ar: 'يوجد تأخير بمقدار ١٠ دقائق على خط باص سريع ١ بسبب ازدحام مروري في منطقة الصويفية.',
    message_en: 'There is a 10-minute delay on BRT Line 1 due to traffic congestion in Sweifieh area.',
    affectedRouteIds: ['route-brt1'],
    affectedStopIds: ['stop-004', 'stop-005'],
    governorates: ['عمان'],
    startsAt: '2026-05-31T06:00:00.000Z',
    endsAt: '2026-05-31T10:00:00.000Z',
    isActive: true,
    deliveryCount: 142,
    openCount: 38,
    createdAt: '2026-05-31T05:30:00.000Z',
  },
  {
    id: 'alert-002',
    type: 'maintenance',
    severity: 'info',
    title_ar: 'صيانة في محطة عبدلي',
    title_en: 'Maintenance at Abdali Station',
    message_ar: 'سيتم إغلاق المنصة رقم ٢ في محطة عبدلي للصيانة من الساعة ١٠ مساءً حتى ٦ صباحاً.',
    message_en: 'Platform 2 at Abdali Station will be closed for maintenance from 10 PM to 6 AM.',
    affectedRouteIds: ['route-brt1', 'route-bus2', 'route-serv-abd-ju', 'route-int-amm-zar'],
    affectedStopIds: ['stop-001'],
    governorates: ['عمان'],
    startsAt: '2026-05-31T22:00:00.000Z',
    endsAt: '2026-06-01T06:00:00.000Z',
    isActive: true,
    deliveryCount: 78,
    openCount: 15,
    createdAt: '2026-05-30T14:00:00.000Z',
  },
  {
    id: 'alert-003',
    type: 'emergency',
    severity: 'critical',
    title_ar: 'طريق مغلق - الدوار السابع',
    title_en: 'Road Closed - 7th Circle',
    message_ar: 'تم إغلاق تقاطع الدوار السابع بسبب أعمال بناء. يرجى استخدام طرق بديلة.',
    message_en: '7th Circle intersection is closed due to construction. Please use alternate routes.',
    affectedRouteIds: ['route-bus7'],
    affectedStopIds: ['stop-005'],
    governorates: ['عمان'],
    startsAt: '2026-05-30T08:00:00.000Z',
    endsAt: '2026-06-15T18:00:00.000Z',
    isActive: true,
    deliveryCount: 215,
    openCount: 89,
    createdAt: '2026-05-29T07:00:00.000Z',
  },
];

const MOCK_VEHICLES: TransitVehicle[] = [
  {
    id: 'veh-001',
    plateNumber: '12345-1',
    vehicleType: 'brt_articulated',
    routeId: 'route-brt1',
    tripId: 'trip-brt1-001',
    driverName: 'أحمد محمد',
    agencyId: 'agency-001',
    lat: 31.9582,
    lng: 35.9015,
    bearing: 120,
    speed_kmh: 35,
    status: 'active',
    occupancy: 'partial',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'veh-002',
    plateNumber: '12346-1',
    vehicleType: 'brt_articulated',
    routeId: 'route-brt1',
    tripId: 'trip-brt1-002',
    driverName: 'سامر علي',
    agencyId: 'agency-001',
    lat: 31.9501,
    lng: 35.8765,
    bearing: 90,
    speed_kmh: 40,
    status: 'active',
    occupancy: 'empty',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'veh-003',
    plateNumber: '22345-2',
    vehicleType: 'bus_standard',
    routeId: 'route-bus2',
    tripId: 'trip-bus2-001',
    driverName: 'محمود حسن',
    agencyId: 'agency-001',
    lat: 31.9705,
    lng: 35.8965,
    bearing: 0,
    speed_kmh: 28,
    status: 'active',
    occupancy: 'partial',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'veh-004',
    plateNumber: '32345-3',
    vehicleType: 'bus_coach',
    routeId: 'route-int-amm-zar',
    tripId: 'trip-int-001',
    driverName: 'خالد عبدالله',
    agencyId: 'agency-003',
    lat: 31.9688,
    lng: 35.9884,
    bearing: 45,
    speed_kmh: 60,
    status: 'active',
    occupancy: 'empty',
    lastSeen: new Date().toISOString(),
  },
];

const MOCK_USER: AppUser = {
  id: 'user-001',
  fullName_ar: 'جاد جبور',
  fullName_en: 'Jad Jbour',
  email: 'jad@droob.app',
  phone: '+9627XXXXXXXX',
  role: 'viewer',
  agencyId: null,
  homeLat: 31.9760,
  homeLng: 35.8940,
  workLat: 31.9565,
  workLng: 35.9068,
  favoriteRouteIds: ['route-brt1', 'route-bus2'],
  communityScore: 42,
  createdAt: '2025-06-01T00:00:00.000Z',
};

const MOCK_JOURNEYS: Journey[] = [
  {
    id: 'journey-001',
    fromName_ar: 'عبدلي',
    toName_ar: 'الجامعة الأردنية',
    fromName_en: 'Abdali',
    toName_en: 'University of Jordan',
    fromLat: 31.9565,
    fromLng: 35.9068,
    toLat: 32.0163,
    toLng: 35.8741,
    departureTime: new Date(Date.now() + 5 * 60000).toISOString(),
    arrivalTime: new Date(Date.now() + 35 * 60000).toISOString(),
    duration_min: 30,
    totalFare_jod: 0.75,
    walkingDistance_km: 0.3,
    legs: [
      {
        mode: 'walking',
        routeId: null,
        routeCode: null,
        routeName_ar: null,
        routeName_en: null,
        routeColor: null,
        fromStop: MOCK_STOPS[0],
        toStop: MOCK_STOPS[0],
        departureTime: new Date(Date.now() + 5 * 60000).toISOString(),
        arrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
        duration_min: 3,
        distance_km: 0.3,
        polyline: [[35.9068, 31.9565]],
        fare_jod: 0,
        headway_min: null,
        vehicleOccupancy: null,
        instructions_ar: 'اتجه سيراً على الأقدام إلى محطة عبدلي',
        instructions_en: 'Walk to Abdali Station',
      },
      {
        mode: 'serveece',
        routeId: 'route-serv-abd-ju',
        routeCode: 'SERV-ABD-JU',
        routeName_ar: 'عبدلي - الجامعة',
        routeName_en: 'Abdali - University',
        routeColor: '#43A047',
        fromStop: MOCK_STOPS[0],
        toStop: MOCK_STOPS[2],
        departureTime: new Date(Date.now() + 8 * 60000).toISOString(),
        arrivalTime: new Date(Date.now() + 35 * 60000).toISOString(),
        duration_min: 27,
        distance_km: 10.1,
        polyline: [
          [35.9068, 31.9565],
          [35.8876, 31.9721],
          [35.8741, 32.0163],
        ],
        fare_jod: 0.75,
        headway_min: null,
        vehicleOccupancy: 'partial',
        instructions_ar: 'استقل سيارة أجرة (سرفيس) باتجاه الجامعة الأردنية',
        instructions_en: 'Take a serveece heading to the University of Jordan',
      },
    ],
  },
  {
    id: 'journey-002',
    fromName_ar: 'عبدلي',
    toName_ar: 'الجامعة الأردنية',
    fromName_en: 'Abdali',
    toName_en: 'University of Jordan',
    fromLat: 31.9565,
    fromLng: 35.9068,
    toLat: 32.0163,
    toLng: 35.8741,
    departureTime: new Date(Date.now() + 15 * 60000).toISOString(),
    arrivalTime: new Date(Date.now() + 50 * 60000).toISOString(),
    duration_min: 35,
    totalFare_jod: 0.50,
    walkingDistance_km: 0.8,
    legs: [
      {
        mode: 'walking',
        routeId: null,
        routeCode: null,
        routeName_ar: null,
        routeName_en: null,
        routeColor: null,
        fromStop: MOCK_STOPS[0],
        toStop: MOCK_STOPS[5],
        departureTime: new Date(Date.now() + 15 * 60000).toISOString(),
        arrivalTime: new Date(Date.now() + 21 * 60000).toISOString(),
        duration_min: 6,
        distance_km: 0.5,
        polyline: [[35.9068, 31.9565]],
        fare_jod: 0,
        headway_min: null,
        vehicleOccupancy: null,
        instructions_ar: 'اتجه سيراً على الأقدام إلى محطة الحدائق',
        instructions_en: 'Walk to Gardens Station',
      },
      {
        mode: 'city_bus',
        routeId: 'route-bus7',
        routeCode: '7',
        routeName_ar: 'خط 7',
        routeName_en: 'Route 7',
        routeColor: '#8E24AA',
        fromStop: MOCK_STOPS[5],
        toStop: MOCK_STOPS[4],
        departureTime: new Date(Date.now() + 21 * 60000).toISOString(),
        arrivalTime: new Date(Date.now() + 26 * 60000).toISOString(),
        duration_min: 5,
        distance_km: 1.5,
        polyline: [
          [35.8833, 31.9833],
          [35.8712, 31.9701],
          [35.8617, 31.9539],
        ],
        fare_jod: 0.35,
        headway_min: 12,
        vehicleOccupancy: 'partial',
        instructions_ar: 'استقل الحافلة رقم ٧ باتجاه الدوار السابع',
        instructions_en: 'Take bus route 7 towards 7th Circle',
      },
      {
        mode: 'walking',
        routeId: null,
        routeCode: null,
        routeName_ar: null,
        routeName_en: null,
        routeColor: null,
        fromStop: MOCK_STOPS[4],
        toStop: MOCK_STOPS[4],
        departureTime: new Date(Date.now() + 26 * 60000).toISOString(),
        arrivalTime: new Date(Date.now() + 50 * 60000).toISOString(),
        duration_min: 24,
        distance_km: 2.0,
        polyline: [[35.8617, 31.9539]],
        fare_jod: 0,
        headway_min: null,
        vehicleOccupancy: null,
        instructions_ar: 'امشِ باتجاه الجامعة الأردنية (٢ كم)',
        instructions_en: 'Walk towards the University of Jordan (2 km)',
      },
    ],
  },
];

const MOCK_REPORTS: CommunityReport[] = [
  {
    id: 'report-001',
    type: 'crowding',
    stopId: 'stop-001',
    routeId: null,
    lat: 31.9565,
    lng: 35.9068,
    message: 'محطة عبدلي مزدحمة جداً الآن',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    reporterId: 'user-001',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'report-002',
    type: 'delay',
    stopId: null,
    routeId: 'route-brt1',
    lat: 31.9501,
    lng: 35.8765,
    message: 'تأخير على خط باص سريع ١ بسبب حادث سير',
    expiresAt: new Date(Date.now() + 7200000).toISOString(),
    reporterId: 'user-002',
    createdAt: new Date().toISOString(),
  },
];

const MOCK_SETTINGS: AppSettings = {
  language: 'ar',
  theme: 'system',
  notificationsEnabled: true,
  alertMinutes: [5, 10, 15],
  favoriteRouteIds: ['route-brt1'],
  homeLocation: { lat: 31.9760, lng: 35.8940 },
  workLocation: { lat: 31.9565, lng: 35.9068 },
};

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Wraps an API call. If the call fails with a network-related error (offline,
 * timeout, DNS failure), returns `fallback` instead of throwing.
 * Non-network errors (4xx, 5xx) are re-thrown so callers can handle auth
 * failures, bad requests, etc.
 */
async function withOfflineFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (isNetworkError(error)) {
      return fallback;
    }
    throw error;
  }
}

/**
 * Casts an api-client response (unknown) to a typed PaginatedResponse<T>
 * and returns the `.data` array. Falls back to treating the response itself
 * as T[] if the shape doesn't match.
 */
function unwrapList<T>(response: unknown): T[] {
  if (response && typeof response === 'object' && 'data' in response) {
    const paginated = response as PaginatedResponse<T>;
    if (Array.isArray(paginated.data)) return paginated.data;
  }
  if (Array.isArray(response)) return response as T[];
  return [];
}

// ─── Stops API ──────────────────────────────────────────────────────────────

/**
 * Search stops by name (Arabic or English).
 * GET /api/v1/stops/search?q=
 */
export async function searchStops(query: string): Promise<Stop[]> {
  return withOfflineFallback(async () => {
    const response = await stopsApi.list({ q: query, limit: 10 });
    const results = unwrapList<Stop>(response);
    return results;
  }, MOCK_STOPS.filter((s) =>
    s.name_ar.includes(query) || s.name_en.toLowerCase().includes(query.toLowerCase()),
  ));
}

/**
 * Find stops near a geographic location.
 * GET /api/v1/stops?lat=&lng=&radius=
 * Radius is in meters, defaults to 500m.
 */
export async function getNearbyStops(lat: number, lng: number, radius = 500): Promise<Stop[]> {
  const cacheKey = `nearby_stops_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
  const cached = getCachedData<Stop[]>(cacheKey, 60_000); // 1-min cache for nearby
  if (cached) return cached;

  return withOfflineFallback(async () => {
    const response = await stopsApi.list({ lat, lng, radius });
    const results = unwrapList<Stop>(response);
    cacheData(cacheKey, results);
    return results;
  }, MOCK_STOPS.map((s) => ({
    ...s,
    distance_m: Math.round(
      haversineDistance(lat, lng, s.lat, s.lng),
    ),
  })).sort((a, b) => (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity)));
}

/**
 * Get a single stop by its ID (including full details).
 * GET /api/v1/stops/:id
 */
export async function getStopById(id: string): Promise<Stop> {
  return withOfflineFallback(async () => {
    const response = await stopsApi.getById(id);
    return response as Stop;
  }, findMockStop(id));
}

// ─── Routes API ─────────────────────────────────────────────────────────────

/**
 * List all routes, optionally filtered by mode, governorate, or active status.
 * GET /api/v1/routes
 */
export async function getRoutes(filters?: RouteFilters): Promise<Route[]> {
  const cacheKey = `routes_${JSON.stringify(filters ?? {})}`;
  const cached = getCachedData<Route[]>(cacheKey, 300_000); // 5-min expiry
  if (cached) return cached;

  return withOfflineFallback(async () => {
    const response = await routesApi.list({
      mode: filters?.mode,
      governorate: filters?.governorate,
      isActive: filters?.isActive,
    });
    const results = unwrapList<Route>(response);
    cacheData(cacheKey, results);
    return results;
  }, MOCK_ROUTES.filter((r) => {
    if (filters?.mode && r.mode !== filters.mode) return false;
    if (filters?.governorate && r.governorate !== filters.governorate) return false;
    if (filters?.isActive !== undefined && r.isActive !== filters.isActive) return false;
    return true;
  }));
}

/**
 * Get a single route by its ID.
 * GET /api/v1/routes/:id
 */
export async function getRouteById(id: string): Promise<Route> {
  return withOfflineFallback(async () => {
    const response = await routesApi.getById(id);
    return response as Route;
  }, findMockRoute(id));
}

/**
 * Get all stops along a route, in sequence.
 * GET /api/v1/routes/:id/stops
 */
export async function getRouteStops(id: string): Promise<Stop[]> {
  return withOfflineFallback(async () => {
    const response = await routesApi.getStops(id);
    return unwrapList<Stop>(response);
  }, MOCK_STOPS.slice(0, 4));
}

// ─── Departures API ─────────────────────────────────────────────────────────

/**
 * Get live departure board for a stop.
 * Returns the departure board response (stop info + departures list).
 * GET /api/v1/departures?stopId=
 */
export async function getDepartures(stopId: string): Promise<DepartureBoardResponse> {
  const cacheKey = `departures_${stopId}`;
  const cached = getCachedData<DepartureBoardResponse>(cacheKey, 120_000); // 2-min expiry
  if (cached) return cached;

  return withOfflineFallback(async () => {
    const response = await departuresApi.getForStop(stopId);
    const data = response as DepartureBoardResponse;
    cacheData(cacheKey, data);
    return data;
  }, {
    stop: MOCK_STOPS.find((s) => s.id === stopId) ?? MOCK_STOPS[0],
    departures: MOCK_DEPARTURES,
    generatedAt: new Date().toISOString(),
  } as unknown as DepartureBoardResponse);
}

// ─── Trip Planner API ───────────────────────────────────────────────────────

/**
 * Plan a journey between two locations.
 * Returns ranked list of possible journeys.
 * POST /api/v1/planner
 */
export async function planJourney(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  options?: PlannerOptions,
): Promise<Journey[]> {
  return withOfflineFallback(async () => {
    const response = await tripPlannerApi.plan({
      fromLat,
      fromLng,
      toLat,
      toLng,
      time: options?.time,
      timeType: options?.timeType,
      maxWalkingMeters: options?.maxWalkMeters,
      maxTransfers: options?.maxTransfers,
      preferredModes: options?.preferredModes?.join(","),
      preference: options?.preference,
    });
    return unwrapList<Journey>(response);
  }, MOCK_JOURNEYS);
}

// ─── Alerts API ─────────────────────────────────────────────────────────────

/**
 * Get active service alerts / notifications.
 * GET /api/v1/alerts
 */
export async function getAlerts(filters?: AlertFilters): Promise<TransitAlert[]> {
  const cacheKey = `alerts_${JSON.stringify(filters ?? {})}`;
  const cached = getCachedData<TransitAlert[]>(cacheKey, 60_000); // 1-min expiry
  if (cached) return cached;

  return withOfflineFallback(async () => {
    const response = await alertsApi.list({
      isActive: filters?.isActive,
      governorate: filters?.governorate,
    });
    const results = unwrapList<TransitAlert>(response);
    cacheData(cacheKey, results);
    return results;
  }, MOCK_ALERTS.filter((a) => {
    if (filters?.isActive !== undefined && a.isActive !== filters.isActive) return false;
    if (filters?.governorate && !a.governorates.includes(filters.governorate)) return false;
    return true;
  }));
}

/**
 * Get a single alert by its ID.
 * GET /api/v1/alerts/:id
 *
 * NOTE: The api-client does not expose alertsApi.getById(). This function
 * fetches all alerts and filters client-side. Once a dedicated endpoint
 * exists, replace this with a direct call.
 */
export async function getAlertById(id: string): Promise<TransitAlert> {
  return withOfflineFallback(async () => {
    const all = await getAlerts();
    const found = all.find((a) => a.id === id);
    if (!found) {
      throw new ApiError(404, 'NotFound', `Alert ${id} not found.`, `Alert ${id} not found.`);
    }
    return found;
  }, MOCK_ALERTS.find((a) => a.id === id) ?? MOCK_ALERTS[0]);
}

// ─── Vehicles API (requires auth) ───────────────────────────────────────────

/**
 * Get all tracked vehicles with live positions.
 * Requires authentication.
 * GET /api/v1/vehicles
 */
export async function getVehicles(): Promise<TransitVehicle[]> {
  return withOfflineFallback(async () => {
    const response = await vehiclesApi.list();
    return unwrapList<TransitVehicle>(response);
  }, MOCK_VEHICLES);
}

/**
 * Get a single vehicle by its ID.
 * Requires authentication.
 * GET /api/v1/vehicles/:id
 */
export async function getVehicleById(id: string): Promise<TransitVehicle> {
  return withOfflineFallback(async () => {
    const response = await vehiclesApi.getById(id);
    return response as TransitVehicle;
  }, MOCK_VEHICLES.find((v) => v.id === id) ?? MOCK_VEHICLES[0]);
}

// ─── Auth API ───────────────────────────────────────────────────────────────

/**
 * Authenticate with email/phone and password.
 * On success, the auth token is automatically set in the api-client for
 * subsequent requests.
 * POST /api/v1/auth/login
 */
export async function login(identifier: AuthIdentifier, password: string): Promise<AuthResponse> {
  const response = await authApi.login(identifier, password) as AuthResponse;
  return response;
}

/**
 * Create a new user account.
 * On success, the auth token is automatically set in the api-client.
 * POST /api/v1/auth/register
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await authApi.register(data) as AuthResponse;
  return response;
}

/**
 * Refresh the JWT token using the stored refresh token.
 * POST /api/v1/auth/refresh
 */
export async function refreshToken(): Promise<RefreshResponse> {
  const currentToken = getAuthToken();
  if (!currentToken) {
    throw new ApiError(401, 'NoToken', 'No auth token to refresh.');
  }
  const response = await authApi.refresh(currentToken) as RefreshResponse;
  return response;
}

/**
 * Get the authenticated user's profile.
 * GET /api/v1/auth/me
 */
export async function getProfile(): Promise<AppUser> {
  return withOfflineFallback(async () => {
    const response = await authApi.profile();
    return response as AppUser;
  }, MOCK_USER);
}

// ─── Community Reports API ──────────────────────────────────────────────────

/**
 * List community reports, optionally filtered by type, stop, or route.
 * GET /api/v1/reports
 *
 * NOTE: The api-client does not yet expose reportsApi.list(). This function
 * returns mock data until the backend endpoint is wired in the client.
 */
export async function getReports(filters?: ReportFilters): Promise<CommunityReport[]> {
  await Promise.resolve();
  return MOCK_REPORTS.filter((r) => {
    if (filters?.type && r.type !== filters.type) return false;
    if (filters?.stopId && r.stopId !== filters.stopId) return false;
    if (filters?.routeId && r.routeId !== filters.routeId) return false;
    return true;
  });
}

/**
 * Submit a new community report (crowding, delay, etc.).
 * POST /api/v1/reports
 * If offline, queues the action for later sync.
 */
export async function createReport(data: CreateReportData): Promise<CommunityReport> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected || netState.isInternetReachable === false) {
    queueOfflineAction({
      type: 'report',
      endpoint: '/reports',
      body: data,
    });
    // Return a local placeholder so the UI can show it immediately
    return {
      id: `offline-${Date.now()}`,
      type: data.type,
      stopId: data.stopId ?? null,
      routeId: data.routeId ?? null,
      lat: data.lat,
      lng: data.lng,
      message: data.message,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      reporterId: 'offline',
      createdAt: new Date().toISOString(),
    } as CommunityReport;
  }
  const response = await reportsApi.create(data) as CommunityReport;
  return response;
}

// ─── Settings API (mock) ────────────────────────────────────────────────────

/**
 * Get app settings. Currently returns mock defaults since there is no
 * dedicated settings backend endpoint.
 */
export async function getSettings(): Promise<AppSettings> {
  // Simulate network latency for consistency
  await Promise.resolve();
  return { ...MOCK_SETTINGS };
}

/**
 * Update app settings. Currently a no-op that returns success since settings
 * are stored locally.
 */
export async function updateSettings(_data: Partial<AppSettings>): Promise<{ ok: true }> {
  await Promise.resolve();
  return { ok: true };
}

// ─── Type Transformation Layer ──────────────────────────────────────────────
// Converts canonical types (transit.types.ts, matching backend) to the shapes
// expected by UI components (JourneyCard, DepartureCard, StopCard, etc.).
// This is the bridge that allows real API data to reach the UI.

// Type transformation helpers: canonical (transit.types.ts) → display format.
// Handles BOTH canonical shape (duration_min, distance_km, fromStop/toStop)
// AND backend response shape (durationMinutes, distanceMeters, from/to).
// All fields guarded with null checks.
// ============================================================================

/** Create empty stop placeholder for missing data. */
function emptyStop() {
  return { id: "", nameAr: "", nameEn: "", code: "", lat: 0, lng: 0, modes: [], isLandmark: false, isAccessible: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canonicalStopToDisplay(s: Stop & { distance_m?: number }): any {
  if (!s) return emptyStop();
  return {
    id: s.id ?? "", nameAr: s.name_ar || s.name_en || "محطة", nameEn: s.name_en || s.name_ar || "Stop", code: s.code ?? "",
    lat: s.lat ?? 0, lng: s.lng ?? 0, modes: [],
    isLandmark: s.isTerminal ?? false, isAccessible: s.hasAccessibility ?? false,
    distance: s.distance_m ?? undefined,
  };
}

/**
 * Convert a backend-response leg (from trip planner POST /api/v1/planner)
 * to the display RouteLeg format.
 * Backend leg shape: { type, mode?, routeCode?, routeName_ar?, routeName_en?,
 *   from: {name_ar,name_en,lat,lng}, to: {same}, departureTime, arrivalTime,
 *   durationMinutes, distanceMeters, fare, instruction_ar, instruction_en }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function backendLegToDisplay(leg: any): any {
  if (!leg) {
    return { mode: "walking", fromStop: emptyStop(), toStop: emptyStop(),
      departureTime: new Date().toISOString(), arrivalTime: new Date().toISOString(),
      durationMinutes: 0, intermediateStops: 0, polyline: [] };
  }
  const isWalk = leg.type === "walk";
  const mode = isWalk ? "walking" : (leg.mode || "city_bus");
  const from = leg.from || {};
  const to = leg.to || {};

  return {
    type: isWalk ? "walk" : "transit",
    mode,
    routeCode: leg.routeCode ?? undefined,
    routeName_ar: leg.routeName_ar ?? undefined,
    routeName_en: leg.routeName_en ?? undefined,
    routeColor: leg.routeColor ?? undefined,
    lineCode: leg.routeCode ?? undefined,
    lineNameAr: leg.routeName_ar ?? undefined,
    lineNameEn: leg.routeName_en ?? undefined,
    from: { name_ar: from.name_ar ?? "", name_en: from.name_en ?? "", lat: from.lat ?? 0, lng: from.lng ?? 0 },
    to: { name_ar: to.name_ar ?? "", name_en: to.name_en ?? "", lat: to.lat ?? 0, lng: to.lng ?? 0 },
    fromStop: {
      id: "", nameAr: from.name_ar ?? "", nameEn: from.name_en ?? "",
      code: "", lat: from.lat ?? 0, lng: from.lng ?? 0,
      modes: [], isLandmark: false, isAccessible: false,
    },
    toStop: {
      id: "", nameAr: to.name_ar ?? "", nameEn: to.name_en ?? "",
      code: "", lat: to.lat ?? 0, lng: to.lng ?? 0,
      modes: [], isLandmark: false, isAccessible: false,
    },
    departureTime: leg.departureTime ?? new Date().toISOString(),
    arrivalTime: leg.arrivalTime ?? new Date().toISOString(),
    durationMinutes: leg.durationMinutes ?? 0,
    headSignAr: undefined,
    headSignEn: undefined,
    intermediateStops: 0,
    polyline: leg.polyline ?? [],
    walkingDistance: isWalk ? (leg.distanceMeters ?? 0) : undefined,
  };
}

/**
 * Convert a canonical leg (transit.types.ts JourneyLeg) to display RouteLeg format.
 * Canonical leg shape: { mode, routeCode?, routeName_ar?, routeName_en?, routeColor?,
 *   fromStop: TransitStop, toStop: TransitStop, departureTime, arrivalTime,
 *   duration_min, distance_km, polyline, fare_jod, ... }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function canonicalLegToDisplay(leg: any): any {
  if (!leg) {
    return { mode: "walking", fromStop: emptyStop(), toStop: emptyStop(),
      departureTime: new Date().toISOString(), arrivalTime: new Date().toISOString(),
      durationMinutes: 0, intermediateStops: 0, polyline: [] };
  }
  const fromStop = leg.fromStop ? canonicalStopToDisplay({ ...leg.fromStop, distance_m: undefined } as any) : emptyStop();
  const toStop = leg.toStop ? canonicalStopToDisplay({ ...leg.toStop, distance_m: undefined } as any) : emptyStop();

  return {
    mode: leg.mode || "walking",
    lineCode: leg.routeCode ?? undefined,
    lineNameAr: leg.routeName_ar ?? undefined,
    lineNameEn: leg.routeName_en ?? undefined,
    fromStop,
    toStop,
    departureTime: leg.departureTime ?? new Date().toISOString(),
    arrivalTime: leg.arrivalTime ?? new Date().toISOString(),
    durationMinutes: leg.duration_min ?? 0,
    headSignAr: undefined,
    headSignEn: undefined,
    intermediateStops: 0,
    polyline: leg.polyline ?? [],
    walkingDistance: leg.mode === "walking" ? Math.round((leg.distance_km || 0) * 1000) : undefined,
  };
}

/**
 * Convert a backend-response or canonical Journey to the display format
 * (the `Journey` type from @/types/transit used by JourneyCard).
 *
 * Handles BOTH shapes gracefully with null-checks on all fields:
 *
 * Backend response (from trip planner):
 *   { legs: [{ type, durationMinutes, distanceMeters, from, to, ... }],
 *     totalDuration, totalWalking, totalFare, totalTransfers, ... }
 *
 * Canonical shape (transit.types.ts):
 *   { legs: [{ mode, duration_min, distance_km, fromStop, toStop, ... }],
 *     duration_min, walkingDistance_km, totalFare_jod, ... }
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canonicalJourneyToDisplay(j: any): any {
  if (!j) {
    return { id: "", legs: [], totalDurationMinutes: 0, walkingMinutes: 0,
      transfers: 0, fareAmount: 0, fareCurrency: "د.أ",
      departureTime: new Date().toISOString(), arrivalTime: new Date().toISOString(), modes: [] };
  }

  const legs = Array.isArray(j.legs) ? j.legs : [];

  // Detect shape: backend response has totalDuration, canonical has duration_min
  const isBackendShape = "totalDuration" in j;

  const flatLegs = legs.map((leg: any) =>
    isBackendShape ? backendLegToDisplay(leg) : canonicalLegToDisplay(leg)
  );

  const totalDurationMinutes = isBackendShape
    ? (j.totalDuration ?? 0)
    : (j.duration_min ?? 0);

  const walkingMinutes = isBackendShape
    ? Math.round((j.totalWalking ?? 0) / 80)
    : Math.round((j.walkingDistance_km ?? 0) * 12);

  const transfers = isBackendShape
    ? (j.totalTransfers ?? Math.max(0, legs.filter((l: any) => l.type !== "walk").length - 1))
    : Math.max(0, legs.filter((l: any) => l.mode !== "walking").length - 1);

  const fareAmount = isBackendShape
    ? (j.totalFare ?? 0)
    : (j.totalFare_jod ?? 0);

  return {
    id: j.id ?? `j-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    legs: flatLegs,
    totalDurationMinutes,
    walkingMinutes,
    transfers,
    fareAmount,
    fareCurrency: "د.أ",
    departureTime: j.departureTime ?? new Date().toISOString(),
    arrivalTime: j.arrivalTime ?? new Date().toISOString(),
    modes: [...new Set(
      legs
        .filter((l: any) => {
          const t = isBackendShape ? l.type : l.mode;
          return t !== "walk" && t !== "walking";
        })
        .map((l: any) => isBackendShape ? (l.mode || l.type) : l.mode)
    )],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canonicalDepartureToDisplay(d: Departure): any {
  const fare = typeof d.fare === "number" ? d.fare : ((d.fare as any)?.min ?? 0);
  return {
    id: d.tripId ?? d.routeId, stopId: "",
    lineCode: d.code, lineNameAr: d.name_ar, lineNameEn: d.name_en,
    destinationAr: d.name_ar, destinationEn: d.name_en,
    mode: d.mode, scheduledAt: d.departureTime, estimatedAt: d.departureTime,
    countdownMinutes: d.waitMinutes,
    status: (d.status === "on_time" ? "on_time" : d.status === "delayed" ? "delayed" : "cancelled"),
    occupancy: (d.occupancy ?? "partial"), hasAlert: false,
  };
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * Approximate Haversine distance in meters between two GPS coordinates.
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000; // Earth's radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findMockStop(id: string): Stop {
  return MOCK_STOPS.find((s) => s.id === id) ?? MOCK_STOPS[0];
}

function findMockRoute(id: string): Route {
  return MOCK_ROUTES.find((r) => r.id === id) ?? MOCK_ROUTES[0];
}

// ─── Unified API Object ─────────────────────────────────────────────────────

/**
 * Convenience object grouping all API functions.
 *
 * Usage:
 *   import api from '@/services/api';
 *   const stops = await api.searchStops('عبدلي');
 */
export const api = {
  // Stops
  searchStops,
  getNearbyStops,
  getStopById,

  // Routes
  getRoutes,
  getRouteById,
  getRouteStops,

  // Departures
  getDepartures,

  // Trip Planner
  planJourney,

  // Alerts
  getAlerts,
  getAlertById,

  // Vehicles
  getVehicles,
  getVehicleById,

  // Auth
  login,
  register,
  refreshToken,
  getProfile,

  // Community
  getReports,
  createReport,

  // Settings
  getSettings,
  updateSettings,
} as const;

export default api;
