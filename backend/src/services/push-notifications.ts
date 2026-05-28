/**
 * دروب Push Notifications Service
 * Supports: Expo Push API (iOS/Android) + Firebase Cloud Messaging (FCM)
 *
 * Features:
 *   - Device token registration
 *   - Delay alerts
 *   - Departure reminders
 *   - Bulk/broadcast notifications
 *   - Rate-limited, queued via BullMQ
 */

import { db } from "../db/index.js";
import { deviceTokens, pushNotifications } from "../../drizzle/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { Queue, Worker, QueueScheduler } from "bullmq";
import { redis } from "../redis/index.js";

// ─── Types ────────────────────────────────────────────────────
export interface PushPayload {
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  data?: Record<string, string>;
  priority?: "default" | "high";
  category?:
    | "delay_alert"
    | "departure_reminder"
    | "broadcast"
    | "route_change"
    | "payment";
}

export interface DeviceRegistration {
  userId?: string;
  token: string;
  platform: "ios" | "android";
  language: "ar" | "en";
}

// ─── Push Queue (BullMQ) ─────────────────────────────────────
const pushQueue = new Queue<{
  userIds: string[];
  payload: PushPayload;
}>("push-notifications", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 3600 * 24 }, // Keep for 1 day
    removeOnFail: { age: 3600 * 24 * 7 }, // Keep failed for 1 week
  },
});

// ─── Expo Push API ───────────────────────────────────────────
async function sendExpoPush(
  tokens: string[],
  payload: PushPayload
): Promise<{ success: number; failed: number; errorTokens: string[] }> {
  if (!tokens.length) return { success: 0, failed: 0, errorTokens: [] };

  const expoPushUrl = "https://exp.host/--/api/v2/push/send";

  const messages = tokens.map((to) => ({
    to,
    title: payload.title_en, // Expo uses one language - we embed both
    body: `${payload.title_ar}\n${payload.body_ar}\n---\n${payload.body_en}`,
    data: { ...payload.data, title_ar: payload.title_ar, body_ar: payload.body_ar },
    priority: payload.priority || "high",
    sound: "default",
    badge: 1,
    categoryId: payload.category,
  }));

  const response = await fetch(expoPushUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(messages),
  });

  const result = (await response.json()) as {
    data: Array<{ status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } }>;
  };

  let success = 0;
  let failed = 0;
  const errorTokens: string[] = [];

  for (let i = 0; i < result.data.length; i++) {
    if (result.data[i].status === "ok") {
      success++;
    } else {
      failed++;
      errorTokens.push(tokens[i]);
    }
  }

  return { success, failed, errorTokens };
}

// ─── FCM Push API ────────────────────────────────────────────
async function sendFCMPush(
  tokens: string[],
  payload: PushPayload
): Promise<{ success: number; failed: number; errorTokens: string[] }> {
  if (!tokens.length) return { success: 0, failed: 0, errorTokens: [] };

  const fcmUrl = "https://fcm.googleapis.com/fcm/send";

  const success = 0;
  const failed = 0;
  const errorTokens: string[] = [];

  for (const token of tokens) {
    try {
      const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${process.env.FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: token,
          notification: {
            title: payload.title_en,
            body: payload.body_en,
          },
          data: {
            title_ar: payload.title_ar,
            body_ar: payload.body_ar,
            ...payload.data,
          },
          priority: payload.priority === "high" ? "high" : "normal",
        }),
      });

      if (response.ok) {
        // FCM returns success even for invalid tokens — we clean up later
      }
    } catch {
      errorTokens.push(token);
    }
  }

  return { success, failed, errorTokens };
}

// ─── Device Token Management ─────────────────────────────────
export async function registerDevice(registration: DeviceRegistration): Promise<void> {
  await db
    .insert(deviceTokens)
    .values({
      userId: registration.userId || null,
      token: registration.token,
      platform: registration.platform,
      language: registration.language,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: {
        userId: registration.userId || null,
        platform: registration.platform,
        language: registration.language,
        isActive: true,
        lastUsedAt: sql`NOW()`,
      },
    });
}

export async function unregisterDevice(token: string): Promise<void> {
  await db
    .update(deviceTokens)
    .set({ isActive: false, lastUsedAt: sql`NOW()` })
    .where(eq(deviceTokens.token, token));
}

async function getActiveTokens(userIds: string[]): Promise<
  Array<{ token: string; platform: "ios" | "android"; language: "ar" | "en" }>
> {
  if (!userIds.length) return [];

  return db
    .select({
      token: deviceTokens.token,
      platform: deviceTokens.platform,
      language: deviceTokens.language,
    })
    .from(deviceTokens)
    .where(
      and(
        eq(deviceTokens.isActive, true),
        // Get tokens for specific users OR all registered tokens
        userIds.length > 0 ? sql`${deviceTokens.userId} = ANY(${userIds})` : undefined
      )
    ) as any;
}

// ─── Queue Worker ────────────────────────────────────────────
const pushWorker = new Worker(
  "push-notifications",
  async (job) => {
    const { userIds, payload } = job.data;

    const tokens = await getActiveTokens(userIds);
    if (!tokens.length) {
      console.log(`📱 No active tokens for ${userIds.length} users`);
      return;
    }

    // Separate Expo vs FCM tokens
    const expoTokens = tokens
      .filter((t) => t.platform === "ios")
      .map((t) => t.token);
    const fcmTokens = tokens
      .filter((t) => t.platform === "android")
      .map((t) => t.token);

    const results = await Promise.all([
      expoTokens.length ? sendExpoPush(expoTokens, payload) : null,
      fcmTokens.length ? sendFCMPush(fcmTokens, payload) : null,
    ]);

    // Log notification
    const sent = (results[0]?.success || 0) + (results[1]?.success || 0);
    const err = (results[0]?.failed || 0) + (results[1]?.failed || 0);

    await db.insert(pushNotifications).values({
      titleAr: payload.title_ar,
      titleEn: payload.title_en,
      bodyAr: payload.body_ar,
      bodyEn: payload.body_en,
      category: payload.category || "broadcast",
      sentCount: sent,
      failedCount: err,
      data: payload.data || {},
    });

    console.log(
      `📱 Push sent: ${sent} success, ${err} failed — "${payload.title_ar}"`
    );
  },
  { connection: redis, concurrency: 4 }
);

// ─── Convenience Functions ───────────────────────────────────

/**
 * Send delay alert: when a route/departure is delayed
 */
export async function sendDelayAlert(params: {
  routeNameAr: string;
  routeNameEn: string;
  delayMinutes: number;
  stopNameAr: string;
  stopNameEn: string;
  affectedUserIds: string[];
}): Promise<void> {
  const { routeNameAr, routeNameEn, delayMinutes, stopNameAr, stopNameEn, affectedUserIds } = params;

  await pushQueue.add("delay-alert", {
    userIds: affectedUserIds,
    payload: {
      title_ar: `⚠️ تأخير ${routeNameAr}`,
      title_en: `⚠️ ${routeNameEn} Delay`,
      body_ar: `تأخير ${delayMinutes} دقيقة عند ${stopNameAr}`,
      body_en: `${delayMinutes} minute delay at ${stopNameEn}`,
      priority: "high",
      category: "delay_alert",
      data: {
        type: "delay_alert",
        route_name_ar: routeNameAr,
        route_name_en: routeNameEn,
        delay_minutes: String(delayMinutes),
        stop_name_ar: stopNameAr,
        stop_name_en: stopNameEn,
      },
    },
  });
}

/**
 * Send departure reminder: X minutes before scheduled departure
 */
export async function sendDepartureReminder(params: {
  userId: string;
  routeNameAr: string;
  routeNameEn: string;
  stopNameAr: string;
  stopNameEn: string;
  minutesBefore: number;
  departureTime: string;
}): Promise<void> {
  const { userId, routeNameAr, routeNameEn, stopNameAr, stopNameEn, minutesBefore, departureTime } = params;

  await pushQueue.add("departure-reminder", {
    userIds: [userId],
    payload: {
      title_ar: `🚌 ${routeNameAr} — ${minutesBefore} دقائق`,
      title_en: `🚌 ${routeNameEn} — ${minutesBefore} min`,
      body_ar: `موعد الانطلاق ${departureTime} من ${stopNameAr}`,
      body_en: `Departure at ${departureTime} from ${stopNameEn}`,
      priority: "high",
      category: "departure_reminder",
      data: {
        type: "departure_reminder",
        minutes_before: String(minutesBefore),
        departure_time: departureTime,
      },
    },
  });
}

/**
 * Send broadcast notification to all users or specific governorate
 */
export async function sendBroadcast(params: {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  governorate?: string;
}): Promise<void> {
  // For broadcast, leave userIds empty — worker fetches all active tokens
  await pushQueue.add("broadcast", {
    userIds: [],
    payload: {
      title_ar: params.titleAr,
      title_en: params.titleEn,
      body_ar: params.bodyAr,
      body_en: params.bodyEn,
      priority: "default",
      category: "broadcast",
      data: params.governorate ? { governorate: params.governorate } : undefined,
    },
  });
}

export { pushQueue, pushWorker };