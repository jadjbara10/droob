/**
 * Integration tests — /api/v1/routes CRUD
 * Covers: GET list, GET by ID, POST create, PATCH update, GET stops
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp, authHeaders, TEST_IDS } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData } from "../setup.js";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;
let createdRouteId: string;
const UNIQUE_CODE = `TEST-${randomUUID().substring(0, 8)}`;

beforeAll(async () => {
  await seedTestData();
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("GET /api/v1/routes?q=...", () => {
  it("returns a list of routes (public)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    // Should have at least the seeded route
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0]).toHaveProperty("id");
    expect(body.data[0]).toHaveProperty("code");
    expect(body.data[0]).toHaveProperty("name_ar");
  });

  it("filters by mode query param", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes?mode=city_bus",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const r of body.data) {
      expect(r.mode).toBe("city_bus");
    }
  });

  it("supports text search (q)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes?q=test",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("data");
  });

  it("validates invalid mode", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes?mode=submarine",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/v1/routes (create)", () => {
  it("creates a new route with valid data (admin)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        code: UNIQUE_CODE,
        name_ar: "خط تجريبي ١٠١",
        name_en: "Test Route 101",
        mode: "city_bus",
        agencyId: TEST_IDS.agency,
        color: "#FF5733",
        originStopId: TEST_IDS.stop1,
        destinationStopId: TEST_IDS.stop2,
        baseFare: 0.40,
        hasFridaySchedule: false,
        hasRamadanSchedule: false,
        headwayPeak: 15,
        headwayOffpeak: 30,
        firstDeparture: "06:00",
        lastDeparture: "22:00",
        distance: 5.2,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.code).toBe(UNIQUE_CODE);
    expect(body.name_ar).toBe("خط تجريبي ١٠١");
    expect(body.mode).toBe("city_bus");
    createdRouteId = body.id;
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        code: "BAD",
        // missing name_ar, name_en, mode, agencyId, color, originStopId, destinationStopId
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid hex color", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        code: "TEST-COLOR",
        name_ar: "خط لون",
        name_en: "Color Test",
        mode: "city_bus",
        agencyId: TEST_IDS.agency,
        color: "not-a-color",
        originStopId: TEST_IDS.stop1,
        destinationStopId: TEST_IDS.stop2,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid mode", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/routes",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        code: "TEST-MODE",
        name_ar: "خط وضع",
        name_en: "Mode Test",
        mode: "rocket",
        agencyId: TEST_IDS.agency,
        color: "#123456",
        originStopId: TEST_IDS.stop1,
        destinationStopId: TEST_IDS.stop2,
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/v1/routes/:id", () => {
  it("returns a single route by ID", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/routes/${createdRouteId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(createdRouteId);
    expect(body.code).toBe(UNIQUE_CODE);
  });

  it("returns 404 for non-existent route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes/00000000-0000-0000-0000-000000099999",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("PATCH /api/v1/routes/:id", () => {
  it("updates a route (admin)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/routes/${createdRouteId}`,
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        name_ar: "الخط التجريبي المُعدّل",
        name_en: "Modified Test Route",
        baseFare: 0.50,
        headwayPeak: 10,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name_ar).toBe("الخط التجريبي المُعدّل");
    expect(body.name_en).toBe("Modified Test Route");
    expect(body.baseFare).toBe(0.50);
    expect(body.headwayPeak).toBe(10);
  });

  it("returns 400 for invalid update fields", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/routes/${createdRouteId}`,
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        mode: "unicorn",
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/v1/routes/:id/stops", () => {
  it("returns stops for a route", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/routes/${createdRouteId}/stops`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("stops");
    expect(Array.isArray(body.stops)).toBe(true);
  });

  it("returns 404 for stops of non-existent route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/routes/00000000-0000-0000-0000-000000099999/stops",
    });
    expect(res.statusCode).toBe(404);
  });
});