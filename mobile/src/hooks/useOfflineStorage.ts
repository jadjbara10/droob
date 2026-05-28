// ============================================================================
// دروب (Droob) — Offline Storage Hook
// MMKV-backed cache for routes, stops, schedules. Enables full offline mode.
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';
// MMKV stubbed — replace with react-native-mmkv when native build is fixed
import { TransitStop, TransitRoute, TransitAlert, Journey } from '../types/transit.types';

const storage = { getString: (_k: string) => null as string | null, set: (_k: string, _v: string) => {}, delete: (_k: string) => {}, clearAll: () => {}, getAllKeys: () => [] as string[] };

const KEYS = {
  STOPS: 'cached_stops',
  ROUTES: 'cached_routes',
  ALERTS: 'cached_alerts',
  SAVED_JOURNEYS: 'saved_journeys',
  LAST_FETCH: 'last_fetch_timestamp',
  USER_FAVORITES: 'user_favorite_routes',
};

// ─── Generic read/write helpers ─────────────────────────────────────────────

function readJSON<T>(key: string): T | null {
  try {
    const raw = storage.getString(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOfflineStorage() {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Stops ─────────────────────────────────────────────────────────────
  const cacheStops = useCallback((stops: TransitStop[]) => {
    writeJSON(KEYS.STOPS, stops);
    storage.set(KEYS.LAST_FETCH, Date.now());
  }, []);

  const getCachedStops = useCallback((): TransitStop[] => {
    return readJSON<TransitStop[]>(KEYS.STOPS) || [];
  }, []);

  // ── Routes ────────────────────────────────────────────────────────────
  const cacheRoutes = useCallback((routes: TransitRoute[]) => {
    writeJSON(KEYS.ROUTES, routes);
  }, []);

  const getCachedRoutes = useCallback((): TransitRoute[] => {
    return readJSON<TransitRoute[]>(KEYS.ROUTES) || [];
  }, []);

  // ── Alerts ────────────────────────────────────────────────────────────
  const cacheAlerts = useCallback((alerts: TransitAlert[]) => {
    writeJSON(KEYS.ALERTS, alerts);
  }, []);

  const getCachedAlerts = useCallback((): TransitAlert[] => {
    return readJSON<TransitAlert[]>(KEYS.ALERTS) || [];
  }, []);

  // ── Saved Journeys ────────────────────────────────────────────────────
  const saveJourney = useCallback((journey: Journey) => {
    const existing = readJSON<Journey[]>(KEYS.SAVED_JOURNEYS) || [];
    const filtered = existing.filter((j) => j.id !== journey.id);
    filtered.unshift(journey);
    writeJSON(KEYS.SAVED_JOURNEYS, filtered.slice(0, 20)); // cap at 20
  }, []);

  const getSavedJourneys = useCallback((): Journey[] => {
    return readJSON<Journey[]>(KEYS.SAVED_JOURNEYS) || [];
  }, []);

  const removeSavedJourney = useCallback((id: string) => {
    const existing = readJSON<Journey[]>(KEYS.SAVED_JOURNEYS) || [];
    writeJSON(KEYS.SAVED_JOURNEYS, existing.filter((j) => j.id !== id));
  }, []);

  // ── Favorites ─────────────────────────────────────────────────────────
  const toggleFavoriteRoute = useCallback((routeId: string) => {
    const favs: string[] = readJSON<string[]>(KEYS.USER_FAVORITES) || [];
    const idx = favs.indexOf(routeId);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push(routeId);
    writeJSON(KEYS.USER_FAVORITES, favs);
    return favs;
  }, []);

  const getFavoriteRoutes = useCallback((): string[] => {
    return readJSON<string[]>(KEYS.USER_FAVORITES) || [];
  }, []);

  const isFavoriteRoute = useCallback((routeId: string): boolean => {
    const favs = readJSON<string[]>(KEYS.USER_FAVORITES) || [];
    return favs.includes(routeId);
  }, []);

  // ── Cache Age ─────────────────────────────────────────────────────────
  const getCacheAge = useCallback((): number => {
    const ts = storage.getNumber(KEYS.LAST_FETCH);
    if (!ts) return Infinity;
    return Date.now() - ts;
  }, []);

  const isCacheStale = useCallback((maxAgeMs = 30 * 60 * 1000): boolean => {
    return getCacheAge() > maxAgeMs; // default: 30 min
  }, [getCacheAge]);

  const clearAllCache = useCallback(() => {
    Object.values(KEYS).forEach((key) => storage.delete(key));
  }, []);

  return {
    cacheStops,
    getCachedStops,
    cacheRoutes,
    getCachedRoutes,
    cacheAlerts,
    getCachedAlerts,
    saveJourney,
    getSavedJourneys,
    removeSavedJourney,
    toggleFavoriteRoute,
    getFavoriteRoutes,
    isFavoriteRoute,
    getCacheAge,
    isCacheStale,
    clearAllCache,
  };
}

export default useOfflineStorage;