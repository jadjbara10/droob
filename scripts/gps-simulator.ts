// ============================================================================
// دروب (Droob) — Vehicle GPS Simulator
//
// Simulates GPS movement for transit vehicles along their route polylines.
// For each specified route, a virtual vehicle is created that interpolates
// position along the polyline at the configured speed multiplier.
// Positions are POSTed to the backend's /api/v1/vehicles/location endpoint
// every 3 seconds.
//
// Usage:
//   npx tsx scripts/gps-simulator.ts --routes=BRT1,BUS7 --speed=2
//
// Arguments:
//   --routes   Comma-separated list of route IDs to simulate (case-insensitive)
//              Matches the `id` field of RoutePath objects.
//              Examples: BRT1, BUS7, SERV-HUSSEIN, INTER-IRBID
//   --speed    Speed multiplier (default: 1). Higher = faster along the polyline.
//
// Examples:
//   # Simulate BRT1 and Bus 7 at normal speed
//   npx tsx scripts/gps-simulator.ts --routes=BRT1,BUS7
//
//   # Simulate all serveece routes at double speed
//   npx tsx scripts/gps-simulator.ts --routes=SERV-HUSSEIN,SERV-SWEIFIEH,SERV-ABDOUN --speed=2
//
//   # Simulate everything at crawling speed
//   npx tsx scripts/gps-simulator.ts --routes=ALL --speed=0.5
// ============================================================================

import { randomUUID } from "node:crypto";
import { ALL_ROUTE_PATHS, RoutePath } from "../mobile/src/config/route-paths";

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

function parseArgs(): { routes: string[]; speed: number } {
  const args = process.argv.slice(2);
  let routesArg = "";
  let speed = 1;

  for (const arg of args) {
    if (arg.startsWith("--routes=")) routesArg = arg.slice("--routes=".length);
    else if (arg.startsWith("--speed=")) speed = parseFloat(arg.slice("--speed=".length)) || 1;
  }

  const requestedRoutes = routesArg
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);

  return { routes: requestedRoutes, speed };
}

// ─── Vehicle State ─────────────────────────────────────────────────────────

interface VehicleState {
  id: string;
  routeId: string;
  routeName: string;
  routeCode: string;
  mode: string;
  coords: Array<[number, number]>;
  index: number;          // current segment index (0 = first coord pair)
  progress: number;       // 0..1 within the current segment
}

function createVehicle(route: RoutePath, index: number): VehicleState {
  // Derive a mode from the route id prefix
  let mode = "city_bus";
  const idLower = route.id.toLowerCase();
  if (idLower.startsWith("brt")) mode = "brt";
  else if (idLower.startsWith("serv")) mode = "serveece";
  else if (idLower.startsWith("inter")) mode = "intercity";
  else if (idLower.startsWith("bus")) mode = "city_bus";

  return {
    id: randomUUID(),
    routeId: route.id,
    routeName: route.name,
    routeCode: route.id.toUpperCase(),
    mode,
    coords: route.coords,
    index: 0,
    progress: 0,
  };
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function interpolatePosition(
  vehicle: VehicleState,
  speed: number
): { lat: number; lng: number; bearing: number; speedKmh: number } {
  const { coords, index, progress } = vehicle;

  if (index >= coords.length - 1) {
    // Reached the end — return the last coordinate and reset
    vehicle.index = 0;
    vehicle.progress = 0;
    return { lat: coords[coords.length - 1][0], lng: coords[coords.length - 1][1], bearing: 0, speedKmh: 0 };
  }

  const [lat1, lng1] = coords[index];
  const [lat2, lng2] = coords[index + 1];
  const segLength = haversine(lat1, lng1, lat2, lng2);

  // Advance progress proportional to speed
  // At speed=1, advance ~3% per tick over an average segment
  const step = 0.03 * speed;
  let newProgress = progress + step;

  if (newProgress >= 1) {
    vehicle.index = index + 1;
    vehicle.progress = newProgress - 1;
  } else {
    vehicle.progress = newProgress;
  }

  // Interpolate position
  const p = vehicle.index === index ? vehicle.progress : 0;
  const lat = lat1 + (lat2 - lat1) * p;
  const lng = lng1 + (lng2 - lng1) * p;
  const bearing = calculateBearing(lat1, lng1, lat2, lng2);

  // Estimate speed in kmh from segment length and tick rate
  const speedKmh = segLength > 0 ? Math.round((segLength / 3) * 3.6 * speed) : 30;

  return { lat, lng, bearing, speedKmh };
}

// ─── Main Loop ─────────────────────────────────────────────────────────────

async function main() {
  const { routes, speed } = parseArgs();

  // Resolve routes
  let selectedRoutes: RoutePath[];
  if (routes.length === 0 || routes.includes("all")) {
    selectedRoutes = ALL_ROUTE_PATHS;
  } else {
    selectedRoutes = ALL_ROUTE_PATHS.filter((r) =>
      routes.includes(r.id.toLowerCase())
    );
  }

  if (selectedRoutes.length === 0) {
    console.error("❌ No matching routes found. Available route IDs:");
    for (const r of ALL_ROUTE_PATHS) {
      console.error(`   ${r.id.toUpperCase()} — ${r.name}`);
    }
    process.exit(1);
  }

  const vehicles = selectedRoutes.map((r, i) => createVehicle(r, i));

  console.log("=".repeat(60));
  console.log("  دروب GPS Simulator");
  console.log("=".repeat(60));
  console.log(`  Routes:     ${selectedRoutes.map((r) => r.id.toUpperCase()).join(", ")}`);
  console.log(`  Vehicles:   ${vehicles.length}`);
  console.log(`  Speed:      ${speed}x`);
  console.log(`  Endpoint:   POST http://localhost:3000/api/v1/vehicles/location`);
  console.log(`  Interval:   3 seconds`);
  console.log("=".repeat(60));
  console.log("");

  let tick = 0;

  async function tickLoop() {
    tick++;

    for (const vehicle of vehicles) {
      const pos = interpolatePosition(vehicle, speed);

      const payload = {
        vehicleId: vehicle.id,
        lat: Math.round(pos.lat * 1e6) / 1e6,
        lng: Math.round(pos.lng * 1e6) / 1e6,
        speed: pos.speedKmh,
        bearing: Math.round(pos.bearing),
        routeCode: vehicle.routeCode,
        timestamp: Date.now(),
      };

      try {
        const response = await fetch("http://localhost:3000/api/v1/vehicles/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log(
            `  [${tick}] ${vehicle.routeId.toUpperCase().padEnd(14)} ` +
            `(${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)}) ` +
            `→ ${pos.speedKmh} km/h  ${pos.bearing.toFixed(0)}°`
          );
        } else {
          console.warn(
            `  ⚠ [${tick}] ${vehicle.routeId.toUpperCase().padEnd(14)} ` +
            `HTTP ${response.status} ${response.statusText}`
          );
        }
      } catch (err: any) {
        console.error(
          `  ✗ [${tick}] ${vehicle.routeId.toUpperCase().padEnd(14)} ` +
          `Connection error: ${err.message}`
        );
      }
    }
  }

  // Initial tick immediately, then every 3 seconds
  await tickLoop();
  setInterval(tickLoop, 3000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
