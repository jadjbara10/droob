/**
 * Prayer Times Service — فاسترجاع مواقيت الصلاة من API الأذان
 *
 * Uses the Aladhan API: https://aladhan.com/prayer-times-api
 * Method 4 = Umm Al-Qura University, Makkah
 */

import { db } from "../db/index.js";
import { prayerTimes } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

// All 12 Jordanian governorates with city names for Aladhan API
const GOVERNORATES: Record<string, string> = {
  عمان: "Amman",
  إربد: "Irbid",
  الزرقاء: "Zarqa",
  البلقاء: "Balqa",
  المفرق: "Mafraq",
  جرش: "Jerash",
  عجلون: "Ajloun",
  الكرك: "Karak",
  الطفيلة: "Tafilah",
  معان: "Maan",
  مادبا: "Madaba",
  العقبة: "Aqaba",
};

interface AladhanTiming {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

interface AladhanResponse {
  code: number;
  data: {
    timings: AladhanTiming;
    date: {
      gregorian: { date: string };
    };
  };
}

/**
 * Fetch prayer times for a specific date and governorate from Aladhan API.
 */
export async function fetchPrayerTimes(
  date: string,
  governorate: string
): Promise<{ date: string; governorate: string; fajr: string; sunrise: string; dhuhr: string; asr: string; maghrib: string; isha: string } | null> {
  const cityName = GOVERNORATES[governorate];
  if (!cityName) {
    console.warn(`[PrayerTimes] Unknown governorate: ${governorate}`);
    return null;
  }

  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(cityName)}&country=Jordan&method=4`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[PrayerTimes] Aladhan API error: ${response.status} for ${cityName}`);
      return null;
    }

    const result = (await response.json()) as AladhanResponse;

    if (result.code !== 200 || !result.data?.timings) {
      console.error(`[PrayerTimes] Invalid Aladhan response for ${cityName}`);
      return null;
    }

    const timings = result.data.timings;

    return {
      date,
      governorate,
      fajr: timings.Fajr,
      sunrise: timings.Sunrise,
      dhuhr: timings.Dhuhr,
      asr: timings.Asr,
      maghrib: timings.Maghrib,
      isha: timings.Isha,
    };
  } catch (err) {
    console.error(`[PrayerTimes] Fetch error for ${cityName}:`, err);
    return null;
  }
}

/**
 * Sync prayer times for all 12 governorates for a given date.
 * Stores results in the prayer_times table (upsert by date+governorate).
 */
export async function syncDailyPrayerTimes(date?: string): Promise<{ synced: number; failed: number }> {
  const targetDate = date || new Date().toISOString().split("T")[0];
  const governorates = Object.keys(GOVERNORATES);

  let synced = 0;
  let failed = 0;

  for (const gov of governorates) {
    try {
      const result = await fetchPrayerTimes(targetDate, gov);
      if (!result) {
        failed++;
        continue;
      }

      // Upsert: delete existing record for this date+governorate, then insert
      await db.delete(prayerTimes).where(
        and(eq(prayerTimes.date, targetDate), eq(prayerTimes.governorate, gov))
      );

      await db.insert(prayerTimes).values({
        date: result.date,
        governorate: result.governorate,
        fajr: result.fajr,
        sunrise: result.sunrise,
        dhuhr: result.dhuhr,
        asr: result.asr,
        maghrib: result.maghrib,
        isha: result.isha,
      });

      synced++;
    } catch (err) {
      console.error(`[PrayerTimes] Sync error for ${gov}:`, err);
      failed++;
    }
  }

  console.log(`[PrayerTimes] Synced ${targetDate}: ${synced} succeeded, ${failed} failed`);
  return { synced, failed };
}
