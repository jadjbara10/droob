import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { fareRules } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";
import { toCamelCase } from "../utils/case-transform.js";
import { sendError, sendSuccess, sendValidationError } from "../utils/api-error.js";

const faresQuerySchema = z.object({
  routeId: z.string().uuid().optional(),
  fromGovernorate: z.string().optional(),
  toGovernorate: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

const fareCreateSchema = z.object({
  routeId: z.string().uuid().optional(),
  fromGovernorate: z.string().optional(),
  toGovernorate: z.string().optional(),
  distanceMinKm: z.number().optional(),
  distanceMaxKm: z.number().optional(),
  fareAmount: z.number(),
  currency: z.string().default("JOD"),
});

const fareCalculateSchema = z.object({
  fromGov: z.string().min(1),
  toGov: z.string().min(1),
  distanceKm: z.coerce.number().positive(),
});

export async function faresRoutes(app: FastifyInstance) {
  // GET /api/v1/fares — List fare rules
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = faresQuerySchema.parse(request.query);
      const conditions = [];

      if (query.routeId) conditions.push(eq(fareRules.route_id, query.routeId));
      if (query.fromGovernorate) conditions.push(eq(fareRules.from_governorate, query.fromGovernorate));
      if (query.toGovernorate) conditions.push(eq(fareRules.to_governorate, query.toGovernorate));

      const result = await db.query.fareRules.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: Math.min(query.limit, 200),
        offset: query.offset,
        orderBy: fareRules.created_at,
      });

      return sendSuccess(reply, result);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  // POST /api/v1/fares — Create fare rule (auth required)
  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = fareCreateSchema.parse(request.body);

      const [newFare] = await db.insert(fareRules).values({
        route_id: body.routeId || null,
        from_governorate: body.fromGovernorate || null,
        to_governorate: body.toGovernorate || null,
        distance_min_km: body.distanceMinKm ?? null,
        distance_max_km: body.distanceMaxKm ?? null,
        fare_amount: String(body.fareAmount),
        currency: body.currency,
      }).returning();

      return sendSuccess(reply, toCamelCase(newFare), 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  // GET /api/v1/fares/calculate — Calculate fare
  // MUST be registered before /:id to avoid route param collision
  app.get("/calculate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = fareCalculateSchema.parse(request.query);

      // Find matching rules by from/to governorate and distance band
      const matchingRules = await db
        .select()
        .from(fareRules)
        .where(
          and(
            eq(fareRules.from_governorate, query.fromGov),
            eq(fareRules.to_governorate, query.toGov),
          )
        )
        .orderBy(fareRules.distance_min_km)
        .limit(50);

      if (matchingRules.length === 0) {
        // Try reverse direction
        const reverseRules = await db
          .select()
          .from(fareRules)
          .where(
            and(
              eq(fareRules.from_governorate, query.toGov),
              eq(fareRules.to_governorate, query.fromGov),
            )
          )
          .orderBy(fareRules.distance_min_km)
          .limit(50);

        if (reverseRules.length === 0) {
          return sendError(reply, 404, "FareNotFound", "لا توجد تسعيرة للوجهة المحددة", "No fare found for the specified route");
        }

        // Find the closest distance band in reverse rules
        const bestMatch = reverseRules.reduce((prev, curr) => {
          const prevDiff = query.distanceKm - (prev.distance_min_km ?? 0);
          const currDiff = query.distanceKm - (curr.distance_min_km ?? 0);
          return Math.abs(currDiff) < Math.abs(prevDiff) ? curr : prev;
        });

        return sendSuccess(reply, {
          fromGovernorate: bestMatch.from_governorate,
          toGovernorate: bestMatch.to_governorate,
          distanceKm: query.distanceKm,
          fareAmount: bestMatch.fare_amount,
          currency: bestMatch.currency || "JOD",
        });
      }

      // Find the closest distance band
      const bestMatch = matchingRules.reduce((prev, curr) => {
        const prevDiff = query.distanceKm - (prev.distance_min_km ?? 0);
        const currDiff = query.distanceKm - (curr.distance_min_km ?? 0);
        return Math.abs(currDiff) < Math.abs(prevDiff) ? curr : prev;
      });

      return sendSuccess(reply, {
        fromGovernorate: bestMatch.from_governorate,
        toGovernorate: bestMatch.to_governorate,
        distanceKm: query.distanceKm,
        fareAmount: bestMatch.fare_amount,
        currency: bestMatch.currency || "JOD",
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });
}
