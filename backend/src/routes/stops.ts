import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { stops } from "../../drizzle/schema.js";
import { eq, ilike, sql, and, or } from "drizzle-orm";
import { cacheGet, cacheSet, cacheDel } from "../redis/index.js";

// ──── Haversine Distance (meters) ────
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

const stopsQuerySchema = z.object({
  q: z.string().optional(),
  governorate: z.string().optional(),
  mode: z.enum(["city_bus", "brt", "serveece", "intercity"]).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional().default(2000),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
  isTerminal: z.coerce.boolean().optional(),
});

const stopCreateSchema = z.object({
  code: z.string().min(1).max(20),
  name_ar: z.string().min(1).max(255),
  name_en: z.string().min(1).max(255),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  governorate: z.string().min(1),
  city: z.string().optional(),
  isTerminal: z.boolean().default(false),
  hasShelter: z.boolean().default(false),
  hasLighting: z.boolean().default(false),
  hasAccessibility: z.boolean().default(false),
  hasTicketMachine: z.boolean().default(false),
  hasAc: z.boolean().default(false),
  photoUrl: z.string().optional(),
  parentStationId: z.string().uuid().optional(),
});

export async function stopsRoutes(app: FastifyInstance) {

  // ─────────────────────────────────────────────────────
  // FIX 1: /search و /nearby يجب أن يكونا قبل /:id
  // Fastify يطابق الـ routes بالترتيب — "search" كان
  // يُعامَل كـ UUID بسبب تسجيله بعد /:id
  // ─────────────────────────────────────────────────────

  // GET /api/v1/stops/search
  app.get("/search", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = stopsQuerySchema.parse(request.query);
      const conditions = [];

      if (query.q) {
        const searchTerm = `%${query.q}%`;
        conditions.push(
          or(
            ilike(stops.name_ar, searchTerm),
            ilike(stops.name_en, searchTerm),
            ilike(stops.code, searchTerm)
          )
        );
      }

      if (query.governorate) {
        conditions.push(eq(stops.governorate, query.governorate));
      }

      // FIX 2: كان يفلتر بـ governorate بدل mode — خطأ واضح
      // if (query.mode) {
      //   conditions.push(eq(stops.governorate, query.mode)); // ← WRONG
      // }
      // الصح: لا يوجد عمود mode في stops مباشرة،
      // الفلترة بالـ mode تتم عبر route_stops join
      // نتركها بدون فلتر mode في هذا الـ endpoint

      const result = await db.query.stops.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: Math.min(query.limit, 200),
        offset: query.offset,
        orderBy: stops.name_ar,
      });

      return reply.send(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      throw err;
    }
  });

  // GET /api/v1/stops/nearby/:lat/:lng
  // Uses Haversine formula (no PostGIS dependency)
  app.get("/nearby/:lat/:lng", async (
    request: FastifyRequest<{ Params: { lat: string; lng: string } }>,
    reply: FastifyReply
  ) => {
    const lat = parseFloat(request.params.lat);
    const lng = parseFloat(request.params.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return reply.status(400).send({ error: "InvalidCoordinates", message: "إحداثيات غير صحيحة" });
    }

    // Fetch all stops and calculate Haversine distance
    const allStops = await db.select().from(stops).limit(500);
    const nearby = allStops
      .map((s) => ({
        ...s,
        distance_m: haversineDistance(lat, lng, s.lat, s.lng),
      }))
      .filter((s) => s.distance_m <= 2000)
      .sort((a, b) => a.distance_m - b.distance_m)
      .slice(0, 30);

    return reply.send(nearby);
  });

  // GET /api/v1/stops — List with optional proximity filter
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = stopsQuerySchema.parse(request.query);

      const cacheKey = `stops:list:${JSON.stringify(query)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return reply.send(cached);

      // Use Haversine for proximity queries (no PostGIS on Railway)
      if (query.lat !== undefined && query.lng !== undefined) {
        let allStops = await db.select().from(stops).limit(500);

        // Filter by governorate if specified
        if (query.governorate) {
          allStops = allStops.filter((s) => s.governorate === query.governorate);
        }

        // Filter by search term
        if (query.q) {
          const q = query.q.toLowerCase();
          allStops = allStops.filter(
            (s) =>
              s.name_ar?.toLowerCase().includes(q) ||
              s.name_en?.toLowerCase().includes(q) ||
              s.code?.toLowerCase().includes(q)
          );
        }

        // Calculate distance and filter
        const withDistance = allStops
          .map((s) => ({
            ...s,
            distance_m: haversineDistance(query.lat!, query.lng!, s.lat, s.lng),
          }))
          .filter((s) => s.distance_m <= query.radius!)
          .sort((a, b) => a.distance_m - b.distance_m);

        const paginated = withDistance.slice(query.offset, query.offset + Math.min(query.limit, 200));
        const rows = paginated;
        await cacheSet(cacheKey, rows, 300);
        return reply.send(rows);
      }

      // بدون geo filter — استخدم Drizzle ORM عادي
      const conditions = [];

      if (query.q) {
        const searchTerm = `%${query.q}%`;
        conditions.push(
          or(
            ilike(stops.name_ar, searchTerm),
            ilike(stops.name_en, searchTerm),
            ilike(stops.code, searchTerm)
          )
        );
      }

      if (query.governorate) {
        conditions.push(eq(stops.governorate, query.governorate));
      }

      if (query.isTerminal !== undefined) {
        conditions.push(eq(stops.is_terminal, query.isTerminal));
      }

      const result = await db.query.stops.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: Math.min(query.limit, 200),
        offset: query.offset,
        orderBy: stops.name_ar,
      });

      await cacheSet(cacheKey, result, 300);
      return reply.send(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      throw err;
    }
  });

  // GET /api/v1/stops/:id  ← الآن بعد /search و /nearby
  app.get("/:id", async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;

    const cacheKey = `stops:${id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send(cached);

    const [stop] = await db.select().from(stops).where(eq(stops.id, id)).limit(1);

    if (!stop) {
      return reply.status(404).send({ error: "NotFound", message: "المحطة غير موجودة" });
    }

    await cacheSet(cacheKey, stop, 600);
    return reply.send(stop);
  });

  // POST /api/v1/stops — requires authentication
  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = stopCreateSchema.parse(request.body);

      const [newStop] = await db.insert(stops).values({
        ...body,
      }).returning();

      await cacheDel("stops:*");
      return reply.status(201).send(newStop);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      if (err.code === "23505") {
        return reply.status(409).send({ error: "DuplicateStop", message: "رمز المحطة موجود مسبقاً" });
      }
      throw err;
    }
  });

  // PATCH /api/v1/stops/:id — requires authentication
  app.patch("/:id", { preHandler: [app.authenticate] }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const body = stopCreateSchema.partial().parse(request.body);

      const [updated] = await db.update(stops)
        .set({ ...body, updated_at: new Date() })
        .where(eq(stops.id, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: "NotFound", message: "المحطة غير موجودة" });
      }

      await cacheDel(`stops:${id}`);
      await cacheDel("stops:*");
      return reply.send(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      throw err;
    }
  });
}

