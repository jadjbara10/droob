/**
 * دروب (Droob) — Ad Events Tracking
 * POST /api/v1/ads/event — track ad impressions, clicks, rewards
 * GET  /api/v1/ads/stats — ad revenue dashboard data
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { adEvents, userSubscriptions } from "../../drizzle/schema.js";
import { eq, sql, and, gte } from "drizzle-orm";

const adEventSchema = z.object({
  ad_type: z.enum(["banner", "interstitial", "rewarded"]),
  ad_network: z.string().default("admob"),
  event_type: z.enum(["impression", "click", "reward_claimed", "error"]),
  placement: z.string(),
  revenue_usd: z.number().min(0).default(0),
  reward_type: z.string().optional(),
  reward_claimed: z.boolean().default(false),
  ecpm: z.number().optional(),
  fill_available: z.boolean().optional(),
});

// statsQuerySchema reserved for future stats endpoint
// const statsQuerySchema = z.object({ days: z.coerce.number().default(7) });

export async function adsRoutes(app: FastifyInstance) {
  // ──── POST /api/v1/ads/event ────
  // Track an ad event (impression, click, reward, error)
  app.post("/event", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = adEventSchema.parse(request.body);
      const userId = (request as any).userId || null; // optional auth

      await db.insert(adEvents).values({
        user_id: userId,
        ad_type: body.ad_type,
        ad_network: body.ad_network,
        event_type: body.event_type,
        placement: body.placement,
        revenue_usd: body.revenue_usd,
        reward_type: body.reward_type || null,
        reward_claimed: body.reward_claimed,
        ecpm: body.ecpm || null,
        fill_available: body.fill_available ?? null,
      });

      return reply.send({ ok: true });
    } catch (err: any) {
      if (err instanceof z.ZodError)
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // ──── GET /api/v1/ads/stats ────
  // Ad revenue dashboard (requires auth)
  app.get("/stats", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query || {}) as { days?: string };
    const days = parseInt(query.days || "7");

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Revenue by ad type
    const revenueByType = await db
      .select({
        ad_type: adEvents.ad_type,
        total_revenue: sql<number>`COALESCE(SUM(${adEvents.revenue_usd}), 0)`.mapWith(Number),
        impressions: sql<number>`COUNT(*) FILTER (WHERE ${adEvents.event_type} = 'impression')`.mapWith(Number),
        clicks: sql<number>`COUNT(*) FILTER (WHERE ${adEvents.event_type} = 'click')`.mapWith(Number),
        rewards: sql<number>`COUNT(*) FILTER (WHERE ${adEvents.event_type} = 'reward_claimed')`.mapWith(Number),
      })
      .from(adEvents)
      .where(gte(adEvents.created_at, cutoff))
      .groupBy(adEvents.ad_type);

    // Revenue by network
    const revenueByNetwork = await db
      .select({
        ad_network: adEvents.ad_network,
        total_revenue: sql<number>`COALESCE(SUM(${adEvents.revenue_usd}), 0)`.mapWith(Number),
        impressions: sql<number>`COUNT(*) FILTER (WHERE ${adEvents.event_type} = 'impression')`.mapWith(Number),
      })
      .from(adEvents)
      .where(gte(adEvents.created_at, cutoff))
      .groupBy(adEvents.ad_network);

    // Daily revenue
    const dailyRevenue = await db
      .select({
        date: sql<string>`DATE(${adEvents.created_at})`.mapWith(String),
        revenue: sql<number>`COALESCE(SUM(${adEvents.revenue_usd}), 0)`.mapWith(Number),
        impressions: sql<number>`COUNT(*) FILTER (WHERE ${adEvents.event_type} = 'impression')`.mapWith(Number),
      })
      .from(adEvents)
      .where(gte(adEvents.created_at, cutoff))
      .groupBy(sql`DATE(${adEvents.created_at})`)
      .orderBy(sql`DATE(${adEvents.created_at})`);

    // Fill rate
    const fillRate = await db
      .select({
        total: sql<number>`COUNT(*)`.mapWith(Number),
        filled: sql<number>`COUNT(*) FILTER (WHERE ${adEvents.fill_available} = true)`.mapWith(Number),
      })
      .from(adEvents)
      .where(and(gte(adEvents.created_at, cutoff), eq(adEvents.event_type, "impression")));

    return reply.send({
      revenueByType,
      revenueByNetwork,
      dailyRevenue,
      fillRate: fillRate[0],
      days,
    });
  });

  // ──── GET /api/v1/ads/check-adfree ────
  // Check if a user has an active ad-free subscription
  app.get("/check-adfree", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const [sub] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.user_id, userId),
          eq(userSubscriptions.type, "ad_free"),
          eq(userSubscriptions.status, "active")
        )
      )
      .limit(1);

    return reply.send({
      isAdFree: !!sub,
      subscription: sub || null,
    });
  });
}
