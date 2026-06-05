import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { prayerTimes } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";
import { toCamelCase } from "../utils/case-transform.js";
import { sendSuccess, sendNotFound, sendValidationError } from "../utils/api-error.js";
import { fetchPrayerTimes } from "../services/prayer-times.js";

const prayerTimesQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  governorate: z.string().min(1),
});

const prayerTimesCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  governorate: z.string().min(1),
  fajr: z.string().optional(),
  sunrise: z.string().optional(),
  dhuhr: z.string().optional(),
  asr: z.string().optional(),
  maghrib: z.string().optional(),
  isha: z.string().optional(),
});

export async function prayerTimesRoutes(app: FastifyInstance) {
  // GET /api/v1/prayer-times?date=YYYY-MM-DD&governorate=عمان
  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = prayerTimesQuerySchema.parse(request.query);

      // Check cache in DB first
      const [cached] = await db
        .select()
        .from(prayerTimes)
        .where(
          and(
            eq(prayerTimes.date, query.date),
            eq(prayerTimes.governorate, query.governorate)
          )
        )
        .limit(1);

      if (cached) {
        return sendSuccess(reply, toCamelCase(cached));
      }

      // If not cached, fetch live from Aladhan API
      const liveResult = await fetchPrayerTimes(query.date, query.governorate);
      if (!liveResult) {
        return sendNotFound(reply, "مواقيت الصلاة", "Prayer times");
      }

      // Store in DB for future requests
      const [stored] = await db.insert(prayerTimes).values({
        date: liveResult.date,
        governorate: liveResult.governorate,
        fajr: liveResult.fajr,
        sunrise: liveResult.sunrise,
        dhuhr: liveResult.dhuhr,
        asr: liveResult.asr,
        maghrib: liveResult.maghrib,
        isha: liveResult.isha,
      }).returning();

      return sendSuccess(reply, toCamelCase(stored));
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });

  // POST /api/v1/prayer-times — Manually insert prayer times (auth required)
  app.post("/", { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = prayerTimesCreateSchema.parse(request.body);

      // Upsert: delete existing then insert
      await db.delete(prayerTimes).where(
        and(eq(prayerTimes.date, body.date), eq(prayerTimes.governorate, body.governorate))
      );

      const [created] = await db.insert(prayerTimes).values({
        date: body.date,
        governorate: body.governorate,
        fajr: body.fajr || null,
        sunrise: body.sunrise || null,
        dhuhr: body.dhuhr || null,
        asr: body.asr || null,
        maghrib: body.maghrib || null,
        isha: body.isha || null,
      }).returning();

      return sendSuccess(reply, toCamelCase(created), 201);
    } catch (err: any) {
      if (err instanceof z.ZodError) return sendValidationError(reply, err.errors);
      throw err;
    }
  });
}
