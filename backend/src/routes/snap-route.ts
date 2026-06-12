/**
 * دروب Droob — OSRM Road Snapping
 * POST /api/v1/admin/snap-route
 * Takes waypoints and returns the OSRM-matched road-following path
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { sendError, sendSuccess, sendValidationError } from "../utils/api-error.js";

const OSRM_BASE = process.env.OSRM_BASE_URL || "http://localhost:5000";

const snapSchema = z.object({
  points: z.array(z.tuple([z.number(), z.number()])).min(2).max(100), // [[lat, lng], ...]
});

export async function snapRouteRoutes(app: FastifyInstance) {

  app.post("/snap-route", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = snapSchema.parse(request.body);

      // OSRM expects coordinates as lng,lat format and separated by ;
      const coords = body.points
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(";");

      const url = `${OSRM_BASE}/route/v1/driving/${coords}?geometries=geojson&overview=full&steps=false&alternatives=false`;

      const response = await fetch(url);
      if (!response.ok) {
        return sendError(reply, 502, "OsrmError", "فشل الاتصال بخدمة تخطيط المسارات", "OSRM routing service error");
      }

      const data = await response.json() as { routes: Array<{ geometry: { coordinates: [number, number][] }; distance: number; duration: number }> };

      if (!data.routes || data.routes.length === 0) {
        return sendError(reply, 404, "NoRoute", "تعذر إيجاد مسار بين النقاط المحددة", "No route found between the given points");
      }

      const route = data.routes[0];

      // Convert OSRM coords [lng,lat] → [lat,lng] for frontend
      const snappedPoints: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );

      return sendSuccess(reply, {
        points: snappedPoints,
        distance_km: parseFloat((route.distance / 1000).toFixed(3)),
        duration_min: Math.round(route.duration / 60),
        original_count: body.points.length,
        snapped_count: snappedPoints.length,
        geojson: {
          type: "LineString",
          coordinates: route.geometry.coordinates, // [lng,lat] format for GeoJSON
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });
}
