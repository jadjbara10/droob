// ============================================================================
// دروب (Droob) — Jordan Transit System
// Core TypeScript types matching backend PostGIS schema
// ============================================================================

// ─── Transport Modes ──────────────────────────────────────────────────────
export type TransportMode = 'city_bus' | 'brt' | 'serveece' | 'intercity';

export interface ModeConfig {
  mode: TransportMode;
  label_ar: string;
  label_en: string;
  color: string;
  icon: string;
  speed_kmh: number;       // average speed for ETA calc
  fare_min_jod: number;    // minimum fare in JOD
  fare_max_jod: number;    // maximum fare in JOD
  is_fixed_schedule: boolean;
  is_frequent_service: boolean;
  departure_logic: 'schedule' | 'headway' | 'on_demand';
}

// ─── Governorates — all 12 Jordan governorates ────────────────────────────
export type Governorate =
  | 'عمان' | 'إربد' | 'الزرقاء' | 'البلقاء' | 'مادبا' | 'الكرك'
  | 'الطفيلة' | 'معان' | 'العقبة' | 'جرش' | 'عجلون' | 'المفرق';

// ─── Stop (محطة) — matches PostGIS stops table ──────────────────────────
export interface TransitStop {
  id: string;
  code: string;                  // e.g. "AMM-4TH-001"
  name_ar: string;               // Arabic primary
  name_en: string;               // English secondary
  lat: number;
  lng: number;
  governorate: Governorate;
  city: string;
  isTerminal: boolean;
  hasShelter: boolean;
  hasLighting: boolean;
  hasAccessibility: boolean;
  hasTicketMachine: boolean;
  hasAc: boolean;
  photoUrl: string | null;
  parentStationId: string | null;
  createdAt: string;
  updatedAt: string;
  distance_m?: number;          // computed: distance from user
}

// ─── Route (خط) ──────────────────────────────────────────────────────────
export interface TransitRoute {
  id: string;
  code: string;                  // e.g. "BRT1", "2", "SERV-ABD-ZAR"
  name_ar: string;
  name_en: string;
  mode: TransportMode;
  color: string;
  agencyId: string;
  originStopId: string;
  destinationStopId: string;
  originName_ar?: string;
  originName_en?: string;
  destinationName_ar?: string;
  destinationName_en?: string;
  governorate: Governorate;
  distance_km: number;
  duration_min: number;
  fare_jod: number;
  isActive: boolean;
  hasFridaySchedule: boolean;
  hasRamadanSchedule: boolean;
  headway_min: number | null;   // minutes between departures (BRT/bus)
  vehicleType: string;
  polyline: [number, number][]; // [[lng, lat], ...] GeoJSON coords
  createdAt: string;
  updatedAt: string;
}

// ─── Schedule (جدول المواعيد) ──────────────────────────────────────────
export interface Schedule {
  id: string;
  routeId: string;
  stopId: string;
  departureTime: string;          // HH:MM format
  arrivalTime: string;
  dayType: 'weekday' | 'friday' | 'weekend' | 'ramadan';
  isValidFrom: string;
  isValidUntil: string;
}

// ─── Trip (رحلة) — active or scheduled trip ─────────────────────────────
export interface TransitTrip {
  id: string;
  routeId: string;
  vehicleId: string | null;
  scheduledDeparture: string;
  scheduledArrival: string;
  estimatedDeparture: string | null;
  estimatedArrival: string | null;
  status: 'scheduled' | 'in_progress' | 'delayed' | 'cancelled' | 'completed';
  occupancy: 'empty' | 'partial' | 'full';
  delayMinutes: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Vehicle (مركبة) — live GPS tracked ──────────────────────────────────
export interface TransitVehicle {
  id: string;
  plateNumber: string;
  vehicleType: string;
  routeId: string | null;
  tripId: string | null;
  driverName: string;
  agencyId: string;
  lat: number;
  lng: number;
  bearing: number;              // degrees (0-360)
  speed_kmh: number;
  status: 'active' | 'idle' | 'maintenance' | 'offline';
  occupancy: 'empty' | 'partial' | 'full';
  lastSeen: string;
}

// ─── Alert (تنبيه) ────────────────────────────────────────────────────────
export interface TransitAlert {
  id: string;
  type: 'delay' | 'reroute' | 'station_closure' | 'emergency' | 'maintenance';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  affectedRouteIds: string[];
  affectedStopIds: string[];
  governorates: Governorate[];
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  deliveryCount: number;
  openCount: number;
  createdAt: string;
}

// ─── Community Report (بلاغ) ──────────────────────────────────────────────
export interface CommunityReport {
  id: string;
  type: 'delay' | 'crowding' | 'ended_route' | 'closed_stop';
  stopId: string | null;
  routeId: string | null;
  lat: number;
  lng: number;
  message: string;
  expiresAt: string;
  reporterId: string;
  createdAt: string;
}

// ─── Journey / Trip Plan (الرحلة) ────────────────────────────────────────
export interface JourneyLeg {
  mode: TransportMode | 'walking';
  routeId: string | null;
  routeCode: string | null;
  routeName_ar: string | null;
  routeName_en: string | null;
  routeColor: string | null;
  fromStop: TransitStop;
  toStop: TransitStop;
  departureTime: string;
  arrivalTime: string;
  duration_min: number;
  distance_km: number;
  polyline: [number, number][];
  fare_jod: number;
  headway_min: number | null;
  vehicleOccupancy: string | null;
  instructions_ar: string;
  instructions_en: string;
}

export interface Journey {
  id: string;
  fromName_ar: string;
  toName_ar: string;
  fromName_en: string;
  toName_en: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  departureTime: string;
  arrivalTime: string;
  duration_min: number;
  totalFare_jod: number;
  walkingDistance_km: number;
  legs: JourneyLeg[];
}

// ─── Departure Display (لوحة المغادرات) ─────────────────────────────────
export interface Departure {
  routeId: string;
  code: string;                    // line code e.g. "BRT1", "2"
  name_ar: string;                 // destination in Arabic
  name_en: string;                 // destination in English
  mode: TransportMode;
  color: string;
  fare: number | { min: number; max: number };  // flat for buses, range for serveece
  departureTime: string;           // ISO datetime
  waitMinutes: number;             // minutes until departure
  occupancy: 'empty' | 'partial' | 'full';
  status: 'on_time' | 'delayed' | 'cancelled';
  tripId?: string;                 // for setting alerts
  lat?: number;                    // stop latitude (for map centering)
  lng?: number;                    // stop longitude
}

// ─── Type Aliases (shorthand names used throughout the app) ─────────────
export type Stop = TransitStop;
export type Route = TransitRoute;
export type Alert = TransitAlert;

// ─── Departure Board API Response ───────────────────────────────────────
export interface DepartureBoardResponse {
  stop: {
    id: string;
    code: string;
    name_ar: string;
    name_en: string;
  };
  departures: Departure[];
  generatedAt: string;
}

// ─── Agency (مشغل) ────────────────────────────────────────────────────────
export interface Agency {
  id: string;
  name_ar: string;
  name_en: string;
  shortName: string;
  modes: TransportMode[];
  website: string | null;
  phone: string | null;
}

// ─── API Response Envelopes ───────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

// ─── User Types ───────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'operator' | 'editor' | 'viewer';

export interface AppUser {
  id: string;
  fullName_ar: string;
  fullName_en: string;
  email: string;
  phone: string;
  role: UserRole;
  agencyId: string | null;
  homeLat: number | null;
  homeLng: number | null;
  workLat: number | null;
  workLng: number | null;
  favoriteRouteIds: string[];
  communityScore: number;
  createdAt: string;
}

// ─── Trip Planner Request Params ──────────────────────────────────────────
export interface TripPlannerParams {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  time?: string;              // ISO datetime, default: now
  timeType?: 'depart' | 'arrive';  // default: depart
  maxWalkMeters?: number;     // default: 1000
  maxTransfers?: number;      // default: 3
  preferredModes?: TransportMode[];
  preference?: 'fastest' | 'fewest_transfers' | 'least_walking' | 'wheelchair_accessible';
}

// ─── WebSocket Event Types ────────────────────────────────────────────────
export interface WsVehiclePosition {
  vehicleId: string;
  lat: number;
  lng: number;
  bearing: number;
  speed_kmh: number;
  routeId: string;
  tripId: string;
  occupancy: string;
  timestamp: string;
}

export interface WsDepartureUpdate {
  stopId: string;
  departures: Departure[];
}

export interface WsAlertBroadcast {
  alert: TransitAlert;
}