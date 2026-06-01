/**
 * Integration tests — /api/v1/vehicles
 * Covers: authentication enforcement, GET list, POST create, GPS location ingestion
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp, authHeaders, TEST_IDS } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData, FIXTURES } from "../setup.js";
import { randomUUID } from "node:crypto";

let app: FastifyInstance;
let createdVehicleId: string;
const UNIQUE_PLATE = `1-${randomUUID().substring(0, 8).toUpperCase()}`;

beforeAll(async () => {
  await seedTestData();
  app = await buildTestApp();

  // Mock app.redis for vehicle live-tracking endpoints
  // The real app decorates redis via a Fastify plugin; tests need a stub
  (app as any).redis = {
    smembers: async () => [],
    sadd: async () => 1,
    srem: async () => 1,
  };
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("Authentication — vehicles routes require auth", () => {
  it("GET /api/v1/vehicles returns 401 without token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles",
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/vehicles returns 401 with malformed token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles",
      headers: {
        Authorization: "Bearer this-is-not-a-valid-jwt",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/v1/vehicles/location returns 401 without token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles/location",
      payload: {
        vehicleId: TEST_IDS.stop1,
        lat: 31.95,
        lng: 35.93,
        timestamp: Date.now(),
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("GET /api/v1/vehicles/db returns 401 without token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles/db",
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/v1/vehicles — list vehicles (authenticated)", () => {
  it("returns vehicle list with valid auth token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles",
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("vehicles");
    expect(Array.isArray(body.vehicles)).toBe(true);
    expect(body).toHaveProperty("generatedAt");
  });

  it("accepts routeCode filter", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles?routeCode=B100",
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("vehicles");
    expect(Array.isArray(body.vehicles)).toBe(true);
  });

  it("accepts mode filter", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles?mode=city_bus",
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("vehicles");
  });

  it("accepts limit param", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles?limit=5",
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.vehicles.length).toBeLessThanOrEqual(5);
  });
});

describe("GET /api/v1/vehicles/db — DB vehicle list", () => {
  it("returns vehicles from database with auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles/db",
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe("POST /api/v1/vehicles — create vehicle", () => {
  it("creates a new vehicle with valid data", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        plate: UNIQUE_PLATE,
        type: "city_bus",
        agencyId: TEST_IDS.agency,
        capacity: 50,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.plate).toBe(UNIQUE_PLATE);
    expect(body.type).toBe("city_bus");
    expect(body.capacity).toBe(50);
    createdVehicleId = body.id;
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        // missing plate, type, agencyId
        capacity: 45,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for invalid plate (too short)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        plate: "AB",
        type: "city_bus",
        agencyId: TEST_IDS.agency,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for invalid vehicle type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        plate: "1-XXXXX",
        type: "spaceship",
        agencyId: TEST_IDS.agency,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });
});

describe("GET /api/v1/vehicles/:id — single vehicle", () => {
  it("returns a vehicle by ID", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/vehicles/${createdVehicleId}`,
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(createdVehicleId);
    expect(body.plate).toBe(UNIQUE_PLATE);
  });

  it("returns 404 for non-existent vehicle", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/vehicles/00000000-0000-0000-0000-000000099999",
      headers: authHeaders(TEST_IDS.user1),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("NotFound");
  });
});

describe("PATCH /api/v1/vehicles/:id — update vehicle", () => {
  it("updates a vehicle capacity", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/vehicles/${createdVehicleId}`,
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        capacity: 60,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.capacity).toBe(60);
  });

  it("returns 404 for non-existent vehicle update", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/vehicles/00000000-0000-0000-0000-000000099999",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        capacity: 45,
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("NotFound");
  });
});

describe("POST /api/v1/vehicles/location — ingest GPS location", () => {
  it("ingests GPS location update", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles/location",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        vehicleId: createdVehicleId,
        lat: 31.956578,
        lng: 35.945695,
        speed: 35,
        bearing: 180,
        routeCode: "B100",
        timestamp: Date.now(),
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toEqual({ ok: true });
  });

  it("returns 400 for invalid GPS payload (missing lat)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles/location",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        vehicleId: createdVehicleId,
        // missing lat
        lng: 35.945695,
        timestamp: Date.now(),
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for invalid vehicleId format in location", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/vehicles/location",
      headers: authHeaders(TEST_IDS.user1),
      payload: {
        vehicleId: "not-a-uuid",
        lat: 31.95,
        lng: 35.93,
        timestamp: Date.now(),
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });
});
