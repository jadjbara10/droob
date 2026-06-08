/**
 * دروب Droob — Real-time Data Change Broadcasting
 * When admin CRUDs data, notify connected mobile clients via Socket.io
 * so they can refresh without needing app rebuild.
 */
import type { FastifyInstance } from "fastify";

export type EntityType = "stop" | "route" | "alert" | "vehicle" | "fare" | "schedule";
export type ChangeAction = "create" | "update" | "delete";

/**
 * Broadcast a data change to all connected Socket.io clients.
 * Mobile app listens for "data:changed" and refreshes affected data.
 */
export function broadcastChange(
  app: FastifyInstance,
  entity: EntityType,
  action: ChangeAction,
  payload?: Record<string, unknown>
) {
  if (!app.io) return;

  const event = {
    entity,
    action,
    payload: payload || {},
    timestamp: new Date().toISOString(),
    // hint to the mobile client about what cache keys to invalidate
    invalidateCaches: getCacheKeys(entity),
  };

  app.io.emit("data:changed", event);
}

/** Return cache key patterns a mobile client should invalidate */
function getCacheKeys(entity: EntityType): string[] {
  switch (entity) {
    case "stop":
      return ["stops:*", "departures:*", "planner:*"];
    case "route":
      return ["routes:*", "departures:*", "planner:*"];
    case "alert":
      return ["alerts:*"];
    case "vehicle":
      return ["vehicles:*"];
    case "fare":
      return ["fares:*"];
    case "schedule":
      return ["schedules:*", "departures:*"];
    default:
      return ["*"];
  }
}
