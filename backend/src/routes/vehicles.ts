import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { vehicles } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { cacheGet, cacheSet } from "../redis/index.js";

const vehiclesQuerySchema = z.object({
  routeCode: z.string().optional(),
  mode: z.enum(["city_bus", "brt", "serveece", "intercity"]).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional().default(5000),
  limit: z.coerce.number().optional().default(50),
});

const vehicleCreateSchema = z.object({
  plate: z.string().min(3).max(20),
  type: z.enum(["city_bus", "brt", "serveece", "intercity"]),
  agencyId: z.string().uuid(),
  assignedRouteId: z.string().uuid().optional(),
  capacity: z.number().int().default(45),
  driverName: z.string().optional(),
});

export async function vehiclesRoutes(app: FastifyInstance) {
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = vehiclesQuerySchema.parse(request.query);

      // Get live positions from Redis using SET of active vehicle IDs (avoids KEYS *)
      let positions: Array<{ vehicleId: string; lat: number; lng: number; routeCode: string; mode: string }> = [];
      const activeIds = await app.redis.smembers("vehicles:active");

      if (query.lat && query.lng) {
        for (const vehicleId of activeIds) {
          const pos = await cacheGet<{ lat: number; lng: number; routeCode: string; mode: string }>(`vehicle:location:${vehicleId}`);
          if (pos) {
            const dist = haversine(query.lat, query.lng, pos.lat, pos.lng);
            if (dist <= query.radius) positions.push({ vehicleId, ...pos });
          }
        }
      } else {
        for (const vehicleId of activeIds) {
          const pos = await cacheGet<{ lat: number; lng: number; routeCode: string; mode: string }>(`vehicle:location:${vehicleId}`);
          if (pos) positions.push({ vehicleId, ...pos } as any);
        }
      }

      if (query.routeCode) positions = positions.filter((p: any) => p.routeCode === query.routeCode);
      if (query.mode) positions = positions.filter((p: any) => p.mode === query.mode);

      return reply.send({ vehicles: positions.slice(0, query.limit), generatedAt: new Date().toISOString() });
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  app.get("/db", async (_request: FastifyRequest, reply: FastifyReply) => {
    const vehiclesList = await db.query.vehicles.findMany({ limit: 200, with: { agency: true, assignedRoute: true } });
    return reply.send(vehiclesList);
  });

  app.get("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, request.params.id)).limit(1);
    if (!vehicle) return reply.status(404).send({ error: "NotFound", message: "المركبة غير موجودة" });

    const livePos = await cacheGet(`vehicle:location:${request.params.id}`);
    return reply.send({ ...vehicle, livePosition: livePos || null });
  });

  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = vehicleCreateSchema.parse(request.body);
      const [newVehicle] = await db.insert(vehicles).values(body).returning();
      return reply.status(201).send(newVehicle);
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  app.patch("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const body = vehicleCreateSchema.partial().parse(request.body);
      const [updated] = await db.update(vehicles).set({ ...body, updated_at: new Date() }).where(eq(vehicles.id, request.params.id)).returning();
      if (!updated) return reply.status(404).send({ error: "NotFound" });
      return reply.send(updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // POST /vehicles/location — Vehicle sends GPS update (or API pushes it)
  app.post("/location", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = z.object({
        vehicleId: z.string().uuid(),
        lat: z.number(),
        lng: z.number(),
        speed: z.number().optional(),
        bearing: z.number().optional(),
        routeCode: z.string().optional(),
        timestamp: z.number(),
      }).parse(request.body);

      const positionData = {
        lat: body.lat,
        lng: body.lng,
        speed: body.speed || 0,
        bearing: body.bearing || 0,
        routeCode: body.routeCode || "",
        mode: "city_bus",
        timestamp: body.timestamp,
      };

      await cacheSet(`vehicle:location:${body.vehicleId}`, positionData, 300);

      // Broadcast via Socket.io
      if (app.io) {
        app.io.to(`vehicle:${body.vehicleId}`).emit("vehicle:position", { vehicleId: body.vehicleId, ...positionData });
        if (body.routeCode) app.io.to(`line:${body.routeCode}:jo`).emit("line:vehicle", { vehicleId: body.vehicleId, ...positionData });
      }

      return reply.send({ ok: true });
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}