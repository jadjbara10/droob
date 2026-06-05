// ============================================================================
// دروب (Droob) — Offline Cache Service
// MMKV-backed cache with TTL, offline action queue, and auto-sync via NetInfo.
// ============================================================================

import { MMKV } from 'react-native-mmkv';
import NetInfo from '@react-native-community/netinfo';
import type { apiFetch } from './api-client';

// ─── Storage ───────────────────────────────────────────────────────────────

const storage = new MMKV();

const CACHE_PREFIX = 'cache_';
const CACHE_TTL_PREFIX = 'cache_ttl_';
const QUEUE_KEY = 'offline_action_queue';
const DEFAULT_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// ─── Internal Helpers ──────────────────────────────────────────────────────

function now(): number {
  return Date.now();
}

// ─── Cache Data ────────────────────────────────────────────────────────────

/**
 * Stores data in MMKV with a timestamp.
 */
export function cacheData(key: string, data: unknown): void {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const ttlKey = CACHE_TTL_PREFIX + key;
    storage.set(cacheKey, JSON.stringify(data));
    storage.set(ttlKey, String(now()));
  } catch {
    // no-op
  }
}

/**
 * Retrieves cached data if it has not exceeded `maxAgeMs` (default 1 hour).
 * Returns null if missing, expired, or corrupt.
 */
export function getCachedData<T>(key: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS): T | null {
  try {
    const cacheKey = CACHE_PREFIX + key;
    const ttlKey = CACHE_TTL_PREFIX + key;
    const raw = storage.getString(cacheKey);
    const ttlRaw = storage.getString(ttlKey);
    if (!raw || !ttlRaw) return null;
    const age = now() - Number(ttlRaw);
    if (age > maxAgeMs) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Offline Action Queue ──────────────────────────────────────────────────

export interface OfflineAction {
  type: string;
  endpoint: string;
  body: unknown;
}

/**
 * Queues an action (e.g. report submission) to be replayed when connectivity returns.
 */
export function queueOfflineAction(action: OfflineAction): void {
  try {
    const raw = storage.getString(QUEUE_KEY);
    const queue: OfflineAction[] = raw ? JSON.parse(raw) : [];
    queue.push(action);
    storage.set(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // no-op
  }
}

/**
 * Returns all pending offline actions.
 */
export function getPendingActions(): OfflineAction[] {
  try {
    const raw = storage.getString(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears the pending action queue (called after successful sync).
 */
export function clearPendingActions(): void {
  try {
    storage.delete(QUEUE_KEY);
  } catch {
    // no-op
  }
}

/**
 * Replays all queued offline actions against the API.
 * Each action is posted to its endpoint. Successes are counted; failures are kept in the queue.
 *
 * @param apiClient - The `apiFetch` function from api-client (typed for retry/auth).
 * @returns A summary of how many actions were synced and how many failed.
 */
export async function syncPendingActions(
  apiClient: typeof apiFetch,
): Promise<{ synced: number; failed: number }> {
  const pending = getPendingActions();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const failed: OfflineAction[] = [];
  let synced = 0;

  for (const action of pending) {
    try {
      await apiClient(action.endpoint, {
        method: 'POST',
        body: action.body,
      });
      synced++;
    } catch {
      failed.push(action);
    }
  }

  // Write remaining failed actions back to the queue
  if (failed.length > 0) {
    storage.set(QUEUE_KEY, JSON.stringify(failed));
  } else {
    storage.delete(QUEUE_KEY);
  }

  return { synced, failed: failed.length };
}

// ─── NetInfo Auto-Sync ─────────────────────────────────────────────────────

let syncUnsubscribe: (() => void) | null = null;

/**
 * Starts listening for connectivity changes. When the device comes back online,
 * any queued offline actions are automatically replayed.
 *
 * Call once during app initialisation (e.g. in App.tsx).
 */
export function startOfflineSync(apiClient: typeof apiFetch): () => void {
  if (syncUnsubscribe) syncUnsubscribe();

  syncUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      syncPendingActions(apiClient).catch(() => {
        // silent — retry on next connectivity change
      });
    }
  });

  return () => {
    if (syncUnsubscribe) {
      syncUnsubscribe();
      syncUnsubscribe = null;
    }
  };
}
