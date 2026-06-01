// ============================================================================
// دروب (Droob) — Local Storage Utility (MMKV)
// Extracted from the old api.ts to keep persistence concerns separate.
// Handles recent stops, auth tokens, and user preferences via react-native-mmkv.
// ============================================================================

// ─── Storage Keys ───────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  RECENT_STOPS: 'recent_stops',
} as const;

// ─── Internal Helpers ───────────────────────────────────────────────────────

function getMMKV() {
  try {
    // Dynamic require — MMKV may not be installed in all environments
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new () => { getString: (k: string) => string | undefined; set: (k: string, v: string) => void; delete: (k: string) => void };
    };
    return new MMKV();
  } catch {
    return null;
  }
}

// ─── Recent Stops ──────────────────────────────────────────────────────────

export interface RecentStop {
  id: string;
  nameAr?: string;
  nameEn?: string;
  code?: string;
  lat?: number;
  lng?: number;
  [key: string]: unknown;
}

/**
 * Returns the list of recently viewed stops, most recent first.
 * Max 10 entries. Returns empty array on any error (no storage, corrupt data).
 */
export function getRecentStops(): RecentStop[] {
  try {
    const storage = getMMKV();
    if (!storage) return [];
    const raw = storage.getString(STORAGE_KEYS.RECENT_STOPS);
    return raw ? (JSON.parse(raw) as RecentStop[]) : [];
  } catch {
    return [];
  }
}

/**
 * Adds (or re-orders) a stop to the recent list.
 * Deduplicates by `id`. Caps at 10 entries.
 * Silently no-ops if MMKV is unavailable.
 */
export function saveRecentStop(stop: RecentStop): void {
  try {
    const storage = getMMKV();
    if (!storage) return;
    const existing = JSON.parse(storage.getString(STORAGE_KEYS.RECENT_STOPS) || '[]') as RecentStop[];
    const filtered = existing.filter((s) => s.id !== stop.id);
    filtered.unshift(stop);
    storage.set(STORAGE_KEYS.RECENT_STOPS, JSON.stringify(filtered.slice(0, 10)));
  } catch {
    // no-op
  }
}

/**
 * Clears all recent stops from local storage.
 */
export function clearRecentStops(): void {
  try {
    const storage = getMMKV();
    if (!storage) return;
    storage.delete(STORAGE_KEYS.RECENT_STOPS);
  } catch {
    // no-op
  }
}
