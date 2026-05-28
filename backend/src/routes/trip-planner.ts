import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { routes, routeStops, stops } from "../../drizzle/schema.js";
import { eq, asc, and, sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../redis/index.js";

// Trip planning request schema
const tripPlanSchema = z.object({
  fromLat: z.number().min(-90).max(90),
  fromLng: z.number().min(-180).max(180),
  toLat: z.number().min(-90).max(90),
  toLng: z.number().min(-180).max(180),
  departureTime: z.string().optional(), // ISO string, default now
  modes: z.array(z.enum(["city_bus", "brt", "serveece", "intercity", "walking"]))
    .optional()
    .default(["city_bus", "brt", "serveece", "intercity", "walking"]),
  maxWalkingMeters: z.number().default(1000),
  maxTransfers: z.number().int().min(0).max(5).default(3),
  preference: z.enum(["fastest", "fewest_transfers", "least_walking", "accessible"]).default("fastest"),
});

interface TripStop {
  stopId: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  code: string;
  seq: number;
}

interface RoutePath {
  routeId: string;
  code: string;
  name_ar: string;
  name_en: string;
  mode: string;
  color: string;
  baseFare: number;
  fareMin: number | null;
  fareMax: number | null;
  headwayPeak: number | null;
  headwayOffpeak: number | null;
  stops: TripStop[];
}

interface JourneyLeg {
  type: "walk" | "transit";
  mode?: string;
  routeCode?: string;
  routeName_ar?: string;
  routeName_en?: string;
  color?: string;
  from: {
    name_ar: string;
    name_en: string;
    lat: number;
    lng: number;
  };
  to: {
    name_ar: string;
    name_en: string;
    lat: number;
    lng: number;
  };
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  distanceMeters: number;
  fare: number;
  stops?: { name_ar: string; name_en: string; arrivalTime: string }[];
  instruction_ar: string;
  instruction_en: string;
}

interface Journey {
  legs: JourneyLeg[];
  totalDuration: number;
  totalFare: number;
  totalWalking: number;
  totalTransfers: number;
  departureTime: string;
  arrivalTime: string;
}

export async function tripPlannerRoutes(app: FastifyInstance) {
  // POST /api/v1/planner — Main trip planning endpoint
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = tripPlanSchema.parse(request.body);

      const cacheKey = `planner:${JSON.stringify(params)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return reply.send(cached);

      // Step 1: Find nearby origin and destination stops
      const nearOrigin = await db.query.stops.findMany({
        where: sql`ST_DWithin(
          ST_SetSRID(ST_MakePoint(${params.fromLng}, ${params.fromLat}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${stops.lng}, ${stops.lat}), 4326)::geography,
          ${params.maxWalkingMeters}
        )`,
        limit: 5,
      });

      const nearDest = await db.query.stops.findMany({
        where: sql`ST_DWithin(
          ST_SetSRID(ST_MakePoint(${params.toLng}, ${params.toLat}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${stops.lng}, ${stops.lat}), 4326)::geography,
          ${params.maxWalkingMeters}
        )`,
        limit: 5,
      });

      const journeys: Journey[] = [];

      // Generate direct routes (origin→destination on same line)
      for (const originStop of nearOrigin) {
        for (const destStop of nearDest) {
          // Find routes that serve both stops
          const matchingRoutes = await findConnectingRoutes(
            originStop.id,
            destStop.id,
            params.modes
          );

          for (const routeData of matchingRoutes) {
            const originSeq = routeData.stops.find(s => s.stopId === originStop.id)!.seq;
            const destSeq = routeData.stops.find(s => s.stopId === destStop.id)!.seq;

            if (originSeq >= destSeq) continue; // Wrong direction

            // Calculate walking distances
            const walkToOrigin = haversineDistance(
              params.fromLat, params.fromLng,
              originStop.lat!, originStop.lng!
            );
            const walkFromDest = haversineDistance(
              destStop.lat!, destStop.lng!,
              params.toLat, params.toLng
            );

            if (walkToOrigin > params.maxWalkingMeters || walkFromDest > params.maxWalkingMeters) continue;

            const durationMinutes = estimateTransitDuration(
              routeData.stops.length,
              originSeq,
              destSeq,
              routeData.mode
            );

            const legs: JourneyLeg[] = [];
            const now = params.departureTime ? new Date(params.departureTime) : new Date();

            // Walk leg to origin
            if (walkToOrigin > 50) {
              const walkEnd = new Date(now.getTime() + (walkToOrigin / 80) * 60000);
              legs.push({
                type: "walk",
                from: {
                  name_ar: "موقعك الحالي",
                  name_en: "Current Location",
                  lat: params.fromLat,
                  lng: params.fromLng,
                },
                to: {
                  name_ar: originStop.name_ar,
                  name_en: originStop.name_en,
                  lat: originStop.lat!,
                  lng: originStop.lng!,
                },
                departureTime: now.toISOString(),
                arrivalTime: walkEnd.toISOString(),
                durationMinutes: Math.round(walkToOrigin / 80),
                distanceMeters: Math.round(walkToOrigin),
                fare: 0,
                instruction_ar: `امشِ ${Math.round(walkToOrigin / 80)} دقائق إلى محطة ${originStop.name_ar}`,
                instruction_en: `Walk ${Math.round(walkToOrigin / 80)} min to ${originStop.name_en}`,
              });
            }

            // Transit leg
            const transitStart = legs.length > 0
              ? new Date(legs[legs.length - 1].arrivalTime)
              : now;
            const transitEnd = new Date(transitStart.getTime() + durationMinutes * 60000);

            const transitLeg: JourneyLeg = {
              type: "transit",
              mode: routeData.mode,
              routeCode: routeData.code,
              routeName_ar: routeData.name_ar,
              routeName_en: routeData.name_en,
              color: routeData.color,
              from: {
                name_ar: originStop.name_ar,
                name_en: originStop.name_en,
                lat: originStop.lat!,
                lng: originStop.lng!,
              },
              to: {
                name_ar: destStop.name_ar,
                name_en: destStop.name_en,
                lat: destStop.lat!,
                lng: destStop.lng!,
              },
              departureTime: transitStart.toISOString(),
              arrivalTime: transitEnd.toISOString(),
              durationMinutes,
              distanceMeters: routeData.stops.length * 500,
              fare: routeData.mode === "serveece"
                ? (routeData.fareMin || 0.20 + (routeData.fareMax || 0.40)) / 2
                : routeData.baseFare,
              stops: routeData.stops
                .filter(s => s.seq >= originSeq && s.seq <= destSeq)
                .map(s => ({
                  name_ar: s.name_ar,
                  name_en: s.name_en,
                  arrivalTime: new Date(transitStart.getTime() + ((s.seq - originSeq) / routeData.stops.length) * durationMinutes * 60000).toISOString(),
                })),
              instruction_ar: buildTransitInstructionAr(routeData, originStop, destStop),
              instruction_en: buildTransitInstructionEn(routeData, originStop, destStop),
            };
            legs.push(transitLeg);

            // Walk leg from destination
            if (walkFromDest > 50) {
              const walkStart = new Date(legs[legs.length - 1].arrivalTime);
              const walkEnd = new Date(walkStart.getTime() + (walkFromDest / 80) * 60000);
              legs.push({
                type: "walk",
                from: {
                  name_ar: destStop.name_ar,
                  name_en: destStop.name_en,
                  lat: destStop.lat!,
                  lng: destStop.lng!,
                },
                to: {
                  name_ar: "وجهتك",
                  name_en: "Destination",
                  lat: params.toLat,
                  lng: params.toLng,
                },
                departureTime: walkStart.toISOString(),
                arrivalTime: walkEnd.toISOString(),
                durationMinutes: Math.round(walkFromDest / 80),
                distanceMeters: Math.round(walkFromDest),
                fare: 0,
                instruction_ar: `امشِ ${Math.round(walkFromDest / 80)} دقائق إلى وجهتك`,
                instruction_en: `Walk ${Math.round(walkFromDest / 80)} min to your destination`,
              });
            }

            const totalWalking = Math.round(walkToOrigin + walkFromDest);
            journeys.push({
              legs,
              totalDuration: legs.reduce((sum, l) => sum + l.durationMinutes, 0),
              totalFare: legs.reduce((sum, l) => sum + l.fare, 0),
              totalWalking,
              totalTransfers: 0,
              departureTime: legs[0].departureTime,
              arrivalTime: legs[legs.length - 1].arrivalTime,
            });
          }
        }
      }

      // Sort by preference
      if (params.preference === "fewest_transfers") {
        journeys.sort((a, b) => a.totalTransfers - b.totalTransfers || a.totalDuration - b.totalDuration);
      } else if (params.preference === "least_walking") {
        journeys.sort((a, b) => a.totalWalking - b.totalWalking || a.totalDuration - b.totalDuration);
      } else {
        journeys.sort((a, b) => a.totalDuration - b.totalDuration);
      }

      const result = {
        from: { lat: params.fromLat, lng: params.fromLng },
        to: { lat: params.toLat, lng: params.toLng },
        journeys: journeys.slice(0, 5),
        generatedAt: new Date().toISOString(),
      };

      await cacheSet(cacheKey, result, 120); // 2 min cache
      return reply.send(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      throw err;
    }
  });
}

// ────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────

async function findConnectingRoutes(originStopId: string, destStopId: string, modes: string[]): Promise<RoutePath[]> {
  const connectionRows = await db
    .select({
      route: routes,
      seq: routeStops.seq,
      stop: stops,
    })
    .from(routeStops)
    .innerJoin(routes, eq(routeStops.route_id, routes.id))
    .innerJoin(stops, eq(routeStops.stop_id, stops.id))
    .where(
      and(
        sql`${routeStops.route_id} IN (
          SELECT rs2.route_id FROM route_stops rs2
          WHERE rs2.stop_id = ${originStopId}
        )`,
        sql`${routeStops.route_id} IN (
                SELECT rs3.route_id FROM route_stops rs3
                WHERE rs3.stop_id = ${destStopId}
              )`
      )
    )
    .orderBy(asc(routes.id), asc(routeStops.seq));

  // Group by route
  const routeMap = new Map<string, RoutePath>();
  for (const row of connectionRows) {
    if (!modes.includes(row.route.mode)) continue;
    if (!row.route.is_active) continue;

    if (!routeMap.has(row.route.id)) {
      routeMap.set(row.route.id, {
        routeId: row.route.id,
        code: row.route.code,
        name_ar: row.route.name_ar,
        name_en: row.route.name_en,
        mode: row.route.mode,
        color: row.route.color,
        baseFare: Number(row.route.base_fare),
        fareMin: row.route.fare_min != null ? Number(row.route.fare_min) : null,
        fareMax: row.route.fare_max != null ? Number(row.route.fare_max) : null,
        headwayPeak: row.route.headway_peak,
        headwayOffpeak: row.route.headway_offpeak,
        stops: [],
      });
    }

    routeMap.get(row.route.id)!.stops.push({
      stopId: row.stop.id,
      name_ar: row.stop.name_ar,
      name_en: row.stop.name_en,
      lat: row.stop.lat,
      lng: row.stop.lng,
      code: row.stop.code,
      seq: row.seq,
    });
  }

  return Array.from(routeMap.values());
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateTransitDuration(
  _totalStops: number,
  originSeq: number,
  destSeq: number,
  mode: string
): number {
  const stopCount = destSeq - originSeq;
  // Average 2 min between stops for city bus, 1.5 for BRT
  const avgMinBetween = mode === "brt" ? 1.5 : 2;
  return Math.max(5, Math.round(stopCount * avgMinBetween));
}

function buildTransitInstructionAr(
  routeData: RoutePath,
  originStop: any,
  destStop: any
): string {
  const modeLabel =
    routeData.mode === "brt" ? "الباص السريع" :
    routeData.mode === "serveece" ? "السرفيس" :
    routeData.mode === "intercity" ? "باص بين المدن" : "الباص";
  return `اركب ${modeLabel} خط ${routeData.code} من ${originStop.name_ar} إلى ${destStop.name_ar}`;
}

function buildTransitInstructionEn(
  routeData: RoutePath,
  originStop: any,
  destStop: any
): string {
  const modeLabel =
    routeData.mode === "brt" ? "BRT" :
    routeData.mode === "serveece" ? "Serveece" :
    routeData.mode === "intercity" ? "Intercity Bus" : "Bus";
  return `Take ${modeLabel} ${routeData.code} from ${originStop.name_en} to ${destStop.name_en}`;
}