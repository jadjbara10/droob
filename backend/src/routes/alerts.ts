import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { alerts } from "../../drizzle/schema.js";
import { eq, and, lte, desc, sql } from "drizzle-orm";
import { cacheGet, cacheSet, cacheDel } from "../redis/index.js";
import { toCamelCase } from "../utils/case-transform.js";
import { sendError, sendSuccess, sendNotFound, sendValidationError } from "../utils/api-error.js";
import { logActivity } from "../services/activity-logger.js";

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
      return sendSuccess(reply, wrapped);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  app.get("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, request.params.id)).limit(1);
    if (!alert) return sendNotFound(reply, "التنبيه", "Alert");
    return sendSuccess(reply, toCamelCase(alert));
  });

  // POST /api/v1/alerts — Create alert (requires auth)
  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
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
      // Log activity
      await logActivity(
        (request as any).userId,
        "create",
        "alert",
        newAlert.id,
        { severity: newAlert.severity, type: newAlert.type, title_ar: newAlert.title_ar },
        request.ip
      );
      return sendSuccess(reply, toCamelCase(newAlert), 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  // PATCH /api/v1/alerts/:id — Update alert (requires auth)
  app.patch("/:id", { preHandler: [app.authenticate] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
      if (!updated) return sendNotFound(reply, "التنبيه", "Alert");
      await cacheDel("alerts:*");
      return sendSuccess(reply, toCamelCase(updated));
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  // POST /alerts/emergency — Requires auth + admin/editor role
  app.post("/emergency", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Role check: only admin, super_admin, editor, or operator can broadcast emergencies
    const allowedRoles = ["super_admin", "admin", "editor", "operator"];
    const userRole = (request as any).userRole;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return sendError(reply, 403, "Forbidden", "صلاحيات غير كافية. مطلوب دور مشرف أو محرر لبث تنبيه طارئ.", "Insufficient permissions to broadcast an emergency alert");
    }
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
      return sendSuccess(reply, toCamelCase(emergency), 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });
}