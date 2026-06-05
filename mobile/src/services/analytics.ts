// ============================================================================
// دروب (Droob) — Analytics Service
// Tracks key events. User IDs are hashed. No PII logged.
// In dev mode events are console.logged; in production they are POSTed to
// /api/v1/ads/event. Events are queued locally when offline and flushed when
// connectivity returns.
// ============================================================================

import Constants from 'expo-constants';
import { cacheData, getCachedData } from './offline-cache';
import NetInfo from '@react-native-community/netinfo';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000';
const ANALYTICS_QUEUE_KEY = 'analytics_event_queue';

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

// ─── Offline queue helpers ──────────────────────────────────────────────────

function queueAnalyticsEvent(eventData: Record<string, unknown>): void {
  try {
    const raw = getCachedData<Record<string, unknown>[]>(ANALYTICS_QUEUE_KEY);
    const queue: Record<string, unknown>[] = raw || [];
    queue.push(eventData);
    cacheData(ANALYTICS_QUEUE_KEY, queue);
  } catch {
    // no-op
  }
}

async function flushAnalyticsQueue(): Promise<void> {
  const raw = getCachedData<Record<string, unknown>[]>(ANALYTICS_QUEUE_KEY);
  if (!raw || raw.length === 0) return;
  const events = [...raw];
  // Clear optimistically
  cacheData(ANALYTICS_QUEUE_KEY, []);

  for (const event of events) {
    try {
      await fetch(`${API_URL}/api/v1/ads/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'analytics', ...event }),
      });
    } catch {
      // Re-queue if still offline
      queueAnalyticsEvent(event);
      break;
    }
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

class AnalyticsService {
  private enabled = false;
  private distinctId = "";
  private version = "1.0.0";

  async init(userId: string, version: string): Promise<void> {
    this.distinctId = hashUserId(userId);
    this.version = version;
    this.enabled = true;
    // PostHog.init(POSTHOG_API_KEY, { host: POSTHOG_HOST });

    // Flush any queued events from previous offline periods
    NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        flushAnalyticsQueue();
      }
    });

    // Listen for connectivity changes to auto-flush
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        flushAnalyticsQueue();
      }
    });
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
      if (__DEV__) {
        console.log(`[Analytics] ${event}`, props);
      } else {
        // Send to backend
        this.sendToBackend(event, props);
      }
    } catch (_) {}
  }

  private async sendToBackend(event: string, props: Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${API_URL}/api/v1/ads/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'analytics', event, ...props }),
      });
    } catch {
      // Queue for later when offline
      queueAnalyticsEvent({ event, ...props });
    }
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

  // ─── New Tracking Functions ────────────────────────────────────────────

  /** Track a search query and its result count. */
  trackSearch(query: string, resultCount: number): void {
    this.track('search_performed', { query, result_count: resultCount });
  }

  /** Track a trip plan request with origin/destination and number of journeys found. */
  trackTripPlan(fromName: string, toName: string, journeyCount: number): void {
    this.track('trip_planned', {
      from: fromName,
      to: toName,
      modes: [],
      result_count: journeyCount,
    });
  }

  /** Track when a user views a route detail page. */
  trackRouteView(routeId: string, routeName: string): void {
    this.track('route_viewed', { route_id: routeId, mode: routeName });
  }

  /** Track when a user views departures for a specific stop. */
  trackDepartureView(stopId: string, stopName: string): void {
    this.track('stop_viewed', { stop_id: stopId, source: 'nearby' });
  }

  /** Track a screen view event. */
  trackScreenView(screenName: string): void {
    this.screen(screenName);
  }

  /** Track a successful community report submission. */
  trackReportSubmit(reportType: string): void {
    this.track('community_report_submitted', { report_type: reportType });
  }
}

export const analytics = new AnalyticsService();
export type { EventName, EventPayload };
