import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { communityReports } from "../../drizzle/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";

const reportsQuerySchema = z.object({
  type: z.enum(["delay", "crowding", "ended_route", "closed_station"]).optional(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  governorate: z.string().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional().default(5000),
  hoursAgo: z.coerce.number().optional().default(24),
  limit: z.coerce.number().optional().default(50),
});

const reportCreateSchema = z.object({
  type: z.enum(["delay", "crowding", "ended_route", "closed_station"]),
  severity: z.enum(["low", "medium", "high"]),
  lat: z.number(),
  lng: z.number(),
  routeCode: z.string().optional(),
  stopId: z.string().uuid().optional(),
  message_ar: z.string().max(500).optional(),
  message_en: z.string().max(500).optional(),
});

export async function reportsRoutes(app: FastifyInstance) {
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = reportsQuerySchema.parse(request.query);
      const since = new Date(Date.now() - query.hoursAgo * 3600000);
      const conditions = [gte(communityReports.created_at, since)];

      if (query.type) conditions.push(eq(communityReports.type, query.type));
      if (query.severity) conditions.push(eq(communityReports.severity, query.severity));
      if (query.governorate) conditions.push(eq(communityReports.governorate, query.governorate));

      const result = await db.select().from(communityReports)
        .where(and(...conditions))
        .orderBy(desc(communityReports.created_at))
        .limit(Math.min(query.limit, 100));

      return reply.send({
        reports: result,
        total: result.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = reportCreateSchema.parse(request.body);
      const [report] = await db.insert(communityReports).values({
        ...body,
        user_id: (request as any).userId || null,
        expires_at: new Date(Date.now() + 45 * 60000), // 45 min from now
      }).returning();

      // Broadcast
      if (app.io) app.io.to("alerts:amman").emit("community:report", report);
      return reply.status(201).send(report);
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  app.patch("/:id/resolve", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [resolved] = await db.update(communityReports)
      .set({ is_resolved: true, updated_at: new Date() })
      .where(eq(communityReports.id, request.params.id))
      .returning();
    if (!resolved) return reply.status(404).send({ error: "NotFound" });
    return reply.send(resolved);
  });

  // Analytics: report counts per type last 7 days
  app.get("/analytics", async (_request: FastifyRequest, reply: FastifyReply) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const reports = await db.select().from(communityReports).where(gte(communityReports.created_at, sevenDaysAgo));

    const byType: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    for (const r of reports) {
      byType[r.type] = (byType[r.type] || 0) + 1;
      const day = r.created_at.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return reply.send({ byType, byDay, total: reports.length });
  });
}