import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { stops, routes, routeStops, trips } from "../../drizzle/schema.js";
import { eq, and, gte, lte, asc, sql } from "drizzle-orm";
import { cacheGet, cacheSet } from "../redis/index.js";

const departuresQuerySchema = z.object({
  stopId: z.string().uuid(),
  date: z.string().optional(), // YYYY-MM-DD, defaults to today
  time: z.string().optional(), // HH:MM, defaults to now
  modes: z.array(z.enum(["city_bus", "brt", "serveece", "intercity"])).optional(),
  limit: z.coerce.number().optional().default(20),
});

export async function departuresRoutes(app: FastifyInstance) {
  // GET /api/v1/departures?stopId=... — Live departures board for a stop
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = departuresQuerySchema.parse(request.query);

      const cacheKey = `departures:${query.stopId}:${query.date || "today"}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return reply.send(cached);

      // Get stop info
      const [stopData] = await db.select().from(stops).where(eq(stops.id, query.stopId)).limit(1);
      if (!stopData) {
        return reply.status(404).send({ error: "NotFound", message: "المحطة غير موجودة" });
      }

      // Find all routes that serve this stop
      const servingRoutes = await db
        .select({
          routeId: routes.id,
          code: routes.code,
          name_ar: routes.name_ar,
          name_en: routes.name_en,
          mode: routes.mode,
          color: routes.color,
          baseFare: routes.base_fare,
          fareMin: routes.fare_min,
          fareMax: routes.fare_max,
          headwayPeak: routes.headway_peak,
          headwayOffpeak: routes.headway_offpeak,
          firstDeparture: routes.first_departure,
          lastDeparture: routes.last_departure,
          seq: routeStops.seq,
        })
        .from(routeStops)
        .innerJoin(routes, eq(routeStops.route_id, routes.id))
        .where(and(
          eq(routeStops.stop_id, query.stopId),
          eq(routes.is_active, true),
          query.modes && query.modes.length > 0 ? sql`${routes.mode} IN ${query.modes}` : undefined!
        ))
        .orderBy(asc(routes.code));

      // Build departure board
      const now = query.time ? new Date(`${query.date || new Date().toISOString().slice(0, 10)}T${query.time}:00`) : new Date();
      const departures = [];

      for (const routeData of servingRoutes) {
        // Determine next departure based on schedule or headway
        const nextDeparture = estimateNextDeparture(routeData, now);
        if (!nextDeparture) continue;

        // Count real occupants from active trips (if available)
        const occupancyLevel = await estimateOccupancy(routeData.routeId, nextDeparture);

        departures.push({
          routeId: routeData.routeId,
          code: routeData.code,
          name_ar: routeData.name_ar,
          name_en: routeData.name_en,
          mode: routeData.mode,
          color: routeData.color,
          fare: routeData.mode === "serveece"
            ? { min: routeData.fareMin || 0.20, max: routeData.fareMax || 0.40 }
            : routeData.baseFare,
          departureTime: nextDeparture.toISOString(),
          waitMinutes: Math.max(0, Math.round((nextDeparture.getTime() - now.getTime()) / 60000)),
          occupancy: occupancyLevel,
          status: getStatus(now, nextDeparture),
        });
      }

      // Sort by departure time
      departures.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());

      const result = {
        stop: {
          id: stopData.id,
          code: stopData.code,
          name_ar: stopData.name_ar,
          name_en: stopData.name_en,
        },
        departures: departures.slice(0, query.limit),
        generatedAt: now.toISOString(),
      };

      await cacheSet(cacheKey, result, 30); // 30 sec cache (needs to be fresh)
      return reply.send(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      throw err;
    }
  });

  // GET /api/v1/departures/route/:routeId — Departures for a specific route at all stops
  app.get("/route/:routeId", async (request: FastifyRequest<{ Params: { routeId: string } }>, reply: FastifyReply) => {
    const { routeId } = request.params;

    const cacheKey = `departures:route:${routeId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send(cached);

    const [routeData] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);
    if (!routeData) {
      return reply.status(404).send({ error: "NotFound", message: "الخط غير موجود" });
    }

    // Get all today's departures
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const endOfDay = `${today}T23:59:59`;

    const todaysTrips = await db.select()
      .from(trips)
      .where(and(
        eq(trips.route_id, routeId),
        gte(trips.departure_time, new Date(now)),
        lte(trips.departure_time, new Date(endOfDay))
      ))
      .orderBy(asc(trips.departure_time))
      .limit(50);

    const response = {
      route: {
        id: routeData.id,
        code: routeData.code,
        name_ar: routeData.name_ar,
        name_en: routeData.name_en,
        mode: routeData.mode,
      },
      departures: todaysTrips,
      generatedAt: now.toISOString(),
    };

    await cacheSet(cacheKey, response, 60);
    return reply.send(response);
  });
}

// ───────── Helpers ─────────

function estimateNextDeparture(
  routeData: any,
  now: Date
): Date | null {
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Use headway if available
  const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  const headway = isPeak ? (routeData.headwayPeak || 15) : (routeData.headwayOffpeak || 25);

  // If serveece: departures are frequent / demand-based
  if (routeData.mode === "serveece") {
    // Simulate: next departure within 2-8 min
    const waitMins = 2 + Math.floor(Math.random() * 6);
    return new Date(now.getTime() + waitMins * 60000);
  }

  // For scheduled routes: calculate next based on first departure + headway
  if (routeData.firstDeparture) {
    const [fh, fm] = routeData.firstDeparture.split(":").map(Number);
    const firstMinuteSinceMidnight = fh * 60 + fm;
    const nowMinSinceMidnight = hour * 60 + minute;

    if (nowMinSinceMidnight < firstMinuteSinceMidnight) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), fh, fm);
    }

    const elapsed = nowMinSinceMidnight - firstMinuteSinceMidnight;
    const nextSlot = Math.ceil(elapsed / headway) * headway;
    const nextMin = firstMinuteSinceMidnight + nextSlot;

    // Check against last departure
    if (routeData.lastDeparture) {
      const [lh, lm] = routeData.lastDeparture.split(":").map(Number);
      const lastMinSinceMidnight = lh * 60 + lm;
      if (nextMin > lastMinSinceMidnight) return null;
    }

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      Math.floor(nextMin / 60),
      nextMin % 60
    );
  }

  // Fallback: use headway only
  return new Date(now.getTime() + headway * 60000);
}

async function estimateOccupancy(_routeId: string, _departureTime: Date): Promise<"empty" | "partial" | "full"> {
  // In production, this would check active trip counts or sensor data
  // For now, simulate based on time of day
  const hour = _departureTime.getHours();
  if (hour >= 7 && hour <= 9) return "full";
  if (hour >= 16 && hour <= 19) return "full";
  if (hour >= 10 && hour <= 15) return "partial";
  return "empty";
}

function getStatus(now: Date, departureTime: Date): "on_time" | "delayed" | "cancelled" {
  // In a real system, this compares scheduled vs actual
  // For now, random based on delay heuristics
  const diffMin = (departureTime.getTime() - now.getTime()) / 60000;
  if (diffMin < 0) return "cancelled"; // time passed
  const hour = departureTime.getHours();
  // More delays during peak
  if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
    return Math.random() > 0.7 ? "delayed" : "on_time";
  }
  return Math.random() > 0.9 ? "delayed" : "on_time";
}