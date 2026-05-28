/**
 * Integration tests — POST /api/v1/planner
 * Covers: basic routing, validation, edge cases
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData } from "../setup.js";

let app: FastifyInstance;

beforeAll(async () => {
  await seedTestData();
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("POST /api/v1/planner", () => {
  it("plans a trip between two valid coordinates", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.956578,
        fromLng: 35.945695, // Amman
        toLat: 31.953949,
        toLng: 35.910635,
        departureTime: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("journeys");
    expect(Array.isArray(body.journeys)).toBe(true);
    if (body.journeys.length > 0) {
      const journey = body.journeys[0];
      expect(journey).toHaveProperty("legs");
      expect(journey).toHaveProperty("totalDuration");
      expect(journey).toHaveProperty("totalFare");
      expect(journey).toHaveProperty("totalTransfers");
    }
  });

  it("validates latitude range (min -90)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: -180,
        fromLng: 35.0,
        toLat: 31.0,
        toLng: 35.0,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("validates latitude range (max 90)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.0,
        fromLng: 35.0,
        toLat: 180,
        toLng: 35.0,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("validates longitude range (min -180)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.0,
        fromLng: -360,
        toLat: 31.0,
        toLng: 35.0,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("validates longitude range (max 180)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.0,
        fromLng: 35.0,
        toLat: 31.0,
        toLng: 360,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("handles missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.0,
        // missing fromLng, toLat, toLng
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("respects maxTransfers constraint", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.956578,
        fromLng: 35.945695,
        toLat: 31.953949,
        toLng: 35.910635,
        maxTransfers: 0,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const journey of body.journeys) {
      expect(journey.totalTransfers).toBeLessThanOrEqual(0);
    }
  });

  it("respects modes filter", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.956578,
        fromLng: 35.945695,
        toLat: 31.953949,
        toLng: 35.910635,
        modes: ["walking"],
        maxWalkingMeters: 300,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Should still return valid response even if only walking
    expect(body).toHaveProperty("journeys");
  });

  it("accepts preference parameter", async () => {
    const preferences = ["fastest", "fewest_transfers", "least_walking", "accessible"] as const;
    for (const pref of preferences) {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/planner",
        payload: {
          fromLat: 31.956578,
          fromLng: 35.945695,
          toLat: 31.953949,
          toLng: 35.910635,
          preference: pref,
        },
      });
      expect(res.statusCode, `Should accept preference: ${pref}`).toBe(200);
    }
  });

  it("rejects invalid preference", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.0,
        fromLng: 35.0,
        toLat: 31.1,
        toLng: 35.1,
        preference: "magic",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects invalid modes", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/planner",
      payload: {
        fromLat: 31.0,
        fromLng: 35.0,
        toLat: 31.1,
        toLng: 35.1,
        modes: ["rocket"],
      },
    });
    expect(res.statusCode).toBe(400);
  });
});