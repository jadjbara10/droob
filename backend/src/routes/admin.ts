import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { stops } from "../../drizzle/schema.js";
import { sql, isNull } from "drizzle-orm";

export async function adminRoutes(app: FastifyInstance) {
  /**
   * POST /api/v1/admin/fix-geometries
   * Updates all stops with NULL geom by computing
   * ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
   * from their existing lat/lng columns.
   */
  app.post("/fix-geometries", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Count stops with NULL geom
      const [beforeRow] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int as count FROM stops WHERE geom IS NULL`
      );
      const nullCount = parseInt(beforeRow?.count || "0", 10);

      if (nullCount === 0) {
        return reply.send({
          success: true,
          message: "جميع المحطات لديها بيانات جغرافية صحيحة مسبقاً",
          fixed: 0,
          total: 0,
        });
      }

      // Update all NULL geom stops: compute geography from lat/lng
      const result = await db.execute(
        sql`UPDATE stops 
            SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography::text,
                geo_lat = lat,
                geo_lng = lng,
                updated_at = NOW()
            WHERE geom IS NULL`
      );

      // Also update any stops where geo_lat/geo_lng are NULL
      await db.execute(
        sql`UPDATE stops 
            SET geo_lat = lat, geo_lng = lng, updated_at = NOW()
            WHERE geo_lat IS NULL OR geo_lng IS NULL`
      );

      // Verify
      const [afterRow] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int as count FROM stops WHERE geom IS NULL`
      );
      const remaining = parseInt(afterRow?.count || "0", 10);

      // Get total count
      const [totalRow] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int as count FROM stops`
      );
      const total = parseInt(totalRow?.count || "0", 10);

      return reply.send({
        success: remaining === 0,
        message: remaining === 0
          ? `تم تحديث ${nullCount} محطة بنجاح`
          : `تم تحديث ${nullCount - remaining} من ${nullCount} محطة (${remaining} متبقية)`,
        fixed: nullCount - remaining,
        remaining,
        total,
      });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: "FixGeometriesError",
        message: err.message || "فشل تحديث البيانات الجغرافية",
      });
    }
  });

  /**
   * GET /api/v1/admin/geometry-stats
   * Reports how many stops have valid geometries.
   */
  app.get("/geometry-stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [nullGeom] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int as count FROM stops WHERE geom IS NULL`
      );
      const [nullGeoLat] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int as count FROM stops WHERE geo_lat IS NULL`
      );
      const [total] = await db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int as count FROM stops`
      );

      return reply.send({
        total: parseInt(total?.count || "0", 10),
        nullGeom: parseInt(nullGeom?.count || "0", 10),
        nullGeoLat: parseInt(nullGeoLat?.count || "0", 10),
        haveValidGeom: parseInt(total?.count || "0", 10) - parseInt(nullGeom?.count || "0", 10),
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "GeometryStatsError",
        message: err.message,
      });
    }
  });
}