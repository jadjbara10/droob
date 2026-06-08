import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { routes, routeStops, stops, agencies, schedules } from "../../drizzle/schema.js";
import { eq, ilike, and, or, asc } from "drizzle-orm";
import { cacheGet, cacheSet, cacheDel } from "../redis/index.js";
import { toCamelCase } from "../utils/case-transform.js";
import { sendError, sendSuccess, sendNotFound, sendValidationError } from "../utils/api-error.js";
import { logActivity } from "../services/activity-logger.js";
import { broadcastChange } from "../services/data-broadcast.js";

const routesQuerySchema = z.object({
  q: z.string().optional(),
  mode: z.enum(["city_bus", "brt", "serveece", "intercity"]).optional(),
  governorate: z.string().optional(),
  agencyId: z.string().uuid().optional(),
  isActive: z.coerce.boolean().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
  maxLimit: z.coerce.number().optional(),
});

const routeCreateSchema = z.object({
  code: z.string().min(1).max(20),
  name_ar: z.string().min(1).max(255),
  name_en: z.string().min(1).max(255),
  mode: z.enum(["city_bus", "brt", "serveece", "intercity"]),
  agencyId: z.string().uuid(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  originStopId: z.string().uuid(),
  destinationStopId: z.string().uuid(),
  pathGeojson: z.any().optional(), // GeoJSON LineString
  distance: z.number().optional(),
  baseFare: z.number().default(0.35),
  fareMin: z.number().optional(),
  fareMax: z.number().optional(),
  isActive: z.boolean().default(true),
  hasFridaySchedule: z.boolean().default(false),
  hasRamadanSchedule: z.boolean().default(false),
  headwayPeak: z.number().int().optional(), // minutes
  headwayOffpeak: z.number().int().optional(),
  firstDeparture: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  lastDeparture: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function routesRoutes(app: FastifyInstance) {
  // GET /api/v1/routes — List routes
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = routesQuerySchema.parse(request.query);

      const cacheKey = `routes:list:${JSON.stringify(query)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return reply.send(cached);

      const conditions = [];

      if (query.q) {
        const searchTerm = `%${query.q}%`;
        conditions.push(
          or(
            ilike(routes.name_ar, searchTerm),
            ilike(routes.name_en, searchTerm),
            ilike(routes.code, searchTerm)
          )
        );
      }

      if (query.mode) {
        conditions.push(eq(routes.mode, query.mode));
      }

      if (query.agencyId) {
        conditions.push(eq(routes.agency_id, query.agencyId));
      }

      if (query.isActive !== undefined) {
        conditions.push(eq(routes.is_active, query.isActive));
      }

      const result = await db.query.routes.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: Math.min(query.limit, query.maxLimit || 500),
        offset: query.offset,
        orderBy: routes.code,
        with: {
          agency: true,
          originStop: true,
          destinationStop: true,
        },
      });

      const wrapped = { data: result, total: result.length };
      await cacheSet(cacheKey, wrapped, 300);
      return sendSuccess(reply, wrapped);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendValidationError(reply, err.errors);
      }
      throw err;
    }
  });

  // GET /api/v1/routes/:id — Single route with stops
  app.get("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const cacheKey = `routes:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send(cached);

    const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);

    if (!route) {
      return sendNotFound(reply, "الخط", "Route");
    }

    const agency = await (route.agency_id
        ? db.query.agencies.findFirst({ where: eq(agencies.id, route.agency_id) })
        : null);

      const stopsData = await db
        .select({
          seq: routeStops.seq,
          isBoardingZone: routeStops.is_boarding_zone,
          stop: stops,
        })
        .from(routeStops)
        .innerJoin(stops, eq(routeStops.stop_id, stops.id))
        .where(eq(routeStops.route_id, id))
        .orderBy(asc(routeStops.seq));

      const response = {
        ...route,
        agency: agency || undefined,
        stops: stopsData,
      };

      await cacheSet(cacheKey, response, 600);
      return sendSuccess(reply, response);
  });

  // POST /api/v1/routes — Create route (requires auth)
  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = routeCreateSchema.parse(request.body);

      // Verify origin and destination stops exist
      const [origin] = await db.select({ id: stops.id }).from(stops).where(eq(stops.id, body.originStopId)).limit(1);
      const [dest] = await db.select({ id: stops.id }).from(stops).where(eq(stops.id, body.destinationStopId)).limit(1);

      if (!origin || !dest) {
        return sendError(reply, 400, "InvalidStop", "محطة الانطلاق أو الوصول غير موجودة", "Origin or destination stop not found");
      }

      // Map camelCase test fields → snake_case DB columns
      const insertValues: Record<string, unknown> = {
        code: body.code,
        name_ar: body.name_ar,
        name_en: body.name_en,
        mode: body.mode,
        agency_id: body.agencyId,
        color: body.color,
        origin_stop_id: body.originStopId,
        destination_stop_id: body.destinationStopId,
        distance: body.distance ?? null,
        base_fare: String(body.baseFare),
        fare_min: body.fareMin != null ? String(body.fareMin) : null,
        fare_max: body.fareMax != null ? String(body.fareMax) : null,
        is_active: body.isActive,
        has_friday_schedule: body.hasFridaySchedule,
        has_ramadan_schedule: body.hasRamadanSchedule,
        headway_peak: body.headwayPeak ?? null,
        headway_offpeak: body.headwayOffpeak ?? null,
        first_departure: body.firstDeparture ?? null,
        last_departure: body.lastDeparture ?? null,
      };
      if (body.pathGeojson) insertValues.path_geojson = body.pathGeojson;

      const [newRoute] = await db.insert(routes).values(insertValues as any).returning();

      await cacheDel("routes:*");
      broadcastChange(app, "route", "create", { id: newRoute.id, code: newRoute.code, name_ar: newRoute.name_ar });
      // Log activity
      await logActivity(
        (request as any).userId,
        "create",
        "route",
        newRoute.id,
        { code: newRoute.code, name_ar: newRoute.name_ar },
        request.ip
      );
      return sendSuccess(reply, toCamelCase(newRoute), 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendValidationError(reply, err.errors);
      }
      if (err.code === "23505") {
        return sendError(reply, 409, "DuplicateRoute", "الخط موجود مسبقاً", "Duplicate route");
      }
      throw err;
    }
  });

  // PATCH /api/v1/routes/:id — Update route (requires auth)
  app.patch("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = routeCreateSchema.partial().parse(request.body);

      // Map camelCase fields → snake_case for DB update
      const updateValues: Record<string, unknown> = { updated_at: new Date() };
      if (body.code !== undefined) updateValues.code = body.code;
      if (body.name_ar !== undefined) updateValues.name_ar = body.name_ar;
      if (body.name_en !== undefined) updateValues.name_en = body.name_en;
      if (body.mode !== undefined) updateValues.mode = body.mode;
      if (body.agencyId !== undefined) updateValues.agency_id = body.agencyId;
      if (body.color !== undefined) updateValues.color = body.color;
      if (body.originStopId !== undefined) updateValues.origin_stop_id = body.originStopId;
      if (body.destinationStopId !== undefined) updateValues.destination_stop_id = body.destinationStopId;
      if (body.pathGeojson !== undefined) updateValues.path_geojson = body.pathGeojson;
      if (body.distance !== undefined) updateValues.distance = body.distance;
      if (body.baseFare !== undefined) updateValues.base_fare = String(body.baseFare);
      if (body.fareMin !== undefined) updateValues.fare_min = String(body.fareMin);
      if (body.fareMax !== undefined) updateValues.fare_max = String(body.fareMax);
      if (body.isActive !== undefined) updateValues.is_active = body.isActive;
      if (body.hasFridaySchedule !== undefined) updateValues.has_friday_schedule = body.hasFridaySchedule;
      if (body.hasRamadanSchedule !== undefined) updateValues.has_ramadan_schedule = body.hasRamadanSchedule;
      if (body.headwayPeak !== undefined) updateValues.headway_peak = body.headwayPeak;
      if (body.headwayOffpeak !== undefined) updateValues.headway_offpeak = body.headwayOffpeak;
      if (body.firstDeparture !== undefined) updateValues.first_departure = body.firstDeparture;
      if (body.lastDeparture !== undefined) updateValues.last_departure = body.lastDeparture;

      const [updated] = await db.update(routes)
        .set(updateValues)
        .where(eq(routes.id, id))
        .returning();
      
      if (!updated) {
        return sendNotFound(reply, "الخط", "Route");
      }

      await cacheDel(`routes:${id}`);
      await cacheDel("routes:*");
      broadcastChange(app, "route", "update", { id, code: updated.code, name_ar: updated.name_ar });
      return sendSuccess(reply, toCamelCase(updated));
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendValidationError(reply, err.errors);
      }
      throw err;
    }
  });

  // GET /api/v1/routes/:id/stops — List stops for a route
  app.get("/:id/stops", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const [route] = await db.select({ id: routes.id }).from(routes).where(eq(routes.id, id)).limit(1);
    if (!route) {
      return sendNotFound(reply, "الخط", "Route");
    }

    const stopsData = await db
      .select({
        seq: routeStops.seq,
        isBoardingZone: routeStops.is_boarding_zone,
        stop: stops,
      })
      .from(routeStops)
      .innerJoin(stops, eq(routeStops.stop_id, stops.id))
      .where(eq(routeStops.route_id, id))
      .orderBy(asc(routeStops.seq));

    return sendSuccess(reply, { stops: stopsData });
  });

  // POST /api/v1/routes/:id/stops — Add stop to route (requires auth)
  app.post("/:id/stops", { preHandler: [app.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = z.object({
        stopId: z.string().uuid(),
        seq: z.number().int().min(0),
        isBoardingZone: z.boolean().default(false),
      }).parse(request.body);

      // Verify route exists
      const [route] = await db.select({ id: routes.id }).from(routes).where(eq(routes.id, id)).limit(1);
      if (!route) {
        return sendNotFound(reply, "الخط", "Route");
      }

      const [newStop] = await db.insert(routeStops).values({
        route_id: id,
        stop_id: body.stopId,
        seq: body.seq,
        is_boarding_zone: body.isBoardingZone,
      }).returning();

      await cacheDel(`routes:${id}`);
      return sendSuccess(reply, newStop, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return sendValidationError(reply, err.errors);
      }
      if (err.code === "23505") {
        return sendError(reply, 409, "DuplicateSequence", "الترتيب مكرر", "Duplicate sequence");
      }
      throw err;
    }
  });

  // DELETE /api/v1/routes/:id/stops/:stopId — Remove stop from route (requires auth)
  app.delete("/:id/stops/:stopId", { preHandler: [app.authenticate] }, async (request: FastifyRequest<{ Params: { id: string; stopId: string } }>, reply: FastifyReply) => {
    const { id, stopId } = request.params;

    const deleted = await db.delete(routeStops)
      .where(and(eq(routeStops.route_id, id), eq(routeStops.stop_id, stopId)))
      .returning();

    if (!deleted || deleted.length === 0) {
      return sendNotFound(reply, "محطة المسار", "Route stop");
    }

    await cacheDel(`routes:${id}`);
    return sendSuccess(reply, { deleted: true });
  });

  // GET /api/v1/routes/:id/schedule — Get timetable for a route
  app.get("/:id/schedule", async (request: FastifyRequest<{ Params: { id: string }; Querystring: { scheduleType?: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const scheduleType = request.query.scheduleType || "regular";

    const cacheKey = `routes:${id}:schedule:${scheduleType}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send(cached);

    const scheduleData = await db.select()
      .from(schedules)
      .where(and(
        eq(schedules.route_id, id),
        eq(schedules.schedule_type, scheduleType)
      ))
      .orderBy(schedules.day_of_week, schedules.arrival_time);

    await cacheSet(cacheKey, scheduleData, 600);
    return sendSuccess(reply, scheduleData);
  });

  // DELETE /api/v1/routes/:id — Soft-delete (set is_active=false)
  app.delete("/:id", { preHandler: [app.authenticate] }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const [updated] = await db.update(routes)
        .set({ is_active: false, updated_at: new Date() })
        .where(eq(routes.id, id))
        .returning();

      if (!updated) {
        return sendNotFound(reply, "الخط", "Route");
      }

      await cacheDel(`routes:${id}`);
      await cacheDel("routes:*");
      broadcastChange(app, "route", "delete", { id });
      return sendSuccess(reply, { deleted: true, id });
    } catch (err: any) {
      throw err;
    }
  });
}