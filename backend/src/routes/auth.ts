import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, emailVerificationCodes, refreshTokens } from "../../drizzle/schema.js";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signToken, signRefreshToken, verifyRefreshToken } from "../plugins/auth.js";
import { sendVerificationCode, generateVerificationCode } from "../services/email.js";

// ──── Schemas ────
const registerSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  name: z.string().min(1, "الاسم مطلوب").max(100),
  preferredLang: z.enum(["ar", "en"]).default("ar"),
});

const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const sendCodeSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["verify", "login", "reset_password"]).default("verify"),
  lang: z.enum(["ar", "en"]).default("ar"),
});

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.enum(["verify", "login", "reset_password"]).default("verify"),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(app: FastifyInstance) {
  // ──── POST /api/v1/auth/send-code ────
  // Send a 6-digit verification code to email
  app.post("/send-code", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = sendCodeSchema.parse(request.body);

      // Rate limit: max 3 codes per email per 15 minutes
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      const recentCodes = await db
        .select({ id: emailVerificationCodes.id })
        .from(emailVerificationCodes)
        .where(
          and(
            eq(emailVerificationCodes.email, body.email),
            gt(emailVerificationCodes.created_at, fifteenMinAgo)
          )
        );
      if (recentCodes.length >= 5) {
        return reply.status(429).send({
          error: "TooManyRequests",
          message: "تم إرسال عدد كبير من الرموز. الرجاء الانتظار 15 دقيقة.",
        });
      }

      // For LOGIN: verify that the email exists
      if (body.purpose === "login") {
        const [existingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, body.email))
          .limit(1);
        if (!existingUser) {
          return reply.status(404).send({
            error: "NotFound",
            message: "لا يوجد حساب بهذا البريد الإلكتروني. الرجاء إنشاء حساب أولاً.",
          });
        }
      }

      // For REGISTER: verify that the email does NOT exist
      if (body.purpose === "verify") {
        const [existingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, body.email))
          .limit(1);
        if (existingUser) {
          return reply.status(409).send({
            error: "Conflict",
            message: "البريد الإلكتروني مسجل مسبقاً. الرجاء تسجيل الدخول.",
          });
        }
      }

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store code in DB
      await db.insert(emailVerificationCodes).values({
        email: body.email,
        code,
        purpose: body.purpose,
        expires_at: expiresAt,
      });

      // Send email
      const result = await sendVerificationCode(body.email, code, body.lang);

      if (!result.success && process.env.NODE_ENV === "production") {
        return reply.status(500).send({
          error: "EmailError",
          message: "تعذر إرسال رمز التحقق. الرجاء المحاولة لاحقاً.",
        });
      }

      // In dev mode, return the code for testing
      const response: any = {
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        expiresIn: 600, // 10 minutes in seconds
      };
      if (process.env.NODE_ENV !== "production") {
        response.devCode = code; // Only in dev!
      }

      return reply.send(response);
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // ──── POST /api/v1/auth/verify-code ────
  // Verify the code and return a result
  app.post("/verify-code", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = verifyCodeSchema.parse(request.body);

      // Find valid code
      const [verification] = await db
        .select()
        .from(emailVerificationCodes)
        .where(
          and(
            eq(emailVerificationCodes.email, body.email),
            eq(emailVerificationCodes.code, body.code),
            eq(emailVerificationCodes.purpose, body.purpose),
            eq(emailVerificationCodes.used, false),
            gt(emailVerificationCodes.expires_at, new Date())
          )
        )
        .limit(1);

      if (!verification) {
        return reply.status(400).send({
          error: "InvalidCode",
          message: "الرمز غير صحيح أو منتهي الصلاحية. الرجاء المحاولة مجدداً.",
        });
      }

      // Mark code as used
      await db
        .update(emailVerificationCodes)
        .set({ used: true })
        .where(eq(emailVerificationCodes.id, verification.id));

      return reply.send({
        verified: true,
        email: body.email,
        purpose: body.purpose,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // ──── POST /api/v1/auth/register ────
  app.post("/register", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if email is already registered
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);
      if (existing.length) {
        return reply.status(409).send({
          error: "Conflict",
          message: "البريد الإلكتروني مسجل مسبقاً",
        });
      }

      const hashedPassword = await bcrypt.hash(body.password, 12);
      const [user] = await db
        .insert(users)
        .values({
          email: body.email,
          password_hash: hashedPassword,
          name: body.name,
          preferred_lang: body.preferredLang,
          role: "passenger",
          is_verified: false, // becomes true after email verification
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        });

      const tokens = generateTokens({ sub: user.id, role: user.role });

      // Store refresh token in DB for revocation support
      await db.insert(refreshTokens).values({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return reply.status(201).send({ user, ...tokens });
    } catch (err: any) {
      if (err instanceof z.ZodError)
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // ──── POST /api/v1/auth/login ────
  app.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "بريد إلكتروني أو كلمة مرور غير صحيحة",
        });
      }

      const valid = await bcrypt.compare(body.password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "بريد إلكتروني أو كلمة مرور غير صحيحة",
        });
      }

      await db
        .update(users)
        .set({ last_login_at: new Date() })
        .where(eq(users.id, user.id));

      const tokens = generateTokens({ sub: user.id, role: user.role });

      // Store refresh token in DB for revocation support
      await db.insert(refreshTokens).values({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          preferredLang: user.preferred_lang,
        },
        ...tokens,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError)
        return reply.status(400).send({ error: "ValidationError", details: err.errors });
      throw err;
    }
  });

  // POST /api/v1/auth/refresh — Verify refresh token against DB, rotate
  app.post("/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const payload = verifyRefreshToken(body.refreshToken);

      // Check token exists in DB and is not revoked
      const [storedToken] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.token, body.refreshToken),
            eq(refreshTokens.revoked, false),
            gt(refreshTokens.expires_at, new Date())
          )
        )
        .limit(1);

      if (!storedToken) {
        return reply.status(401).send({ error: "TokenRevoked", message: "انتهت الجلسة، الرجاء تسجيل الدخول مجدداً" });
      }

      // Revoke old token (rotation)
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, storedToken.id));

      const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, payload.sub)).limit(1);
      if (!user) return reply.status(401).send({ error: "Unauthorized" });

      const tokens = generateTokens({ sub: user.id, role: user.role });

      // Store new refresh token
      await db.insert(refreshTokens).values({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

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

  // POST /api/v1/auth/logout — Revoke refresh token
  app.post("/logout", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const refreshToken = authHeader.slice(7);
      // Revoke the refresh token if present
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.token, refreshToken))
        .execute()
        .catch(() => {}); // Silent — token might not be in DB
    }
    return reply.send({ message: "تم تسجيل الخروج بنجاح" });
  });
}

function generateTokens(payload: { sub: string; role: string }) {
  return {
    accessToken: signToken(payload),
    refreshToken: signRefreshToken(payload.sub),
  };
}