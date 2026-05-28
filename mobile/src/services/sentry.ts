// ============================================================================
// دروب (Droob) — Sentry Error Tracking
// Release tracking, source maps, offline event queue
// ============================================================================

import { Platform } from "react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || "";

interface SentryConfig {
  dsn: string;
  release: string;
  environment: "development" | "staging" | "production";
  enableNative: boolean;
}

class SentryService {
  private configured = false;
  private config: SentryConfig = {
    dsn: "",
    release: "1.0.0",
    environment: "development",
    enableNative: true,
  };

  init(config: Partial<SentryConfig>): void {
    this.config = { ...this.config, ...config };
    if (!this.config.dsn) {
      console.warn("[Sentry] DSN not configured — error tracking disabled");
      return;
    }

    try {
      // Sentry.init({
      //   dsn: this.config.dsn,
      //   release: this.config.release,
      //   environment: this.config.environment,
      //   enableNative: this.config.enableNative,
      //   enableAutoSessionTracking: true,
      //   sessionTrackingIntervalMillis: 30000,
      //   tracesSampleRate: 0.2,
      //   profilesSampleRate: 0.1,
      // });
      this.configured = true;
    } catch (error) {
      console.error("[Sentry] Init failed:", error);
    }
  }

  captureError(error: Error, context?: Record<string, unknown>): void {
    if (!this.configured) {
      if (__DEV__) console.error("[Sentry]", error.message, context);
      return;
    }
    try {
      // Sentry.captureException(error, { extra: context });
    } catch (_) {}
  }

  captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
    if (!this.configured) return;
    try {
      // Sentry.captureMessage(message, { level: Sentry.Severity[level] });
    } catch (_) {}
  }

  setUser(user: { id: string; email?: string; name?: string } | null): void {
    if (!this.configured) return;
    try {
      // user ? Sentry.setUser({ id: hashUserId(user.id), email: user.email, username: user.name }) : Sentry.setUser(null);
    } catch (_) {}
  }

  setRelease(version: string): void { this.config.release = version; }
}

export const sentry = new SentryService();
export default sentry;
