// ============================================================================
// دروب (Droob) — Transit Type Definitions
// ============================================================================

import type { TransitMode } from "@theme/tokens";

/** Vehicle occupancy level */
export type OccupancyLevel = "empty" | "partial" | "full";

/** Departure status */
export type DepartureStatus = "on_time" | "delayed" | "cancelled";

/** Stop / station */
export interface TransitStop {
  id: string;
  nameAr: string;
  nameEn: string;
  code: string;
  lat: number;
  lng: number;
  modes: TransitMode[];
  isLandmark: boolean;
  isAccessible: boolean;
  distance?: number; // meters from user
}

/** Next departure from a stop */
export interface Departure {
  id: string;
  stopId: string;
  lineCode: string;
  lineNameAr: string;
  lineNameEn: string;
  destinationAr: string;
  destinationEn: string;
  mode: TransitMode;
  scheduledAt: string; // ISO
  estimatedAt: string; // ISO (real-time)
  countdownMinutes: number;
  status: DepartureStatus;
  occupancy: OccupancyLevel;
  platform?: string;
  hasAlert: boolean;
}

/** Route segment (leg) */
export interface RouteLeg {
  mode: TransitMode;
  lineCode?: string;
  lineNameAr?: string;
  lineNameEn?: string;
  fromStop: TransitStop;
  toStop: TransitStop;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  headSignAr?: string;
  headSignEn?: string;
  intermediateStops: number;
  polyline: [number, number][]; // [lng, lat][]
  walkingDistance?: number; // meters, for walking legs
}

/** Full journey result */
export interface Journey {
  id: string;
  legs: RouteLeg[];
  totalDurationMinutes: number;
  walkingMinutes: number;
  transfers: number;
  fareAmount?: number;
  fareCurrency: string;
  departureTime: string;
  arrivalTime: string;
  modes: TransitMode[];
}

/** Live vehicle position */
export interface VehiclePosition {
  id: string;
  vehicleId: string;
  lineCode: string;
  mode: TransitMode;
  lat: number;
  lng: number;
  heading: number; // degrees
  speed: number; // km/h
  occupancy: OccupancyLevel;
  updatedAt: string; // ISO
  nextStopId?: string;
}

/** Quick chip / saved place */
export interface QuickChip {
  id: string;
  icon: string; // emoji
  labelAr: string;
  labelEn: string;
  lat: number;
  lng: number;
  type: "home" | "work" | "saved" | "recent";
}

/** Alert / service notification */
export interface ServiceAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  affectedLines: string[];
  affectedStops: string[];
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

/** KPI data for dashboard */
export interface KpiData {
  label: string;
  labelAr: string;
  value: number;
  unit: string;
  trend: number; // percentage change
  trendDirection: "up" | "down" | "flat";
  sparkline: number[];
}

/** Fleet vehicle (dashboard) */
export interface FleetVehicle {
  id: string;
  vehicleId: string;
  lineCode: string;
  lineNameAr: string;
  driverName: string;
  speed: number;
  status: "active" | "inactive" | "out_of_service";
  lat: number;
  lng: number;
  updatedAt: string;
  occupancy: OccupancyLevel;
  nextStopAr?: string;
}

/** Line health status */
export type LineHealthStatus = "on_schedule" | "minor_delay" | "disrupted";

/** Line health record */
export interface LineHealth {
  lineCode: string;
  nameAr: string;
  status: LineHealthStatus;
  onTimePercentage: number;
  activeVehicles: number;
  totalVehicles: number;
  avgDelay: number; // minutes
}