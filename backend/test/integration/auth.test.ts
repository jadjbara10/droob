/**
 * Integration tests — POST /api/v1/auth/*
 * Covers: register, login, refresh, /me, logout
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp } from "../helpers/test-app.js";
import { seedTestData, cleanupTestData } from "../setup.js";

let app: FastifyInstance;
const testEmail = `droob-test-${Date.now()}@example.com`;
const testPhone = `+962-7${String(Math.floor(Math.random() * 10))}-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 900) + 100)}`;
const testPassword = "P@ssw0rdTest123";
let accessToken: string;
let refreshToken: string;

beforeAll(async () => {
  await seedTestData();
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
  await cleanupTestData();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user with email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: testPassword,
        name: "Test User",
        preferredLang: "ar",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty("accessToken");
    expect(body).toHaveProperty("refreshToken");
    expect(body.user).toHaveProperty("id");
    expect(body.user.email).toBe(testEmail);
    expect(body.user.role).toBe("passenger");
  });

  it("blocks duplicate email registration", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: testPassword,
        name: "Duplicate User",
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Conflict");
  });

  it("validates required fields (no email or phone)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        password: testPassword,
        name: "Missing Contact",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });

  it("validates password length (min 8)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: `shortpass-${Date.now()}@example.com`,
        password: "1234",
        name: "Short Pass",
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("ValidationError");
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        identifier: testEmail,
        password: testPassword,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("accessToken");
    expect(body).toHaveProperty("refreshToken");
    expect(body.user.name).toBe("Test User");
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it("returns 401 for wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        identifier: testEmail,
        password: "WrongPassword1",
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for non-existent user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        identifier: "noone@example.com",
        password: testPassword,
      },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("issues new tokens with a valid refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("accessToken");
    expect(body).toHaveProperty("refreshToken");
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });

  it("rejects invalid refresh token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: "not-a-real-token" },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns current user with valid token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("id");
    expect(body.email).toBe(testEmail);
    expect(body.name).toBe("Test User");
  });

  it("returns 401 without token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        Authorization: "Bearer not-valid-jwt",
      },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("successfully logs out", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().message).toBe("تم تسجيل الخروج بنجاح");
  });
});