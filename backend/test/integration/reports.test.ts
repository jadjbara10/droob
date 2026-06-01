/**
 * Integration tests — /api/v1/reports
 * Covers: POST create, GET list, filter, PATCH resolve, GET analytics
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp, TEST_IDS } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData, FIXTURES } from "../setup.js";

let app: FastifyInstance;
let createdReportId: string;

beforeAll(async () => {
  await seedTestData();
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("POST /api/v1/reports — create community report", () => {
  it("creates a delay report", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "delay",
        severity: "medium",
        lat: 31.956578,
        lng: 35.945695,
        routeCode: "B100",
        message_ar: "تأخير ١٠ دقائق",
        message_en: "10 minutes delay",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.type).toBe("delay");
    expect(body.severity).toBe("medium");
    expect(body.lat).toBeCloseTo(31.956578, 5);
    expect(body.lng).toBeCloseTo(35.945695, 5);
    expect(body.message_ar).toBe("تأخير ١٠ دقائق");
    expect(body.is_resolved).toBe(false);
    // Note: routeCode is accepted in request but stored as route_code in DB;
    // the route handler doesn't map camelCase fields yet
    createdReportId = body.id;
  });

  it("creates a crowding report", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "crowding",
        severity: "high",
        lat: 31.98,
        lng: 35.91,
        message_ar: "ازدحام شديد",
        message_en: "Severe crowding",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe("crowding");
    expect(body.severity).toBe("high");
  });

  it("creates a closed station report", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "closed_station",
        severity: "low",
        lat: 31.985,
        lng: 35.905,
        message_ar: "محطة مغلقة",
        message_en: "Station closed",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.type).toBe("closed_station");
    expect(body.severity).toBe("low");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "delay",
        // missing severity, lat, lng
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for invalid report type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "volcano",
        severity: "high",
        lat: 31.95,
        lng: 35.93,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for invalid severity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "delay",
        severity: "apocalyptic",
        lat: 31.95,
        lng: 35.93,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for message exceeding 500 characters", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/reports",
      payload: {
        type: "delay",
        severity: "low",
        lat: 31.95,
        lng: 35.93,
        message_ar: "x".repeat(501),
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });
});

describe("GET /api/v1/reports — list reports", () => {
  it("returns recently created reports", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reports",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("reports");
    expect(Array.isArray(body.reports)).toBe(true);
    expect(body.reports.length).toBeGreaterThanOrEqual(3);
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("generatedAt");
  });

  it("filters by type", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reports?type=delay",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reports.length).toBeGreaterThanOrEqual(1);
    for (const r of body.reports) {
      expect(r.type).toBe("delay");
    }
  });

  it("filters by severity", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reports?severity=high",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reports.length).toBeGreaterThanOrEqual(1);
    for (const r of body.reports) {
      expect(r.severity).toBe("high");
    }
  });

  it("filters by hoursAgo", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reports?hoursAgo=1",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("reports");
    // Reports just created should be within the last hour
    expect(body.reports.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 400 for invalid type filter", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reports?type=invalid",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });
});

describe("PATCH /api/v1/reports/:id/resolve — resolve report", () => {
  it("marks a report as resolved", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/reports/${createdReportId}/resolve`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.is_resolved).toBe(true);
  });

  it("returns 404 for non-existent report", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/reports/00000000-0000-0000-0000-000000099999/resolve",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /api/v1/reports/analytics — report analytics", () => {
  it("returns analytics by type and by day", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reports/analytics",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("byType");
    expect(body).toHaveProperty("byDay");
    expect(body).toHaveProperty("total");
    expect(typeof body.total).toBe("number");
    expect(body.total).toBeGreaterThanOrEqual(3);
    // byType should have entries for the types we created
    expect(body.byType.delay).toBeGreaterThanOrEqual(1);
    expect(body.byType.crowding).toBeGreaterThanOrEqual(1);
  });
});
