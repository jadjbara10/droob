import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { activityLogs } from "../../drizzle/schema.js";
import { eq, desc, and, count } from "drizzle-orm";
import { sendSuccess, sendValidationError } from "../utils/api-error.js";

const activityQuerySchema = z.object({
  entityType: z.string().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

export async function activityRoutes(app: FastifyInstance) {
  // GET /api/v1/activity — List activity logs (admin role required)
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = activityQuerySchema.parse(request.query);
      const conditions = [];

      if (query.entityType) conditions.push(eq(activityLogs.entity_type, query.entityType));
      if (query.userId) conditions.push(eq(activityLogs.user_id, query.userId));
      if (query.action) conditions.push(eq(activityLogs.action, query.action));

      const result = await db.query.activityLogs.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        limit: Math.min(query.limit, 200),
        offset: query.offset,
        orderBy: desc(activityLogs.created_at),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      // Get total count for pagination
      const [countResult] = conditions.length > 0
        ? await db.select({ value: count() }).from(activityLogs).where(and(...conditions))
        : await db.select({ value: count() }).from(activityLogs);

      return sendSuccess(reply, {
        data: result,
        total: Number(countResult?.value || 0),
        limit: query.limit,
        offset: query.offset,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });
}
