import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db/index.js";
import { routes, stops, vehicles, alerts, users, trips } from "../../drizzle/schema.js";
import { count, eq, sql } from "drizzle-orm";

export async function dashboardRoutes(app: FastifyInstance) {
  /**
   * GET /api/v1/dashboard/kpis
   * Summary statistics for the admin dashboard
   */
  app.get("/kpis", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const [_totalRoutes] = await db.select({ count: count() }).from(routes);
      const [_totalStops] = await db.select({ count: count() }).from(stops);
      const [totalVehicles] = await db.select({ count: count() }).from(vehicles);
      const [_activeAlerts] = await db
        .select({ count: count() })
        .from(alerts)
        .where(eq(alerts.is_active, true));
      const [totalUsers] = await db.select({ count: count() }).from(users);

      // Active routes count
      const [_activeRoutes] = await db
        .select({ count: count() })
        .from(routes)
        .where(eq(routes.is_active, true));

      // Today's trips
      const today = new Date().toISOString().split("T")[0]; // "2026-05-26"
      const [todayTrips] = await db
        .select({ count: count() })
        .from(trips)
        .where(sql`${trips.departure_time}::date = ${today}::date`);

      return reply.send({
        active_users: totalUsers?.count || 0,
        trips_today: todayTrips?.count || 0,
        vehicles_active: totalVehicles?.count || 0,
        vehicles_total: totalVehicles?.count || 0,
        avg_delay_minutes: 0,
      });
    } catch (err: any) {
      return reply.status(500).send({
        error: "DashboardError",
        message: err.message || "فشل جلب إحصائيات الداشبورد",
      });
    }
  });

  /**
   * GET /api/v1/dashboard/hourly-trips
   * Trips grouped by hour for charts
   */
  app.get("/hourly-trips", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as { date?: string };
      const targetDate = query.date || new Date().toISOString().split("T")[0];

      const result = await db.execute<{ hour: number; count: number }>(
        sql`SELECT EXTRACT(HOUR FROM departure_time)::int as hour, COUNT(*)::int as count
            FROM trips
            WHERE departure_time::date = ${targetDate}::date
            GROUP BY hour
            ORDER BY hour`
      );

      // Fill missing hours with 0
      const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const found = result.find((r: any) => Number(r.hour) === i);
        return { hour: i, count: found ? Number(found.count) : 0 };
      });

      return reply.send({ date: targetDate, data: hourlyData });
    } catch (err: any) {
      return reply.status(500).send({
        error: "DashboardError",
        message: err.message || "فشل جلب الرحلات بالساعة",
      });
    }
  });

  /**
   * GET /api/v1/dashboard/top-stops
   * Most important stops (by route connections)
   */
  app.get("/top-stops", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await db.execute<{
        stop_id: string;
        stop_name_ar: string;
        stop_name_en: string;
        governorate: string;
        route_count: number;
      }>(
        sql`SELECT 
              s.id as stop_id,
              s.name_ar as stop_name_ar,
              s.name_en as stop_name_en,
              s.governorate,
              COUNT(rs.route_id)::int as route_count
            FROM stops s
            LEFT JOIN route_stops rs ON rs.stop_id = s.id
            GROUP BY s.id, s.name_ar, s.name_en, s.governorate
            ORDER BY route_count DESC
            LIMIT 10`
      );

      return reply.send({ data: result });
    } catch (err: any) {
      return reply.status(500).send({
        error: "DashboardError",
        message: err.message || "فشل جلب أكثر المحطات استخداماً",
      });
    }
  });

  /**
   * GET /api/v1/dashboard/route-stats
   * Route statistics by mode
   */
  app.get("/route-stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await db.execute<{
        mode: string;
        count: number;
        active_count: number;
      }>(
        sql`SELECT 
              mode,
              COUNT(*)::int as count,
              SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int as active_count
            FROM routes
            GROUP BY mode
            ORDER BY count DESC`
      );

      return reply.send({ data: result });
    } catch (err: any) {
      return reply.status(500).send({
        error: "DashboardError",
        message: err.message || "فشل جلب إحصائيات الخطوط",
      });
    }
  });
}