import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import fastifyIO from "fastify-socket.io";
import { Server } from "socket.io";
import { redis } from "./redis/index.js";
import jwt from "jsonwebtoken";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./db/index.js";

// Routes
import { stopsRoutes } from "./routes/stops.js";
import { routesRoutes } from "./routes/routes.js";
import { tripPlannerRoutes } from "./routes/trip-planner.js";
import { departuresRoutes } from "./routes/departures.js";
import { alertsRoutes } from "./routes/alerts.js";
import { vehiclesRoutes } from "./routes/vehicles.js";
import { reportsRoutes } from "./routes/reports.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { adsRoutes } from "./routes/ads.js";
import { faresRoutes } from "./routes/fares.js";
import { prayerTimesRoutes } from "./routes/prayer-times.js";
import { activityRoutes } from "./routes/activity.js";
import { usersAdminRoutes } from "./routes/users-admin.js";
import { snapRouteRoutes } from "./routes/snap-route.js";
import { startPrayerTimesCron } from "./cron/prayer-times-cron.js";
import { setupWebSocket } from "./websocket/index.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is required. Set it in your .env file.");
}
const JWT_SECRET_FINAL = JWT_SECRET;
const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
    redis: typeof redis;
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}

async function buildApp() {
  // ──── Auto-migrate on startup ────
  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("✅ Database migrations applied successfully");
  } catch (err: any) {
    console.error("⚠️ Migration warning:", err.message);
    // Continue anyway — migrations might already be applied
  }

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport: process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
    },
    requestTimeout: 30000,
    bodyLimit: 10 * 1024 * 1024, // 10MB for GTFS uploads
  });

  // ──── Plugins ────
  // CORS: @fastify/cors expects origin as string | string[] | RegExp.
  // The env var CORS_ORIGIN can be a comma-separated list for multiple origins.
  // We split on comma and trim so "https://app.droob.jo,https://admin.droob.jo"
  // becomes ["https://app.droob.jo", "https://admin.droob.jo"].
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : process.env.NODE_ENV === "production"
        ? ["https://app.droob.jo", "https://admin.droob.jo"]
        : ["*"],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*.mapbox.com", "https://*.tiles.mapbox.com"],
        connectSrc: ["'self'", "https://api.droob-jo.com", "https://*.mapbox.com", "wss://*.droob.jo"],
      },
    } : false,
    crossOriginResourcePolicy: { policy: process.env.NODE_ENV === "production" ? "cross-origin" : "cross-origin" },
  });

  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
    timeWindow: "1 minute",
    errorResponseBuilder: (_request: any, context: any) => ({
      error: "RateLimitExceeded",
      message: "طلبات كثيرة جداً. حاول مرة أخرى بعد دقيقة.",
      retryAfter: Math.ceil((context.ttl || 60000) / 1000),
    }),
  });

  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // Socket.io
  await app.register(fastifyIO, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ["websocket", "polling"],
  });

  // ──── Attach Redis ────
  app.decorate("redis", redis);

  // ──── JWT Auth Hook ────
  app.decorate("authenticate", async function (request: any, reply: any) {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Unauthorized", message: "الرجاء تسجيل الدخول" });
    }
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET_FINAL) as { sub: string; role: string };
      request.userId = payload.sub;
      request.userRole = payload.role;
    } catch {
      return reply.status(401).send({ error: "TokenExpired", message: "انتهت الجلسة" });
    }
  });

  // ──── Register Routes ────
  await app.register(async (api) => {
    // Health check (no auth)
    api.get("/health", async () => ({
      status: "ok",
      service: "دروب Droob API",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }));

    // API v1 routes
    await api.register(async (v1) => {
      // Public
      v1.register(stopsRoutes, { prefix: "/stops" });
      v1.register(routesRoutes, { prefix: "/routes" });
      v1.register(tripPlannerRoutes, { prefix: "/planner" });

      // Semi-public (optional auth)
      v1.register(departuresRoutes, { prefix: "/departures" });
      v1.register(alertsRoutes, { prefix: "/alerts" });
      v1.register(reportsRoutes, { prefix: "/reports" });
      v1.register(adsRoutes, { prefix: "/ads" });
      v1.register(faresRoutes, { prefix: "/fares" }); // GET routes are public
      v1.register(prayerTimesRoutes, { prefix: "/prayer-times" }); // GET route is public

      // Auth-protected
      v1.register(async (authScope) => {
        authScope.addHook("preHandler", app.authenticate);
        authScope.register(vehiclesRoutes, { prefix: "/vehicles" });
      });

      // Auth routes (stricter rate limit: 5/min per IP for brute force prevention)
      v1.register(async (authScope) => {
        authScope.register(rateLimit, {
          max: 5,
          timeWindow: "1 minute",
          errorResponseBuilder: (_req: any, context: any) => ({
            error: "RateLimitExceeded",
            message: "محاولات كثيرة. الرجاء الانتظار دقيقة.",
            retryAfter: Math.ceil((context.ttl || 60000) / 1000),
          }),
        });
        authScope.register(authRoutes, { prefix: "/auth" });
      });

      // Admin + Dashboard routes (auth-protected + role check)
      v1.register(async (adminScope) => {
        adminScope.addHook("preHandler", app.authenticate);
        // Role-based access: only admin, editor, operator, super_admin can access
        adminScope.addHook("preHandler", async (request: any, reply: any) => {
          const allowedRoles = ["super_admin", "admin", "editor", "operator"];
          const userRole = request.userRole || request.user?.role;
          if (!userRole || !allowedRoles.includes(userRole)) {
            return reply.status(403).send({
              error: "Forbidden",
              message: "صلاحيات غير كافية. هذا القسم مخصص للمشرفين والمحررين فقط."
            });
          }
        });
        adminScope.register(adminRoutes, { prefix: "/admin" });
        adminScope.register(usersAdminRoutes, { prefix: "/admin/users" });
        adminScope.register(snapRouteRoutes, { prefix: "/admin" });

        adminScope.register(dashboardRoutes, { prefix: "/dashboard" });
        adminScope.register(activityRoutes, { prefix: "/activity" });
      });
    }, { prefix: "/api/v1" });
  });

  // ──── Ready ────
  app.ready(async (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }

    // Socket.io setup
    const io = app.io;

    io.on("connection", (socket) => {
      app.log.info(`Socket connected: ${socket.id}`);

      // Subscribe to vehicle tracking
      socket.on("subscribe:vehicle", (data: { vehicleId: string }) => {
        if (data.vehicleId) {
          socket.join(`vehicle:${data.vehicleId}`);
          app.log.info(`Socket ${socket.id} subscribed to vehicle:${data.vehicleId}`);
        }
      });

      // Subscribe to line tracking
      socket.on("subscribe:line", (data: { lineCode: string }) => {
        if (data.lineCode) {
          socket.join(`line:${data.lineCode}:jo`);
          app.log.info(`Socket ${socket.id} subscribed to line:${data.lineCode}:jo`);
        }
      });

      // Subscribe to stop arrivals
      socket.on("subscribe:stop", (data: { stopId: string }) => {
        if (data.stopId) {
          socket.join(`stop:${data.stopId}:arrivals`);
        }
      });

      // Subscribe to alerts
      socket.on("subscribe:alerts", (data: { governorate?: string }) => {
        const room = data.governorate ? `alerts:${data.governorate}` : "alerts:national";
        socket.join(room);
      });

      // Unsubscribe handlers
      socket.on("unsubscribe:vehicle", (data: { vehicleId: string }) => {
        if (data.vehicleId) socket.leave(`vehicle:${data.vehicleId}`);
      });

      socket.on("unsubscribe:line", (data: { lineCode: string }) => {
        if (data.lineCode) socket.leave(`line:${data.lineCode}:jo`);
      });

      socket.on("unsubscribe:stop", (data: { stopId: string }) => {
        if (data.stopId) socket.leave(`stop:${data.stopId}:arrivals`);
      });

      socket.on("disconnect", () => {
        app.log.info(`Socket disconnected: ${socket.id}`);
      });
    });

    app.log.info(`Socket.io initialized with rooms: vehicle, line, stop, alerts`);

    // Start prayer times cron for daily sync at 2 AM
    startPrayerTimesCron().catch((err) => {
      app.log.error(`Failed to start prayer times cron: ${err.message}`);
    });
  });

  return app;
}

// ──── Start Server ────
async function start() {
  const app = await buildApp();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚍 دروب Droob API running on http://${HOST}:${PORT}`);
    setupWebSocket(app.io, JWT_SECRET_FINAL);
    app.log.info(`📡 WebSocket server ready (JWT auth enforced)`);
    app.log.info(`🗺️  API Docs: http://${HOST}:${PORT}/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();