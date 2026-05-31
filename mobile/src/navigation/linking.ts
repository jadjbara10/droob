// ============================================================================
// دروب (Droob) — Deep Linking Configuration
// Universal links + app scheme: droob://*
// https://app.droob.jo/* → same screens
// ============================================================================

import type { LinkingOptions } from "@react-navigation/native";

const config: LinkingOptions<Record<string, any>> = {
  prefixes: ["droob://", "https://app.droob.jo"],
  config: {
    screens: {
      Onboarding: "onboarding",
      MainTabs: {
        screens: {
          Home: "",
          TripPlanner: "plan",
          Departures: "departures",
        },
      },
      Search: "search/:mode?",
      RouteDetail: "route/:routeId",
      StopDetail: "stop/:stopId",
      JourneyDetail: "journey/:journeyId?",
      Navigation: "navigate",
      Alerts: "alerts",
      SavedRoutes: "saved",
    },
  },
};

export default config;

// ─── Deep link helpers ──────────────────────────────────────────────────────

export function buildDeepLink(path: string, params?: Record<string, string>): string {
  let url = `droob://${path}`;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    }
  }
  return url;
}

export function parseStopId(url: string): string | null {
  const match = url.match(/stop\/([^/?]+)/);
  return match?.[1] ?? null;
}

export function parseRouteId(url: string): string | null {
  const match = url.match(/route\/([^/?]+)/);
  return match?.[1] ?? null;
}

export function parseJourneyId(url: string): string | null {
  const match = url.match(/journey\/([^/?]+)/);
  return match?.[1] ?? null;
}
