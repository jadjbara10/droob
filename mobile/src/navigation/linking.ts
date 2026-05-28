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
      Home: "",
      TripPlanner: "trip",
      Departures: "stop/:stopId",
      StopDetail: "stop/:stopId",
      RouteDetail: "route/:routeId",
      TicketWallet: "ticket/:ticketId",
      Alerts: "alerts",
      Profile: "profile",
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

export function parseTicketId(url: string): string | null {
  const match = url.match(/ticket\/([^/?]+)/);
  return match?.[1] ?? null;
}
