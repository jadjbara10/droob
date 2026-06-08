/**
 * دروب Droob — Super Admin User Management
 * POST   /api/v1/admin/users                 — Create user
 * GET    /api/v1/admin/users                 — List all users
 * PATCH  /api/v1/admin/users/:id             — Update user (name, email, role)
 * PATCH  /api/v1/admin/users/:id/reset-password — Reset user password
 * DELETE /api/v1/admin/users/:id             — Delete user
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { users, refreshTokens } from "../../drizzle/schema.js";
import { eq, asc, sql, like, or, and } from "drizzle-orm";
import { sendError, sendSuccess, sendNotFound, sendValidationError } from "../utils/api-error.js";

// ──── Schemas ────

const createUserSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
  name: z.string().min(1, "الاسم مطلوب").max(100),
  role: z.enum(["super_admin", "admin", "editor", "operator", "viewer", "driver", "passenger"]),
  phone: z.string().optional(),
  preferredLang: z.enum(["ar", "en"]).default("ar"),
});

const updateUserSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح").optional(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["super_admin", "admin", "editor", "operator", "viewer", "driver", "passenger"]).optional(),
  phone: z.string().optional(),
  preferredLang: z.enum(["ar", "en"]).optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
});

const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

// ──── Super Admin Guard ────

async function requireSuperAdmin(request: any, reply: FastifyReply) {
  const userRole = request.userRole || request.user?.role;
  if (userRole !== "super_admin") {
    return reply.status(403).send({
      success: false,
      error: { code: "Forbidden", message_ar: "هذا القسم مخصص لمدير النظام فقط", message_en: "Super admin access required" },
    });
  }
}

// ──── Routes ────

export async function usersAdminRoutes(app: FastifyInstance) {

  /**
   * GET /api/v1/admin/users — List all users (with search & role filter)
   */
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const guard = await requireSuperAdmin(request, reply);
    if (guard) return guard;

    try {
      const query = listUsersQuerySchema.parse(request.query);
      const conditions: any[] = [];

      if (query.q) {
        conditions.push(
          or(
            like(users.name, `%${query.q}%`),
            like(users.email, `%${query.q}%`),
            like(users.phone, `%${query.q}%`),
          )
        );
      }

      if (query.role) {
        conditions.push(eq(users.role, query.role));
      }

      const result = await db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          name: users.name,
          role: users.role,
          preferredLang: users.preferred_lang,
          isVerified: users.is_verified,
          lastLoginAt: users.last_login_at,
          createdAt: users.created_at,
          updatedAt: users.updated_at,
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(users.created_at))
        .limit(Math.min(query.limit, 200))
        .offset(query.offset);

      // Count total
      const [{ count: total }] = await db
        .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return sendSuccess(reply, { data: result, total, limit: query.limit, offset: query.offset });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  /**
   * POST /api/v1/admin/users — Create a new user (super_admin only)
   */
  app.post("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const guard = await requireSuperAdmin(request, reply);
    if (guard) return guard;

    try {
      const body = createUserSchema.parse(request.body);

      // Check duplicate email
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email)).limit(1);
      if (existing) {
        return sendError(reply, 409, "DuplicateEmail", "البريد الإلكتروني مسجل مسبقاً", "Email already exists");
      }

      const hashedPassword = await bcrypt.hash(body.password, 12);
      const [user] = await db.insert(users).values({
        email: body.email,
        password_hash: hashedPassword,
        name: body.name,
        role: body.role,
        phone: body.phone || null,
        preferred_lang: body.preferredLang,
        is_verified: true,
      }).returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        phone: users.phone,
        preferred_lang: users.preferred_lang,
      });

      return sendSuccess(reply, user, 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      if (err.code === "23505") {
        return sendError(reply, 409, "Duplicate", "البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً", "Duplicate email or phone");
      }
      throw err;
    }
  });

  /**
   * PATCH /api/v1/admin/users/:id — Update user info (name, email, role, phone)
   */
  app.patch("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const guard = await requireSuperAdmin(request, reply);
    if (guard) return guard;

    try {
      const { id } = request.params;
      const body = updateUserSchema.parse(request.body);

      // Check user exists
      const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
      if (!existing) return sendNotFound(reply, "المستخدم", "User");

      // Prevent super_admin from demoting the last super_admin
      if (body.role && existing.role === "super_admin" && body.role !== "super_admin") {
        const [{ count }] = await db
          .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
          .from(users)
          .where(eq(users.role, "super_admin"));
        if (count <= 1) {
          return sendError(reply, 400, "LastSuperAdmin", "لا يمكن تغيير صلاحية آخر مدير نظام", "Cannot demote the last super admin");
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (body.name !== undefined) updateData.name = body.name;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.phone !== undefined) updateData.phone = body.phone;
      if (body.preferredLang !== undefined) updateData.preferred_lang = body.preferredLang;

      const [updated] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          phone: users.phone,
          preferredLang: users.preferred_lang,
        });

      return sendSuccess(reply, updated);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      if (err.code === "23505") {
        return sendError(reply, 409, "Duplicate", "البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً", "Duplicate email or phone");
      }
      throw err;
    }
  });

  /**
   * PATCH /api/v1/admin/users/:id/reset-password — Reset password for a user
   */
  app.patch("/:id/reset-password", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const guard = await requireSuperAdmin(request, reply);
    if (guard) return guard;

    try {
      const { id } = request.params;
      const body = resetPasswordSchema.parse(request.body);

      const [existing] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, id)).limit(1);
      if (!existing) return sendNotFound(reply, "المستخدم", "User");

      const hashedPassword = await bcrypt.hash(body.newPassword, 12);
      await db.update(users)
        .set({ password_hash: hashedPassword, updated_at: new Date() })
        .where(eq(users.id, id));

      // Revoke all existing refresh tokens for this user (force re-login)
      await db.update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.user_id, id));

      return sendSuccess(reply, { message: "تم إعادة تعيين كلمة المرور بنجاح", userId: id });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  /**
   * DELETE /api/v1/admin/users/:id — Delete a user
   */
  app.delete("/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const guard = await requireSuperAdmin(request, reply);
    if (guard) return guard;

    try {
      const { id } = request.params;
      const currentUserId = (request as any).userId;

      // Can't delete yourself
      if (id === currentUserId) {
        return sendError(reply, 400, "CannotDeleteSelf", "لا يمكنك حذف حسابك الخاص", "You cannot delete your own account");
      }

      const [existing] = await db.select({ id: users.id, role: users.role, name: users.name }).from(users).where(eq(users.id, id)).limit(1);
      if (!existing) return sendNotFound(reply, "المستخدم", "User");

      // Prevent deleting the last super_admin
      if (existing.role === "super_admin") {
        const [{ count }] = await db
          .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
          .from(users)
          .where(eq(users.role, "super_admin"));
        if (count <= 1) {
          return sendError(reply, 400, "LastSuperAdmin", "لا يمكن حذف آخر مدير نظام", "Cannot delete the last super admin");
        }
      }

      // Delete user's refresh tokens first, then delete user
      await db.delete(refreshTokens).where(eq(refreshTokens.user_id, id));
      await db.delete(users).where(eq(users.id, id));

      return sendSuccess(reply, { deleted: true, id, name: existing.name });
    } catch (err: any) {
      throw err;
    }
  });
}
