// ============================================================================
// دروب (Droob) — Unified Type Exports
// ============================================================================
//
// Single entry point for all Droob types.
//
// 1. Canonical types (matching backend PostGIS schema) — re-exported from
//    ./transit.types. This is the authoritative source going forward.
//
// 2. TransitMode — re-exported from @theme/tokens (identical value set to
//    TransportMode: 'city_bus' | 'brt' | 'serveece' | 'intercity').
//
// 3. Legacy compatibility aliases — types from the old ./transit that do NOT
//    appear in ./transit.types. Provided so that imports migrating from
//    @/types/transit to @/types continue to compile.
//
// MIGRATION NOTE
//   TransitStop, Departure, and Journey in ./transit.types have DIFFERENT
//   shapes from their same-named counterparts in ./transit (the old UI-facing
//   definitions). The canonical ./transit.types versions win via export *.
//   Any old code relying on the legacy shapes must be updated.
// ============================================================================

// ─── Canonical Types (matches backend PostGIS schema) ─────────────────────────
export * from './transit.types';

// ─── Transit Mode from Theme Tokens ──────────────────────────────────────────
// Same literal union as TransportMode: 'city_bus' | 'brt' | 'serveece' | 'intercity'
export type { TransitMode } from '@theme/tokens';

// ─── Legacy Compatibility Aliases ────────────────────────────────────────────
// These types exist in the old ./transit.ts but have no direct equivalent in
// ./transit.types.ts (or the equivalent has a different name/shape). They are
// re-exported here so that code migrating from @/types/transit to @/types
// still resolves.
export type {
  OccupancyLevel,
  DepartureStatus,
  RouteLeg,
  VehiclePosition,
  QuickChip,
  ServiceAlert,
  KpiData,
  FleetVehicle,
  LineHealthStatus,
  LineHealth,
} from './transit';
