/**
 * Integration tests — /api/v1/alerts
 * Covers: GET list, GET by severity, GET by governorate, POST create, PATCH status
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp, authHeaders, TEST_IDS } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData } from "../setup.js";

let app: FastifyInstance;
let alertId: string;

beforeAll(async () => {
  await seedTestData();
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("GET /api/v1/alerts", () => {
  it("returns active alerts list (public)", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/alerts",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("filters by severity", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/alerts?severity=warning",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const a of body.data) {
      expect(a.severity).toBe("warning");
    }
  });

  it("filters by governorate", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/alerts?governorate=Amman",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("data");
  });

  it("filters by routeId", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/alerts?routeId=${TEST_IDS.route1}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("data");
  });

  it("validates invalid severity in query", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/alerts?severity=nuclear",
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/v1/alerts (create)", () => {
  it("creates a new alert (admin)", async () => {
    const startAt = new Date(Date.now() + 3600_000).toISOString(); // 1 hour from now
    const endAt = new Date(Date.now() + 7200_000).toISOString(); // 2 hours from now
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "تأخير على الخط السريع",
        title_en: "Delay on BRT line",
        message_ar: "تأخير ١٥ دقيقة بسبب الازدحام المروري",
        message_en: "15 minutes delay due to traffic congestion",
        severity: "warning",
        type: "delay",
        affectedRouteIds: [TEST_IDS.route1],
        governorate: "Amman",
        startAt,
        endAt,
        isActive: true,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.title_ar).toBe("تأخير على الخط السريع");
    expect(body.severity).toBe("warning");
    expect(body.type).toBe("delay");
    alertId = body.id;
  });

  it("creates a critical emergency alert", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "توقف الخدمة",
        title_en: "Service Suspended",
        message_ar: "توقفت الخدمة لسوء الأحوال الجوية",
        message_en: "Service suspended due to severe weather",
        severity: "critical",
        type: "emergency",
        governorate: "Amman",
        startAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().severity).toBe("critical");
  });

  it("creates an info maintenance alert", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "صيانة دورية",
        title_en: "Scheduled Maintenance",
        message_ar: "صيانة دورية للباصات",
        message_en: "Regular bus maintenance",
        severity: "info",
        type: "maintenance",
        governorate: "Amman",
        startAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "Bad Alert",
        // missing message_ar, message_en, severity, type, startAt
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("returns 400 for invalid severity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "اعصار",
        title_en: "Tornado",
        message_ar: "اعصار قادم",
        message_en: "Incoming tornado",
        severity: "apocalypse",
        type: "emergency",
        startAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for invalid alert type", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "فعالية",
        title_en: "Event",
        message_ar: "فعالية خاصة",
        message_en: "Special event",
        severity: "info",
        type: "party",
        startAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("PATCH /api/v1/alerts/:id (update)", () => {
  it("updates an alert status (admin)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/alerts/${alertId}`,
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        isActive: false,
        severity: "info",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.isActive).toBe(false);
    expect(body.severity).toBe("info");
  });

  it("returns 400 for invalid update payload", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/alerts/${alertId}`,
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        severity: "doomsday",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 for non-existent alert", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/alerts/00000000-0000-0000-0000-000000099999",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        isActive: false,
      },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Validation schemas unit tests for alerts", () => {
  it("validates that affectedRouteIds must be an array of UUIDs", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/alerts",
      headers: authHeaders(TEST_IDS.user1, "admin"),
      payload: {
        title_ar: "اختبار UUID",
        title_en: "UUID Test",
        message_ar: "اختبار",
        message_en: "Test",
        severity: "info",
        type: "delay",
        affectedRouteIds: ["not-a-uuid"],
        startAt: new Date().toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });
});