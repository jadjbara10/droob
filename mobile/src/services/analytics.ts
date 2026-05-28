// ============================================================================
// دروب (Droob) — Analytics Service (PostHog)
// Tracks key events. User IDs are hashed. No PII logged.
// ============================================================================

type EventName =
  | "app_opened" | "trip_planned" | "trip_started"
  | "stop_viewed" | "payment_started" | "payment_completed"
  | "alert_dismissed" | "search_performed"
  | "route_viewed" | "onboarding_completed"
  | "offline_mode_activated" | "community_report_submitted";

interface EventPayload {
  app_opened: { cold_start: boolean; version: string };
  trip_planned: { from: string; to: string; modes: string[]; result_count: number };
  trip_started: { journey_id: string; mode: string; line?: string };
  stop_viewed: { stop_id: string; source: "map" | "search" | "favorites" | "nearby" };
  payment_started: { ticket_type: string; amount: number };
  payment_completed: { ticket_type: string; amount: number };
  alert_dismissed: { alert_id: string; severity: string };
  search_performed: { query: string; result_count: number };
  route_viewed: { route_id: string; mode: string };
  onboarding_completed: {};
  offline_mode_activated: {};
  community_report_submitted: { report_type: string };
}

// Simple hash function for user ID
function hashUserId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "u_" + Math.abs(hash).toString(36);
}

class AnalyticsService {
  private enabled = false;
  private distinctId = "";
  private version = "1.0.0";

  async init(userId: string, version: string): Promise<void> {
    this.distinctId = hashUserId(userId);
    this.version = version;
    this.enabled = true;
    // PostHog.init(POSTHOG_API_KEY, { host: POSTHOG_HOST });
  }

  track<T extends EventName>(event: T, payload: EventPayload[T]): void {
    if (!this.enabled) return;
    try {
      const props = {
        ...payload,
        distinct_id: this.distinctId,
        timestamp: new Date().toISOString(),
      };
      // PostHog.capture(event, props);
      if (__DEV__) console.log(`[Analytics] ${event}`, props);
    } catch (_) {}
  }

  screen(screenName: string): void {
    if (!this.enabled) return;
    try {
      // PostHog.screen(screenName, { distinct_id: this.distinctId });
      if (__DEV__) console.log(`[Analytics] screen: ${screenName}`);
    } catch (_) {}
  }

  identify(properties: Record<string, unknown>): void {
    if (!this.enabled) return;
    try {
      // PostHog.identify(this.distinctId, properties);
    } catch (_) {}
  }

  disable(): void { this.enabled = false; }
  enable(): void { this.enabled = true; }
}

export const analytics = new AnalyticsService();
export type { EventName, EventPayload };
