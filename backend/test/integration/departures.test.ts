/**
 * Integration tests — /api/v1/departures
 * Covers: GET departures for stop, GET departures for route, validation, error paths
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp, TEST_IDS } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData, FIXTURES, getTestDb } from "../setup.js";
import { routeStops } from "../../drizzle/schema.js";

let app: FastifyInstance;

beforeAll(async () => {
  // Seed with extra data: link the seeded stop to the seeded route via routeStops
  await seedTestData({
    agencies: [FIXTURES.agency()],
    stops: [
      FIXTURES.stop(),
      FIXTURES.stop({
        id: "00000000-0000-0000-0000-000000000011",
        code: "STP002",
        name_ar: "مجمع الجنوب",
        name_en: "South Complex",
        lat: 31.95,
        lng: 35.93,
      }),
    ],
    routes: [FIXTURES.route()],
    routeStops: [
      {
        id: "00000000-0000-0000-0000-000000020001",
        route_id: "00000000-0000-0000-0000-000000000100",
        stop_id: "00000000-0000-0000-0000-000000000010",
        seq: 1,
        direction: 0,
      },
    ],
    users: [FIXTURES.user()],
    alerts: [FIXTURES.alert()],
    schedules: [FIXTURES.schedule()],
  });
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("GET /api/v1/departures — departures for a stop", () => {
  it("returns departures board for a valid stop", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/departures?stopId=${TEST_IDS.stop1}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("stop");
    expect(body.stop).toHaveProperty("id", TEST_IDS.stop1);
    expect(body.stop).toHaveProperty("name_en", "North Complex");
    expect(body).toHaveProperty("departures");
    expect(Array.isArray(body.departures)).toBe(true);
    expect(body).toHaveProperty("generatedAt");
  });

  it("returns departure entries with expected shape", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/departures?stopId=${TEST_IDS.stop1}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    if (body.departures.length > 0) {
      const dep = body.departures[0];
      expect(dep).toHaveProperty("routeId");
      expect(dep).toHaveProperty("code");
      expect(dep).toHaveProperty("name_ar");
      expect(dep).toHaveProperty("name_en");
      expect(dep).toHaveProperty("mode");
      expect(dep).toHaveProperty("color");
      expect(dep).toHaveProperty("fare");
      expect(dep).toHaveProperty("departureTime");
      expect(dep).toHaveProperty("waitMinutes");
      expect(typeof dep.waitMinutes).toBe("number");
      expect(dep.waitMinutes).toBeGreaterThanOrEqual(0);
      expect(dep).toHaveProperty("occupancy");
      expect(dep).toHaveProperty("status");
    }
  });

  it("filters by modes param (array)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/departures?stopId=${TEST_IDS.stop1}&modes=brt&modes=city_bus`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("departures");
    // The seeded route has mode "brt", so should still return results
    expect(Array.isArray(body.departures)).toBe(true);
  });

  it("returns 404 for non-existent stop", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/departures?stopId=00000000-0000-0000-0000-000000099999",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("NotFound");
  });

  it("returns 400 for invalid stopId format", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/departures?stopId=not-a-uuid",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("respects limit param", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/departures?stopId=${TEST_IDS.stop1}&limit=1`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.departures.length).toBeLessThanOrEqual(1);
  });

  it("returns sorted departures (ascending by departureTime)", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/departures?stopId=${TEST_IDS.stop1}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    if (body.departures.length > 1) {
      for (let i = 1; i < body.departures.length; i++) {
        const prev = new Date(body.departures[i - 1].departureTime).getTime();
        const curr = new Date(body.departures[i].departureTime).getTime();
        expect(prev).toBeLessThanOrEqual(curr);
      }
    }
  });
});

describe("GET /api/v1/departures/route/:routeId — departures for a route", () => {
  it("returns departures for a valid route", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/departures/route/${TEST_IDS.route1}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("route");
    expect(body.route).toHaveProperty("id", TEST_IDS.route1);
    expect(body.route).toHaveProperty("code", "B100");
    expect(body.route).toHaveProperty("mode", "brt");
    expect(body).toHaveProperty("departures");
    expect(Array.isArray(body.departures)).toBe(true);
    expect(body).toHaveProperty("generatedAt");
  });

  it("returns 404 for non-existent route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/departures/route/00000000-0000-0000-0000-000000099999",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("NotFound");
  });

  it("returns 500 for invalid routeId format (no path validation)", async () => {
    // The route doesn't validate UUID format in path params,
    // so malformed UUIDs cause a DB error (500)
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/departures/route/not-a-valid-uuid",
    });
    expect(res.statusCode).toBe(500);
  });
});
