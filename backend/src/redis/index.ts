import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) return null; // stop retrying
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.warn("[Redis] Error:", err.message);
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});

// Cache helpers
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 60
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch {
    // Fail silently — cache is optional
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    //
  }
}

/**
 * Scan Redis for keys matching a pattern using SCAN (non-blocking).
 * Unlike KEYS, SCAN is safe for production use as it iterates in chunks.
 */
export async function cacheKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  try {
    do {
      // scan(cursor, "MATCH", pattern, "COUNT", count) — positional args for ioredis types
      const [nextCursor, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      keys.push(...batch);
      cursor = nextCursor;
    } while (cursor !== "0");
  } catch {
    return [];
  }
  return keys;
}