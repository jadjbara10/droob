/**
 * Test helper — builds a Fastify instance for integration tests.
 * Uses the test database (never hits production).
 */
import { vi } from "vitest";

// ─── Mock external modules BEFORE route imports ───
// vi.mock is hoisted above all imports, so route modules receive the test DB
vi.mock("../../src/db/index.js", () => ({
  get db() {
    return (globalThis as any).__testDb;
  },
}));

vi.mock("../../src/redis/index.js", () => ({
  cacheGet: async () => null,
  cacheSet: async () => {},
  cacheDel: async () => {},
}));

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import { stopsRoutes } from "../../src/routes/stops.js";
import { routesRoutes } from "../../src/routes/routes.js";
import { tripPlannerRoutes } from "../../src/routes/trip-planner.js";
import { departuresRoutes } from "../../src/routes/departures.js";
import { alertsRoutes } from "../../src/routes/alerts.js";
import { vehiclesRoutes } from "../../src/routes/vehicles.js";
import { reportsRoutes } from "../../src/routes/reports.js";
import { authRoutes } from "../../src/routes/auth.js";
import { adminRoutes } from "../../src/routes/admin.js";
import jwt from "jsonwebtoken";
import { getTestDb, getTestPool } from "../setup.js";

const JWT_SECRET = "droob-jordan-test-secret";

/**
 * Build a lightweight Fastify test app with all routes registered.
 * Uses the test DB (injected via decorator override).
 */
export async function buildTestApp() {
  const app = Fastify({
    logger: false, // Disable logging for tests
  });

  // Minimal plugins for tests
  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // ──── Auth Hook ────
  app.decorate("authenticate", async function (request: any, reply: any) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET) as { sub: string; role: string };
      request.userId = payload.sub;
      request.userRole = payload.role;
    } catch {
      return reply.status(401).send({ error: "TokenExpired" });
    }
  });

  // Decorate with test DB
  app.decorate("testDb", getTestDb());
  app.decorate("testPool", getTestPool());

  // ──── Register Routes ────
  await app.register(async (api) => {
    api.get("/health", async () => ({
      status: "ok",
      service: "دروب Droob Test API",
    }));

    await api.register(async (v1) => {
      v1.register(stopsRoutes, { prefix: "/stops" });
      v1.register(routesRoutes, { prefix: "/routes" });
      v1.register(tripPlannerRoutes, { prefix: "/planner" });
      v1.register(departuresRoutes, { prefix: "/departures" });
      v1.register(alertsRoutes, { prefix: "/alerts" });
      v1.register(reportsRoutes, { prefix: "/reports" });

      v1.register(async (authScope) => {
        authScope.addHook("preHandler", app.authenticate);
        authScope.register(vehiclesRoutes, { prefix: "/vehicles" });
      });

      v1.register(authRoutes, { prefix: "/auth" });
      v1.register(adminRoutes, { prefix: "/admin" });
    }, { prefix: "/api/v1" });
  });

  await app.ready();
  return app;
}

/**
 * Generate a valid JWT token for test users.
 */
export function generateTestToken(userId: string, role = "passenger"): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: "15m" });
}

/**
 * Generate auth headers for a test request.
 */
export function authHeaders(userId: string, role?: string) {
  return {
    Authorization: `Bearer ${generateTestToken(userId, role)}`,
  };
}

/**
 * Common test fixtures already seeded by setup.
 */
export const TEST_IDS = {
  agency: "00000000-0000-0000-0000-000000000001",
  stop1: "00000000-0000-0000-0000-000000000010",
  stop2: "00000000-0000-0000-0000-000000000011",
  route1: "00000000-0000-0000-0000-000000000100",
  user1: "00000000-0000-0000-0000-000000001000",
};