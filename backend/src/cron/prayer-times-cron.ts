/**
 * Prayer Times Cron Job — syncs daily at 2:00 AM
 *
 * Uses BullMQ to schedule the job via Redis.
 * Falls back to a simple setInterval if Redis is unavailable.
 */

import { Queue, Worker } from "bullmq";
import { redis } from "../redis/index.js";
import { syncDailyPrayerTimes } from "../services/prayer-times.js";

const QUEUE_NAME = "prayer-times-sync";

let prayerTimesQueue: Queue | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize and start the prayer times cron job.
 * Uses BullMQ queue with a repeatable job at 2:00 AM daily.
 * Falls back to setInterval (24h) if Redis is unreachable.
 */
export async function startPrayerTimesCron() {
  try {
    // Test Redis connectivity
    await redis.ping();

    prayerTimesQueue = new Queue(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { age: 86400 }, // keep for 1 day
        removeOnFail: { age: 604800 }, // keep failures for 7 days
      },
    });

    // Remove any existing repeatable jobs to avoid duplicates
    const repeatableJobs = await prayerTimesQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await prayerTimesQueue.removeRepeatableByKey(job.key);
    }

    // Schedule daily at 2:00 AM Amman time (UTC+3)
    await prayerTimesQueue.upsertJobScheduler(
      "daily-prayer-times",
      {
        pattern: "0 2 * * *",
        tz: "Asia/Amman",
      },
      {
        name: "sync-prayer-times",
        data: {},
      }
    );

    // Worker to process the jobs
    const worker = new Worker(
      QUEUE_NAME,
      async () => {
        console.log("[PrayerTimesCron] Running scheduled sync...");
        const result = await syncDailyPrayerTimes();
        console.log(`[PrayerTimesCron] Sync complete: ${result.synced} synced, ${result.failed} failed`);
      },
      { connection: redis }
    );

    worker.on("completed", (job) => {
      console.log(`[PrayerTimesCron] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[PrayerTimesCron] Job ${job?.id} failed:`, err.message);
    });

    console.log("[PrayerTimesCron] BullMQ queue initialized — daily sync at 2:00 AM Asia/Amman");
  } catch (err) {
    console.warn("[PrayerTimesCron] Redis unavailable, using 24h fallback timer");
    // Fallback: run every 24 hours starting now
    runDailySync(); // Run once immediately on startup
    fallbackTimer = setInterval(runDailySync, 24 * 60 * 60 * 1000);
  }
}

async function runDailySync() {
  try {
    const date = new Date().toISOString().split("T")[0];
    console.log(`[PrayerTimesCron] Fallback sync for ${date}...`);
    const result = await syncDailyPrayerTimes(date);
    console.log(`[PrayerTimesCron] Fallback sync complete: ${result.synced} synced, ${result.failed} failed`);
  } catch (err) {
    console.error("[PrayerTimesCron] Fallback sync error:", err);
  }
}

/**
 * Gracefully shut down the cron job.
 */
export async function stopPrayerTimesCron() {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
  if (prayerTimesQueue) {
    await prayerTimesQueue.close();
    prayerTimesQueue = null;
  }
}
