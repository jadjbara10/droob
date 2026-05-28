/**
 * Offline-First Database (IndexedDB via idb)
 * Stores stops, routes, and schedules for offline access.
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";

// ─── Types ───────────────────────────────────────────────

export interface Stop {
  id: string;
  name: string;
  nameEn?: string;
  governorate: string;
  lat: number;
  lng: number;
  type: "brt" | "servees" | "coaster" | "public_bus" | "complex" | "stop";
  category?: string;
}

export interface Route {
  id: string;
  name: string;
  nameEn?: string;
  from: string;
  to: string;
  type: "brt" | "servees" | "coaster" | "public_bus";
  governorate: string;
  stops: string[]; // stop IDs in order
  geometry?: [number, number][]; // GeoJSON LineString coordinates
  distanceKm?: number;
  travelTimeMin?: number;
}

export interface StopSchedule {
  stopId: string;
  routeId: string;
  routeName: string;
  departures: string[]; // HH:mm times
  frequencyMin?: number;
  firstDeparture?: string;
  lastDeparture?: string;
}

export interface Favorite {
  id: string;
  type: "stop" | "route";
  itemId: string;
  name: string;
  addedAt: number; // timestamp
}

// ─── DB Schema ───────────────────────────────────────────

interface DroobDB extends DBSchema {
  stops: {
    key: string;
    value: Stop;
  };
  routes: {
    key: string;
    value: Route;
  };
  schedules: {
    key: [string, string]; // [stopId, routeId]
    value: StopSchedule;
  };
  favorites: {
    key: string;
    value: Favorite;
    indexes: { "by-type-item": [string, string] }; // [type, itemId]
  };
  meta: {
    key: string; // e.g. "lastSync", "dataVersion"
    value: { key: string; value: string | number };
  };
}

// ─── DB Singleton ────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<DroobDB>> | null = null;

function getDB(): Promise<IDBPDatabase<DroobDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DroobDB>("droob-pwa", 1, {
      upgrade(db) {
        // Stops store
        if (!db.objectStoreNames.contains("stops")) {
          db.createObjectStore("stops", { keyPath: "id" });
        }
        // Routes store
        if (!db.objectStoreNames.contains("routes")) {
          db.createObjectStore("routes", { keyPath: "id" });
        }
        // Schedules store
        if (!db.objectStoreNames.contains("schedules")) {
          db.createObjectStore("schedules", { keyPath: ["stopId", "routeId"] });
        }
        // Favorites store with compound index
        if (!db.objectStoreNames.contains("favorites")) {
          const favStore = db.createObjectStore("favorites", { keyPath: "id" });
          favStore.createIndex("by-type-item", ["type", "itemId"], { unique: true });
        }
        // Meta store
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Stop Operations ─────────────────────────────────────

export async function syncStops(stops: Stop[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("stops", "readwrite");
  for (const stop of stops) {
    await tx.store.put(stop);
  }
  await tx.done;
  await db.put("meta", { key: "lastSync", value: Date.now() });
}

export async function getAllStops(): Promise<Stop[]> {
  const db = await getDB();
  return db.getAll("stops");
}

export async function getStopById(id: string): Promise<Stop | undefined> {
  const db = await getDB();
  return db.get("stops", id);
}

export async function searchStops(query: string): Promise<Stop[]> {
  const db = await getDB();
  const all = await db.getAll("stops");
  const q = query.toLowerCase().trim();
  return all.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.nameEn ?? "").toLowerCase().includes(q) ||
      s.governorate.toLowerCase().includes(q) ||
      (s.type ?? "").includes(q)
  );
}

// ─── Route Operations ────────────────────────────────────

export async function syncRoutes(routes: Route[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("routes", "readwrite");
  for (const route of routes) {
    await tx.store.put(route);
  }
  await tx.done;
}

export async function getAllRoutes(): Promise<Route[]> {
  const db = await getDB();
  return db.getAll("routes");
}

export async function getRouteById(id: string): Promise<Route | undefined> {
  const db = await getDB();
  return db.get("routes", id);
}

export async function searchRoutes(query: string): Promise<Route[]> {
  const db = await getDB();
  const all = await db.getAll("routes");
  const q = query.toLowerCase().trim();
  return all.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      (r.nameEn ?? "").toLowerCase().includes(q) ||
      r.from.toLowerCase().includes(q) ||
      r.to.toLowerCase().includes(q) ||
      r.governorate.toLowerCase().includes(q) ||
      r.type.includes(q)
  );
}

export async function getStopsForRoute(routeId: string): Promise<Stop[]> {
  const db = await getDB();
  const route = await db.get("routes", routeId);
  if (!route) return [];
  const stops: Stop[] = [];
  for (const stopId of route.stops) {
    const stop = await db.get("stops", stopId);
    if (stop) stops.push(stop);
  }
  return stops;
}

export async function getRoutesForStop(stopId: string): Promise<Route[]> {
  const db = await getDB();
  const all = await db.getAll("routes");
  return all.filter((r) => r.stops.includes(stopId));
}

// ─── Schedule Operations ─────────────────────────────────

export async function syncSchedules(schedules: StopSchedule[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("schedules", "readwrite");
  for (const sched of schedules) {
    await tx.store.put(sched);
  }
  await tx.done;
}

export async function getSchedulesForStop(stopId: string): Promise<StopSchedule[]> {
  const db = await getDB();
  const all = await db.getAll("schedules");
  return all.filter((s) => s.stopId === stopId);
}

// ─── Favorite Operations ─────────────────────────────────

export async function addFavorite(item: Omit<Favorite, "id" | "addedAt">): Promise<void> {
  const db = await getDB();
  const id = `${item.type}_${item.itemId}`;
  await db.put("favorites", {
    id,
    type: item.type,
    itemId: item.itemId,
    name: item.name,
    addedAt: Date.now(),
  });
}

export async function removeFavorite(type: string, itemId: string): Promise<void> {
  const db = await getDB();
  const id = `${type}_${itemId}`;
  await db.delete("favorites", id);
}

export async function isFavorite(type: string, itemId: string): Promise<boolean> {
  const db = await getDB();
  const id = `${type}_${itemId}`;
  const found = await db.get("favorites", id);
  return !!found;
}

export async function getAllFavorites(): Promise<Favorite[]> {
  const db = await getDB();
  return db.getAll("favorites");
}

// ─── Sync Status ─────────────────────────────────────────

export async function getLastSyncTime(): Promise<number | null> {
  const db = await getDB();
  const meta = await db.get("meta", "lastSync");
  return meta ? (meta.value as number) : null;
}

export async function getDataVersion(): Promise<string> {
  const db = await getDB();
  const meta = await db.get("meta", "dataVersion");
  return meta ? (meta.value as string) : "0";
}

export async function setDataVersion(version: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key: "dataVersion", value: version });
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const stores = ["stops", "routes", "schedules", "favorites", "meta"];
  const tx = db.transaction(stores as any, "readwrite");
  for (const store of stores) {
    await tx.objectStore(store).clear();
  }
  await tx.done;
}