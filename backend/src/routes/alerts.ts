import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { alerts } from "../../drizzle/schema.js";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { cacheGet, cacheSet, cacheDel } from "../redis/index.js";
import { toCamelCase } from "../utils/case-transform.js";

const alertsQuerySchema = z.object({
  severity: z.enum(["info", "warning", "critical"]).optional(),
  governorate: z.string().optional(),
  routeId: z.string().uuid().optional(),
  active: z.coerce.boolean().optional().default(true),
  limit: z.coerce.number().optional().default(20),
});

const alertCreateSchema = z.object({
  title_ar: z.string().min(1).max(255),
  title_en: z.string().min(1).max(255),
  message_ar: z.string().min(1),
  message_en: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]),
  type: z.enum(["delay", "diversion", "station_closed", "emergency", "maintenance"]),
  affectedRouteIds: z.array(z.string().uuid()).optional(),
  governorate: z.string().optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function alertsRoutes(app: FastifyInstance) {
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = alertsQuerySchema.parse(request.query);
      const cacheKey = `alerts:${JSON.stringify(query)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return reply.send(cached);

      const now = new Date();
      const conditions = [eq(alerts.is_active, query.active)];

      if (query.severity) conditions.push(eq(alerts.severity, query.severity));
      if (query.governorate) conditions.push(eq(alerts.governorate, query.governorate));
      if (query.active) {
        conditions.push(lte(alerts.start_at, now));
        conditions.push(sql`(${alerts.end_at} IS NULL OR ${alerts.end_at} >= ${now})`);
      }

      const result = await db.select().from(alerts)
        .where(and(...conditions))
        .orderBy(desc(alerts.severity), desc(alerts.start_at))
        .limit(Math.min(query.limit, 50));

      const wrapped = { data: result };
      await cacheSet(cacheKey, wrapped, 60);
      return reply.send(wrapped);
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  app.get("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, request.params.id)).limit(1);
    if (!alert) return reply.status(404).send({ error: "NotFound", message: "التنبيه غير موجود" });
    return reply.send(toCamelCase(alert));
  });

  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = alertCreateSchema.parse(request.body);
      const [newAlert] = await db.insert(alerts).values({
        title_ar: body.title_ar,
        title_en: body.title_en,
        message_ar: body.message_ar,
        message_en: body.message_en,
        severity: body.severity,
        type: body.type,
        affected_route_ids: body.affectedRouteIds || null,
        governorate: body.governorate || null,
        start_at: new Date(body.startAt),
        end_at: body.endAt ? new Date(body.endAt) : null,
        is_active: body.isActive,
      }).returning();
      await cacheDel("alerts:*");
      return reply.status(201).send(toCamelCase(newAlert));
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  app.patch("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const body = alertCreateSchema.partial().parse(request.body);
      const updateData: any = { updated_at: new Date() };
      if (body.title_ar) updateData.title_ar = body.title_ar;
      if (body.title_en) updateData.title_en = body.title_en;
      if (body.message_ar) updateData.message_ar = body.message_ar;
      if (body.message_en) updateData.message_en = body.message_en;
      if (body.severity) updateData.severity = body.severity;
      if (body.type) updateData.type = body.type;
      if (body.affectedRouteIds) updateData.affected_route_ids = body.affectedRouteIds;
      if (body.governorate !== undefined) updateData.governorate = body.governorate;
      if (body.startAt) updateData.start_at = new Date(body.startAt);
      if (body.endAt) updateData.end_at = new Date(body.endAt);
      if (body.isActive !== undefined) updateData.is_active = body.isActive;

      const [updated] = await db.update(alerts).set(updateData).where(eq(alerts.id, request.params.id)).returning();
      if (!updated) return reply.status(404).send({ error: "NotFound" });
      await cacheDel("alerts:*");
      return reply.send(toCamelCase(updated));
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // POST /alerts/emergency — Big red button: broadcast to all users immediately
  app.post("/emergency", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = z.object({
        message_ar: z.string().min(1),
        message_en: z.string().min(1),
        governorate: z.string().optional(),
      }).parse(request.body);

      const [emergency] = await db.insert(alerts).values({
        title_ar: "طوارئ",
        title_en: "Emergency",
        message_ar: body.message_ar,
        message_en: body.message_en,
        severity: "critical",
        type: "emergency",
        governorate: body.governorate || "عمان",
        start_at: new Date(),
        is_active: true,
      }).returning();

      // Broadcast via Socket.io
      const io = app.io;
      if (io) {
        const room = body.governorate ? `alerts:${body.governorate}` : "alerts:national";
        io.to(room).emit("alert:emergency", emergency);
      }

      await cacheDel("alerts:*");
      return reply.status(201).send(toCamelCase(emergency));
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });
}