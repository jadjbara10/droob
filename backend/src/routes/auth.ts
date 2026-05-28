import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signToken, signRefreshToken, verifyRefreshToken } from "../plugins/auth.js";

// ──── Schemas ────
const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+962-7[0-9]-[0-9]{3}-[0-9]{4}$/).optional(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  preferredLang: z.enum(["ar", "en"]).default("ar"),
}).refine(data => data.email || data.phone, { message: "البريد الإلكتروني أو رقم الهاتف مطلوب" });

const loginSchema = z.object({
  identifier: z.string(), // email or phone
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/register
  app.post("/register", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check existing user
      if (body.email) {
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
        if (existing.length) return reply.status(409).send({ error: "Conflict", message: "البريد الإلكتروني مسجل مسبقاً" });
      }
      if (body.phone) {
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.phone, body.phone)).limit(1);
        if (existing.length) return reply.status(409).send({ error: "Conflict", message: "رقم الهاتف مسجل مسبقاً" });
      }

      const hashedPassword = await bcrypt.hash(body.password, 12);
      const [user] = await db.insert(users).values({
        email: body.email || null,
        phone: body.phone || null,
        password_hash: hashedPassword,
        name: body.name,
        preferred_lang: body.preferredLang,
        role: "passenger",
      }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });

      const tokens = generateTokens({ sub: user.id, role: user.role });
      return reply.status(201).send({ user, ...tokens });
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // POST /api/v1/auth/login
  app.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      const [user] = await db.select().from(users).where(
        body.identifier.includes("@") ? eq(users.email, body.identifier) : eq(users.phone, body.identifier)
      ).limit(1);

      if (!user) return reply.status(401).send({ error: "Unauthorized", message: "بيانات الدخول غير صحيحة" });

      const valid = await bcrypt.compare(body.password, user.password_hash);
      if (!valid) return reply.status(401).send({ error: "Unauthorized", message: "بيانات الدخول غير صحيحة" });

      await db.update(users).set({ last_login_at: new Date() }).where(eq(users.id, user.id));

      const tokens = generateTokens({ sub: user.id, role: user.role });
      return reply.send({
        user: { id: user.id, email: user.email, phone: user.phone, name: user.name, role: user.role, preferredLang: user.preferred_lang },
        ...tokens,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // POST /api/v1/auth/refresh
  app.post("/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const payload = verifyRefreshToken(body.refreshToken);

      const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, payload.sub)).limit(1);
      if (!user) return reply.status(401).send({ error: "Unauthorized" });

      const tokens = generateTokens({ sub: user.id, role: user.role });
      return reply.send(tokens);
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      return reply.status(401).send({ error: "TokenExpired", message: "انتهت الجلسة، الرجاء تسجيل الدخول مجدداً" });
    }
  });

  // GET /api/v1/auth/me
  app.get("/me", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const [user] = await db.select({
      id: users.id, email: users.email, phone: users.phone, name: users.name,
      role: users.role, preferredLang: users.preferred_lang, created_at: users.created_at,
    }).from(users).where(eq(users.id, (request as any).userId)).limit(1);

    if (!user) return reply.status(404).send({ error: "NotFound" });
    return reply.send(user);
  });

  // GET /api/v1/auth/profile (alias for /me - used by dashboard)
  app.get("/profile", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const [user] = await db.select({
      id: users.id, email: users.email, phone: users.phone, name: users.name,
      role: users.role, preferredLang: users.preferred_lang, created_at: users.created_at,
    }).from(users).where(eq(users.id, (request as any).userId)).limit(1);

    if (!user) return reply.status(404).send({ error: "NotFound" });
    return reply.send(user);
  });

  // DELETE /api/v1/auth/logout (invalidate refresh token client-side)
  app.post("/logout", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: "تم تسجيل الخروج بنجاح" });
  });
}

function generateTokens(payload: { sub: string; role: string }) {
  return {
    accessToken: signToken(payload),
    refreshToken: signRefreshToken(payload.sub),
  };
}