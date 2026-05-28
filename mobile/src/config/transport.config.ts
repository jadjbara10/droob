// ============================================================================
// دروب (Droob) — Jordan Transit Configuration
// Transport modes, colors, Jordan bounds, and constants
// ============================================================================

import { ModeConfig, TransportMode, Governorate } from '../types/transit.types';

// ─── Jordan Geographic Bounds ──────────────────────────────────────────────
export const JORDAN_BOUNDS = {
  west: 35.0,                    // minimum longitude
  south: 29.0,                  // minimum latitude
  east: 39.5,                   // maximum longitude
  north: 33.5,                  // maximum latitude
} as const;

export const AMMAN_CENTER = {
  lat: 31.9539,                  // 4th Circle, Amman
  lng: 35.9106,
} as const;

export const DEFAULT_ZOOM = 13;  // Amman district level
export const MIN_ZOOM = 7;       // all Jordan visible
export const MAX_ZOOM = 18;      // street level detail

// ─── Map Style URL (Arabic-optimized) ─────────────────────────────────────
export const MAPBOX_ARABIC_STYLE = 'mapbox://styles/droob/arabic-transit-v1';

// ─── Transport Mode Configurations ─────────────────────────────────────────
// Color codes match the master spec exactly
export const TRANSPORT_MODES: Record<TransportMode, ModeConfig> = {
  city_bus: {
    mode: 'city_bus',
    label_ar: 'باص مدني',
    label_en: 'City Bus',
    color: '#0066CC',            // Blue
    icon: '🚌',
    speed_kmh: 25,
    fare_min_jod: 0.350,
    fare_max_jod: 0.550,
    is_fixed_schedule: true,
    is_frequent_service: false,
    departure_logic: 'schedule',
  },
  brt: {
    mode: 'brt',
    label_ar: 'باص سريع',
    label_en: 'BRT',
    color: '#E60026',            // Red
    icon: '⚡',
    speed_kmh: 35,
    fare_min_jod: 0.500,
    fare_max_jod: 0.500,
    is_fixed_schedule: true,
    is_frequent_service: true,
    departure_logic: 'headway',
  },
  serveece: {
    mode: 'serveece',
    label_ar: 'سرفيس',
    label_en: 'Serveece',
    color: '#FF8C00',            // Amber/Orange
    icon: '🚐',
    speed_kmh: 30,
    fare_min_jod: 0.200,
    fare_max_jod: 0.400,
    is_fixed_schedule: false,
    is_frequent_service: true,
    departure_logic: 'on_demand',
  },
  intercity: {
    mode: 'intercity',
    label_ar: 'بين المدن',
    label_en: 'Intercity',
    color: '#6B21A8',            // Purple
    icon: '🚌',
    speed_kmh: 60,
    fare_min_jod: 0.750,
    fare_max_jod: 3.000,
    is_fixed_schedule: true,
    is_frequent_service: false,
    departure_logic: 'schedule',
  },
};

export const WALKING_MODE = {
  mode: 'walking' as const,
  label_ar: 'مشي',
  label_en: 'Walking',
  color: '#6B7280',              // Gray
  icon: '🚶',
  speed_kmh: 5,
} as const;

// ─── Color System (all transit-coded) ─────────────────────────────────────
export const COLORS = {
  // Transit mode colors
  cityBus: '#0066CC',
  brt: '#E60026',
  serveece: '#FF8C00',
  intercity: '#6B21A8',
  walking: '#6B7280',

  // Status colors
  onTime: '#16A34A',             // Green — في الموعد
  delayed: '#EAB308',           // Yellow — تأخير
  cancelled: '#DC2626',         // Red — ملغي

  // Occupancy colors
  occupancyEmpty: '#16A34A',    // Green — فارغ
  occupancyPartial: '#EAB308',  // Yellow — ممتلئ جزئياً
  occupancyFull: '#DC2626',     // Red — ممتلئ

  // Jordan flag colors
  primary: '#1A4F8A',           // Jordan flag blue
  accent: '#2E7D32',            // Jordan flag green
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',

  // Map layer colors (same as mode colors but with transparency variants)
  layerOpacity: {
    serveeceCorridor: 'rgba(255, 140, 0, 0.15)',
    cityBusRoute: 'rgba(0, 102, 204, 0.8)',
    brtRoute: 'rgba(230, 0, 38, 0.9)',
    intercityRoute: 'rgba(107, 33, 168, 0.8)',
    walkingPath: 'rgba(107, 114, 128, 0.6)',
    activeTripGlow: 'rgba(255, 255, 255, 0.6)',
  },
} as const;

// ─── Occupancy Display ─────────────────────────────────────────────────────
export const OCCUPANCY = {
  empty: { label_ar: 'فارغ', label_en: 'Empty', color: COLORS.occupancyEmpty, icon: '🟢' },
  partial: { label_ar: 'ممتلئ جزئياً', label_en: 'Partially Full', color: COLORS.occupancyPartial, icon: '🟡' },
  full: { label_ar: 'ممتلئ', label_en: 'Full', color: COLORS.occupancyFull, icon: '🔴' },
} as const;

// ─── Departure Status Display ──────────────────────────────────────────────
export const DEPARTURE_STATUS = {
  on_time: { label_ar: 'في الموعد', label_en: 'On Time', color: COLORS.onTime },
  delayed: { label_ar: 'تأخير', label_en: 'Delayed', color: COLORS.delayed },
  cancelled: { label_ar: 'ملغي', label_en: 'Cancelled', color: COLORS.cancelled },
} as const;

// ─── Jordan Governorates (all 12) ──────────────────────────────────────────
export const GOVERNORATES: Governorate[] = [
  'عمان', 'إربد', 'الزرقاء', 'البلقاء', 'مادبا', 'الكرك',
  'الطفيلة', 'معان', 'العقبة', 'جرش', 'عجلون', 'المفرق',
];

// ─── Landmark Stops (seed locations) ──────────────────────────────────────
export const LANDMARK_STOPS: Array<{
  code: string; name_ar: string; name_en: string; lat: number; lng: number;
}> = [
  { code: 'AMM-4TH', name_ar: 'الرابع', name_en: '4th Circle', lat: 31.9539, lng: 35.9106 },
  { code: 'AMM-BLD', name_ar: 'وسط البلد', name_en: 'Downtown Amman', lat: 31.9516, lng: 35.9397 },
  { code: 'AMM-ABD', name_ar: 'العبدلي', name_en: 'Abdali Terminal', lat: 31.9636, lng: 35.9156 },
  { code: 'AMM-WHD', name_ar: 'الوحدات', name_en: 'Wahdat Terminal', lat: 31.9239, lng: 35.8900 },
  { code: 'AMM-UJ', name_ar: 'الجامعة الأردنية', name_en: 'University of Jordan', lat: 32.0156, lng: 35.8747 },
  { code: 'AMM-GDN', name_ar: 'مجمع الجاردنز', name_en: 'Gardens Complex', lat: 31.9856, lng: 35.8714 },
  { code: 'AMM-MRK', name_ar: 'مجمع ماركا', name_en: 'Marka Complex', lat: 31.9778, lng: 35.9889 },
  { code: 'AMM-DAKH', name_ar: 'دوار الداخلية', name_en: 'Interior Ministry Circle', lat: 31.9603, lng: 35.8833 },
  { code: 'AMM-MHK', name_ar: 'دوار المحكمة', name_en: 'Court Circle', lat: 31.9750, lng: 35.9139 },
  { code: 'AMM-SWL', name_ar: 'الصويلح', name_en: 'Sweileh', lat: 32.0367, lng: 35.8275 },
  { code: 'AMM-WS', name_ar: 'وادي السير', name_en: 'Wadi Seer', lat: 31.9431, lng: 35.8500 },
  { code: 'AMM-RUS', name_ar: 'الرصيفة', name_en: 'Rusaifa', lat: 32.0167, lng: 36.0500 },
  { code: 'AMM-AIR', name_ar: 'مطار الملكة علياء', name_en: 'QAI Airport', lat: 31.7225, lng: 35.9933 },
];

// ─── Time Periods (Jordan-specific) ──────────────────────────────────────
export const PEAK_HOURS = {
  morning: { start: '07:00', end: '09:00' },
  evening: { start: '16:00', end: '19:00' },
} as const;

export const FRIDAY_PRAYER_GAP = {
  start: '11:30',
  end: '13:30',
} as const;

// ─── Fare System ───────────────────────────────────────────────────────────
export const FARE = {
  TRANSFER_DISCOUNT: 0.10,       // 10% discount on 2nd vehicle within 90 min
  TRANSFER_WINDOW_MIN: 90,      // minutes
  CURRENCY: 'د.أ',               // JOD symbol Arabic
  CURRENCY_EN: 'JOD',
} as const;

// ─── Quick Access Stops (home screen shortcuts) ─────────────────────────
export const QUICK_ACCESS_STOPS = [
  { code: 'AMM-UJ', name_ar: 'الجامعة الأردنية', name_en: 'University of Jordan' },
  { code: 'AMM-BLD', name_ar: 'وسط البلد', name_en: 'Downtown' },
  { code: 'AMM-AIR', name_ar: 'المطار', name_en: 'Airport' },
  { code: 'AMM-ABD', name_ar: 'العبدلي', name_en: 'Abdali' },
] as const;

// ─── Home Screen Snap Points (percentage heights for bottom sheet) ──────
export const HOME_SNAP_POINTS = [0.30, 0.60, 1.0] as const;

// ─── Departure Filters (departures screen tabs) ─────────────────────────
export const DEPARTURE_FILTERS = [
  { key: 'all', label_ar: 'الكل', label_en: 'All' },
  { key: 'city_bus', label_ar: 'باص', label_en: 'Bus' },
  { key: 'brt', label_ar: 'سريع', label_en: 'BRT' },
  { key: 'serveece', label_ar: 'سرفيس', label_en: 'Serveece' },
  { key: 'intercity', label_ar: 'خطوط', label_en: 'Intercity' },
] as const;

// ─── Trip Planner Filters ───────────────────────────────────────────────
export const TRIP_FILTERS = [
  { key: 'fastest', label_ar: 'الأسرع', label_en: 'Fastest', icon: '⚡' },
  { key: 'fewest_transfers', label_ar: 'أقل تحويلات', label_en: 'Fewest Transfers', icon: '🔄' },
  { key: 'least_walking', label_ar: 'أقل مشي', label_en: 'Least Walking', icon: '🚶' },
  { key: 'wheelchair_accessible', label_ar: 'مناسب للإعاقة', label_en: 'Accessible', icon: '♿' },
] as const;

// ─── Time Options for Trip Planner ──────────────────────────────────────
export const TIME_OPTIONS = [
  { key: 'now', label_ar: 'الآن', label_en: 'Now' },
  { key: 'depart_at', label_ar: 'أغادر في', label_en: 'Depart at' },
  { key: 'arrive_by', label_ar: 'أصل في', label_en: 'Arrive by' },
] as const;

// ─── Transport Config (unified config object used by App.tsx) ────────────
export const transportConfig = {
  jordanBounds: JORDAN_BOUNDS,
  ammanCenter: AMMAN_CENTER,
  defaultZoom: DEFAULT_ZOOM,
  mapStyle: MAPBOX_ARABIC_STYLE,
  modes: TRANSPORT_MODES,
  colors: COLORS,
  fare: FARE,
  peakHours: PEAK_HOURS,
  fridayGap: FRIDAY_PRAYER_GAP,
  landmarks: LANDMARK_STOPS,
  governorates: GOVERNORATES,
  quickAccess: QUICK_ACCESS_STOPS,
  homeSnapPoints: HOME_SNAP_POINTS,
  departureFilters: DEPARTURE_FILTERS,
  tripFilters: TRIP_FILTERS,
  timeOptions: TIME_OPTIONS,
  occupancy: OCCUPANCY,
  departureStatus: DEPARTURE_STATUS,
};
