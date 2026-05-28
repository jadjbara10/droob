import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("FATAL: JWT_SECRET required in production"); })() : "dev-secret-do-not-use-in-prod");
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || "15m";
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

export interface JwtPayload {
  sub: string; // user ID
  role: string;
  agencyId?: string;
  iat?: number;
  exp?: number;
}

// Extend Fastify to add user to request
declare module "fastify" {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRY,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string; type: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string; type: string };
}

// Auth middleware (optional — routes can use this)
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "AuthorizationRequired", message: "يرجى تسجيل الدخول" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: "InvalidToken", message: "انتهت الجلسة، يرجى إعادة تسجيل الدخول" });
  }
}

// Role-based authorization
export function authorize(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({ error: "AuthorizationRequired", message: "يرجى تسجيل الدخول" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({ error: "Forbidden", message: "غير مصرح" });
    }
  };
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcrypt");
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(password, hash);
}

// Get user by ID (from DB)
export async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user || null;
}