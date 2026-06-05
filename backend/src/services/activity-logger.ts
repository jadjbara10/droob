/**
 * Activity Logger — يسجل كل الإجراءات المهمة في النظام
 *
 * Writes to the activity_logs table for admin dashboard audit trail.
 */

import { db } from "../db/index.js";
import { activityLogs } from "../../drizzle/schema.js";

export type ActivityAction = "create" | "update" | "delete" | "import" | "export";
export type ActivityEntityType = "route" | "stop" | "vehicle" | "alert" | "schedule" | "fare" | "prayer_time" | "user";

/**
 * Log an activity to the database.
 *
 * @param userId - The user who performed the action
 * @param action - The action type (create | update | delete | import | export)
 * @param entityType - The type of entity affected
 * @param entityId - Optional UUID of the affected entity
 * @param details - Optional JSON-serializable details about the action
 * @param ipAddress - Optional IP address of the requester
 */
export async function logActivity(
  userId: string | null | undefined,
  action: ActivityAction,
  entityType: ActivityEntityType,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
  ipAddress?: string | null,
): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    console.error(`[ActivityLogger] Failed to log activity:`, err);
    // Fail silently — activity logging should never break the main operation
  }
}
