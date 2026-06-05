import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { users, emailVerificationCodes, refreshTokens } from "../../drizzle/schema.js";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signToken, signRefreshToken, verifyRefreshToken } from "../plugins/auth.js";
import { sendVerificationCode, generateVerificationCode } from "../services/email.js";
import { sendError, sendSuccess, sendNotFound, sendValidationError } from "../utils/api-error.js";

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
        return sendError(reply, 429, "TooManyRequests", "تم إرسال عدد كبير من الرموز. الرجاء الانتظار 15 دقيقة.", "Too many requests. Please wait 15 minutes.");
      }

      // For LOGIN: verify that the email exists
      if (body.purpose === "login") {
        const [existingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, body.email))
          .limit(1);
        if (!existingUser) {
          return sendError(reply, 404, "NotFound", "لا يوجد حساب بهذا البريد الإلكتروني. الرجاء إنشاء حساب أولاً.", "No account with this email. Please register first.");
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
          return sendError(reply, 409, "Conflict", "البريد الإلكتروني مسجل مسبقاً. الرجاء تسجيل الدخول.", "Email already registered. Please log in.");
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
        return sendError(reply, 500, "EmailError", "تعذر إرسال رمز التحقق. الرجاء المحاولة لاحقاً.", "Failed to send verification code. Please try again later.");
      }

      // In dev mode, return the code for testing
      const response: any = {
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        expiresIn: 600, // 10 minutes in seconds
      };
      if (process.env.NODE_ENV !== "production") {
        response.devCode = code; // Only in dev!
      }

      return sendSuccess(reply, response);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
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
        return sendError(reply, 400, "InvalidCode", "الرمز غير صحيح أو منتهي الصلاحية. الرجاء المحاولة مجدداً.", "Invalid or expired code. Please try again.");
      }

      // Mark code as used
      await db
        .update(emailVerificationCodes)
        .set({ used: true })
        .where(eq(emailVerificationCodes.id, verification.id));

      return sendSuccess(reply, {
        verified: true,
        email: body.email,
        purpose: body.purpose,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
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
        return sendError(reply, 409, "Conflict", "البريد الإلكتروني مسجل مسبقاً", "Email already registered");
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

      return sendSuccess(reply, { user, ...tokens }, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError)
        return sendValidationError(reply, err.errors);
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
        return sendError(reply, 401, "Unauthorized", "بريد إلكتروني أو كلمة مرور غير صحيحة", "Invalid email or password");
      }

      const valid = await bcrypt.compare(body.password, user.password_hash);
      if (!valid) {
        return sendError(reply, 401, "Unauthorized", "بريد إلكتروني أو كلمة مرور غير صحيحة", "Invalid email or password");
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

      return sendSuccess(reply, {
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
        return sendValidationError(reply, err.errors);
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
        return sendError(reply, 401, "TokenRevoked", "انتهت الجلسة، الرجاء تسجيل الدخول مجدداً", "Session expired, please log in again");
      }

      // Revoke old token (rotation)
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, storedToken.id));

      const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, payload.sub)).limit(1);
      if (!user) return sendError(reply, 401, "Unauthorized", "غير مصرح", "Unauthorized");

      const tokens = generateTokens({ sub: user.id, role: user.role });

      // Store new refresh token
      await db.insert(refreshTokens).values({
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return sendSuccess(reply, tokens);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      return sendError(reply, 401, "TokenExpired", "انتهت الجلسة، الرجاء تسجيل الدخول مجدداً", "Session expired, please log in again");
    }
  });

  // GET /api/v1/auth/me
  app.get("/me", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const [user] = await db.select({
      id: users.id, email: users.email, phone: users.phone, name: users.name,
      role: users.role, preferredLang: users.preferred_lang, created_at: users.created_at,
    }).from(users).where(eq(users.id, (request as any).userId)).limit(1);

    if (!user) return sendNotFound(reply, "المستخدم", "User");
    return sendSuccess(reply, user);
  });

  // GET /api/v1/auth/profile (alias for /me - used by dashboard)
  app.get("/profile", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const [user] = await db.select({
      id: users.id, email: users.email, phone: users.phone, name: users.name,
      role: users.role, preferredLang: users.preferred_lang, created_at: users.created_at,
    }).from(users).where(eq(users.id, (request as any).userId)).limit(1);

    if (!user) return sendNotFound(reply, "المستخدم", "User");
    return sendSuccess(reply, user);
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
    return sendSuccess(reply, { message: "تم تسجيل الخروج بنجاح" });
  });

  // ──── PATCH /api/v1/auth/me — Update profile (name, phone, home/work, preferred language) ────
  const profileUpdateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    preferredLang: z.enum(["ar", "en"]).optional(),
    homeLat: z.number().optional(),
    homeLng: z.number().optional(),
    homeLabelAr: z.string().max(255).optional(),
    homeLabelEn: z.string().max(255).optional(),
    workLat: z.number().optional(),
    workLng: z.number().optional(),
    workLabelAr: z.string().max(255).optional(),
    workLabelEn: z.string().max(255).optional(),
  });

  app.patch("/me", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = profileUpdateSchema.parse(request.body);
      const userId = (request as any).userId;

      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (body.name !== undefined) updateData.name = body.name;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.preferredLang !== undefined) updateData.preferred_lang = body.preferredLang;
      if (body.homeLat !== undefined) updateData.home_lat = body.homeLat;
      if (body.homeLng !== undefined) updateData.home_lng = body.homeLng;
      if (body.homeLabelAr !== undefined) updateData.home_label_ar = body.homeLabelAr;
      if (body.homeLabelEn !== undefined) updateData.home_label_en = body.homeLabelEn;
      if (body.workLat !== undefined) updateData.work_lat = body.workLat;
      if (body.workLng !== undefined) updateData.work_lng = body.workLng;
      if (body.workLabelAr !== undefined) updateData.work_label_ar = body.workLabelAr;
      if (body.workLabelEn !== undefined) updateData.work_label_en = body.workLabelEn;

      const [updated] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          phone: users.phone,
          name: users.name,
          role: users.role,
          preferredLang: users.preferred_lang,
          homeLat: users.home_lat,
          homeLng: users.home_lng,
          homeLabelAr: users.home_label_ar,
          homeLabelEn: users.home_label_en,
          workLat: users.work_lat,
          workLng: users.work_lng,
          workLabelAr: users.work_label_ar,
          workLabelEn: users.work_label_en,
        });

      if (!updated) return sendNotFound(reply, "المستخدم", "User");
      return sendSuccess(reply, updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  // ──── POST /api/v1/auth/reset-password — Email + verification code + new password ────
  const resetPasswordSchema = z.object({
    email: z.string().email("بريد إلكتروني غير صالح"),
    code: z.string().length(6, "الرمز يجب أن يكون 6 أرقام"),
    newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  });

  app.post("/reset-password", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = resetPasswordSchema.parse(request.body);

      // Verify the code
      const [verification] = await db
        .select()
        .from(emailVerificationCodes)
        .where(
          and(
            eq(emailVerificationCodes.email, body.email),
            eq(emailVerificationCodes.code, body.code),
            eq(emailVerificationCodes.purpose, "reset_password"),
            eq(emailVerificationCodes.used, false),
            gt(emailVerificationCodes.expires_at, new Date()),
          ),
        )
        .limit(1);

      if (!verification) {
        return sendError(reply, 400, "InvalidCode", "الرمز غير صحيح أو منتهي الصلاحية", "Invalid or expired code");
      }

      // Mark code as used
      await db.update(emailVerificationCodes)
        .set({ used: true })
        .where(eq(emailVerificationCodes.id, verification.id));

      // Hash new password and update user
      const hashedPassword = await bcrypt.hash(body.newPassword, 12);
      const [updated] = await db.update(users)
        .set({ password_hash: hashedPassword, updated_at: new Date() })
        .where(eq(users.email, body.email))
        .returning({ id: users.id, email: users.email });

      if (!updated) {
        return sendError(reply, 404, "NotFound", "لا يوجد حساب بهذا البريد الإلكتروني", "No account with this email");
      }

      // Revoke all refresh tokens for this user
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.user_id, updated.id));

      return sendSuccess(reply, { message: "تم إعادة تعيين كلمة المرور بنجاح" });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });
}

function generateTokens(payload: { sub: string; role: string }) {
  return {
    accessToken: signToken(payload),
    refreshToken: signRefreshToken(payload.sub),
  };
}