/**
 * 🚌 دروب Droob — Trip Planner API v2.0
 *
 * Intelligent multi-modal journey planning with:
 *   - 15-minute max walking between transfers
 *   - OSRM road-matched walking paths
 *   - Multi-leg journeys with transfers
 *   - Graph-based pathfinding (modified Dijkstra)
 *   - Transfer penalty (5 min waiting time)
 *
 * POST /api/v1/planner
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { cacheGet, cacheSet } from "../redis/index.js";
import { planTrip } from "../services/trip-planner-engine.js";

const tripPlanSchema = z.object({
  fromLat: z.number().min(-90).max(90),
  fromLng: z.number().min(-180).max(180),
  toLat: z.number().min(-90).max(90),
  toLng: z.number().min(-180).max(180),
  departureTime: z.string().optional(),
  modes: z.string().optional(),               // "city_bus,brt,serveece,intercity"
  maxWalkingMeters: z.number().default(1000),  // max walk to/from stops
  maxTransfers: z.number().int().min(0).max(5).default(2), // max transfers allowed
  preference: z.string().default("fastest"),   // fastest | fewest_transfers | least_walking
});

const MODE_LIST = ["city_bus", "brt", "serveece", "intercity"];

export async function tripPlannerRoutes(app: FastifyInstance) {
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = tripPlanSchema.parse(request.body);
      const preferredModes = params.modes
        ? params.modes.split(",").filter((m) => MODE_LIST.includes(m))
        : MODE_LIST;

      if (preferredModes.length === 0) {
        return reply.status(400).send({
          error: "ValidationError",
          message: "No valid transport modes selected",
        });
      }

      // Cache key
      const cacheKey = [
        "planner:v2",
        params.fromLat.toFixed(3), params.fromLng.toFixed(3),
        params.toLat.toFixed(3), params.toLng.toFixed(3),
        preferredModes.join(","),
        params.maxTransfers,
        params.preference,
      ].join(":");

      const cached = await cacheGet(cacheKey);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return reply.send(parsed);
      }

      // Plan trip using the intelligent engine
      const result = await planTrip({
        fromLat: params.fromLat,
        fromLng: params.fromLng,
        toLat: params.toLat,
        toLng: params.toLng,
        maxWalkingMeters: params.maxWalkingMeters,
        maxTransfers: params.maxTransfers,
        preferredModes,
        preference: params.preference as "fastest" | "fewest_transfers" | "least_walking",
      });

      // Cache result (2 min TTL)
      const response = {
        success: true,
        data: result,
        meta: {
          maxWalkingMinutes: 15,
          transferPenaltyMinutes: 5,
          algorithm: "multi-modal-graph-v2",
        },
      };

      await cacheSet(cacheKey, response, 120);
      return reply.send(response);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      }
      app.log.error(err);
      return reply.status(500).send({
        error: "PlannerError",
        message: "حدث خطأ أثناء تخطيط الرحلة. يرجى المحاولة مرة أخرى.",
        message_en: "Trip planning failed. Please try again.",
      });
    }
  });

  // GET /api/v1/planner/health — engine status
  app.get("/health", async (_request, reply) => {
    return reply.send({
      algorithm: "multi-modal-graph-v2",
      maxWalkingMinutes: 15,
      walkingSpeedKmh: 5,
      transferPenaltyMinutes: 5,
      supportedModes: MODE_LIST,
      features: [
        "multi-leg journeys",
        "transfer routing with walk limits",
        "OSRM foot-path walking",
        "graph-based pathfinding",
        "spatial-hash optimized transfers",
      ],
    });
  });
}
