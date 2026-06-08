import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { redis } from "../redis/index.js";
import os from "os";

export async function adminRoutes(app: FastifyInstance) {

  /**
   * GET /api/v1/admin/system-health
   * Returns server health: CPU, memory, disk, uptime
   */
  app.get("/system-health", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cpuPercent = Math.round((os.loadavg()[0] / os.cpus().length) * 100);
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMemGB = parseFloat(((totalMem - freeMem) / 1024 ** 3).toFixed(2));
      const totalMemGB = parseFloat((totalMem / 1024 ** 3).toFixed(2));

      return reply.send({
        cpu_percent: cpuPercent,
        memory_used_gb: usedMemGB,
        memory_total_gb: totalMemGB,
        disk_used_gb: 0, // Requires OS-specific call — placeholder
        disk_total_gb: 0,
        uptime_hours: Math.round(os.uptime() / 3600),
        status: cpuPercent < 80 ? "healthy" : cpuPercent < 95 ? "degraded" : "down",
        platform: os.platform(),
        hostname: os.hostname(),
      });
    } catch (err: any) {
      return reply.status(500).send({ error: "SystemHealthError", message: err.message });
    }
  });

  /**
   * GET /api/v1/admin/db-stats
   * Row counts for main tables + DB size estimate
   */
  app.get("/db-stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const counts = await Promise.all([
        db.execute<{ count: string }>(sql`SELECT COUNT(*)::int as count FROM routes`),
        db.execute<{ count: string }>(sql`SELECT COUNT(*)::int as count FROM stops`),
        db.execute<{ count: string }>(sql`SELECT COUNT(*)::int as count FROM vehicles`),
        db.execute<{ count: string }>(sql`SELECT COUNT(*)::int as count FROM users`),
        db.execute<{ count: string }>(sql`SELECT COUNT(*)::int as count FROM ads`).catch(() => [{ count: "0" }]),
        db.execute<{ size: string }>(sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`),
      ]);

      return reply.send({
        total_routes: parseInt(counts[0][0]?.count || "0"),
        total_stops: parseInt(counts[1][0]?.count || "0"),
        total_vehicles: parseInt(counts[2][0]?.count || "0"),
        total_users: parseInt(counts[3][0]?.count || "0"),
        total_ads: parseInt(counts[4][0]?.count || "0"),
        db_size: counts[5][0]?.size || "0 MB",
      });
    } catch (err: any) {
      return reply.status(500).send({ error: "DbStatsError", message: err.message });
    }
  });

  /**
   * GET /api/v1/admin/user-roles
   * Distribution of users by role
   */
  app.get("/user-roles", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const roles = await db.execute<{ role: string; count: string }>(
        sql`SELECT role, COUNT(*)::int as count FROM users GROUP BY role ORDER BY count DESC`
      );

      const result: Record<string, number> = {
        super_admin: 0, admin: 0, operator: 0, editor: 0, viewer: 0,
      };
      let total = 0;
      for (const row of roles) {
        if (row.role in result) {
          result[row.role] = parseInt(row.count);
          total += parseInt(row.count);
        }
      }

      return reply.send({ ...result, total });
    } catch (err: any) {
      return reply.status(500).send({ error: "UserRolesError", message: err.message });
    }
  });

  /**
   * GET /api/v1/admin/api-usage
   * Returns API request counts from Redis counters (today, this hour, errors)
   */
  app.get("/api-usage", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const todayKey = `api:usage:${new Date().toISOString().split("T")[0]}`;
      const hourKey = `api:usage:${new Date().toISOString().slice(0, 13)}`;

      const [requestsToday, requestsThisHour, errorRate, rateLimitHits] = await Promise.all([
        redis.get(todayKey).then((v) => parseInt(v || "0")),
        redis.get(hourKey).then((v) => parseInt(v || "0")),
        redis.get("api:error_rate").then((v) => parseFloat(v || "0")),
        redis.get("api:rate_limit_hits").then((v) => parseInt(v || "0")),
      ]);

      return reply.send({
        requests_today: requestsToday || 0,
        requests_this_hour: requestsThisHour || 0,
        avg_response_ms: 85, // placeholder — needs APM integration
        error_rate_pct: errorRate || 0,
        rate_limit_hits: rateLimitHits || 0,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: "ApiUsageError", message: err.message });
    }
  });
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
      await db.execute(
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