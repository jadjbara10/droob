// ============================================================================
// دروب (Droob) — Design Tokens
// Immutable color system, spacing, typography, shadows, radii
// ============================================================================

// ─── Color System ────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  brand_blue: "#1A4F8A",
  brand_green: "#2E7D32",
  gold_accent: "#C9A84C",

  // Transit Modes
  bus_city: "#0066CC",
  bus_brt: "#E60026",
  serveece: "#E07B00",
  intercity: "#6B21A8",
  walking: "#6B7280",

  // Status
  on_time: "#16A34A",
  delayed: "#CA8A04",
  cancelled: "#DC2626",

  // Surfaces
  surface: "#FFFFFF",
  surface_2: "#F8F9FA",
  surface_3: "#F1F3F5",
  border: "#E5E7EB",

  // Text
  text_primary: "#111827",
  text_secondary: "#6B7280",
  text_tertiary: "#9CA3AF",

  // Utility
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
} as const;

// ─── Dark Mode Colors ─────────────────────────────────────────────────────────

export const darkColors = {
  // Surfaces
  surface: "#0F172A",
  surface_2: "#1E293B",
  surface_3: "#334155",
  border: "#475569",

  // Text
  text_primary: "#F1F5F9",
  text_secondary: "#94A3B8",
  text_tertiary: "#64748B",

  // Brand and transit colors carry over (sufficient contrast on dark)
  brand_blue: colors.brand_blue,
  brand_green: colors.brand_green,
  gold_accent: colors.gold_accent,
  bus_city: colors.bus_city,
  bus_brt: colors.bus_brt,
  serveece: colors.serveece,
  intercity: colors.intercity,
  walking: colors.walking,
  on_time: colors.on_time,
  delayed: colors.delayed,
  cancelled: colors.cancelled,
  white: colors.white,
  black: colors.black,
  transparent: colors.transparent,
} as const;

/**
 * Return the correct color palette based on the current theme mode.
 */
export function getColors(themeMode: "light" | "dark") {
  return themeMode === "dark" ? darkColors : colors;
}

// ─── Transit Color Map ───────────────────────────────────────────────────────

export const transitColorMap = {
  city_bus: colors.bus_city,
  brt: colors.bus_brt,
  serveece: colors.serveece,
  intercity: colors.intercity,
  walking: colors.walking,
} as const;

export type TransitMode = keyof typeof transitColorMap;

// ─── Spacing (4pt grid) ──────────────────────────────────────────────────────

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  13: 52,
  14: 56,
  16: 64,
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const fontFamily = {
  arabic: {
    regular: "IBM Plex Sans Arabic",
    medium: "IBM Plex Sans Arabic",
    semiBold: "IBM Plex Sans Arabic",
    bold: "IBM Plex Sans Arabic",
  },
  latin: {
    regular: "IBM Plex Sans",
    medium: "IBM Plex Sans",
    semiBold: "IBM Plex Sans",
    bold: "IBM Plex Sans",
  },
} as const;

export const fontSize = {
  11: 11,
  13: 13,
  14: 14,
  15: 15,
  16: 16,
  18: 18,
  20: 20,
  22: 22,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
} as const;

export const lineHeight = {
  body: 1.5,
  heading: 1.2,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semiBold: "600" as const,
  bold: "700" as const,
};

// ─── Border Radius ───────────────────────────────────────────────────────────

export const radius = {
  input: 8,
  card: 12,
  modal: 16,
  bottomSheet: 24,
  pill: 9999,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.16,
    shadowRadius: 64,
    elevation: 16,
  },
} as const;

// ─── Animation ───────────────────────────────────────────────────────────────

export const animation = {
  spring: {
    damping: 20,
    stiffness: 200,
    mass: 1,
  },
  timing: {
    duration: 250,
  },
  bottomSheet: {
    damping: 20,
    stiffness: 200,
  },
} as const;

// ─── Modern Animations (2025/2026) ───────────────────────────────────────────

export const animationModern = {
  spring: { damping: 20, stiffness: 300 },
  springBouncy: { damping: 15, stiffness: 200 },
  timing: { duration: 300 },
  timingSlow: { duration: 500 },
  entrance: { duration: 400, delay: 80 },
  bottomSheetSpring: { damping: 25, stiffness: 250, mass: 0.8 },
  tabBounce: { damping: 12, stiffness: 250 },
  pulse: {
    damping: 8,
    stiffness: 150,
    mass: 1,
  },
} as const;

// ─── Layout ──────────────────────────────────────────────────────────────────

export const layout = {
  touchTarget: 44,
  searchBarHeight: 52,
  bottomSheetHandleWidth: 32,
  bottomSheetHandleHeight: 4,
  stopCardWidth: 80,
  stopCardHeight: 100,
  transitBadge: {
    sm: 32,
    md: 44,
    lg: 56,
  },
  departureRowHeight: 72,
  departureHeaderHeight: 48,
  fabSize: 56,
  avatarSize: 32,
  chipHeight: 36,
  filterPillHeight: 32,
  headerHeight: 64,
  sidebarWidth: 240,
  sidebarCollapsed: 64,
} as const;

// ─── Opacity ─────────────────────────────────────────────────────────────────

export const opacity = {
  glass: 0.85,
  mutedBg: 0.15,
  disabled: 0.4,
} as const;

// ─── Haptics ─────────────────────────────────────────────────────────────────

export const haptics = {
  light: "light" as const,
  medium: "medium" as const,
  heavy: "heavy" as const,
  success: "success" as const,
  warning: "warning" as const,
  error: "error" as const,
  selection: "selection" as const,
} as const;

// ─── Glass Effect ────────────────────────────────────────────────────────────

export const glass = {
  ios: {
    backgroundColor: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px)",
  },
  android: {
    backgroundColor: "rgba(255,255,255,0.95)",
  },
} as const;

// ─── Modern Glassmorphism (2025) ─────────────────────────────────────────────

export const glassModern = {
  background: "rgba(255, 255, 255, 0.72)",
  backgroundDark: "rgba(15, 23, 42, 0.72)",
  border: "rgba(255, 255, 255, 0.18)",
  blur: 20,
  shadow: {
    color: "rgba(0, 0, 0, 0.08)",
    offset: { width: 0, height: 4 },
    opacity: 0.12,
    radius: 16,
  },
} as const;

// ─── Gradients ───────────────────────────────────────────────────────────────

export const gradients = {
  brand: ["#1A4F8A", "#2E7D32"] as readonly [string, string],
  brandVertical: ["#1A4F8A", "#2E7D32"] as readonly [string, string],
  goldAccent: ["#C9A84C", "#E8D48B"] as readonly [string, string],
  dark: ["#0F2B4C", "#1A4F8A"] as readonly [string, string],
  // Modern UI gradients (2025/2026)
  primary: ["#1A4F8A", "#2563EB"] as readonly [string, string],     // Droob blue
  success: ["#059669", "#10B981"] as readonly [string, string],     // Green
  gold: ["#B8860B", "#D4A853"] as readonly [string, string],        // Gold
  darkModern: ["#0F172A", "#1E293B"] as readonly [string, string],  // Dark
  warm: ["#F59E0B", "#EF4444"] as readonly [string, string],        // Warning
  hero: ["#1A4F8A", "#7C3AED"] as readonly [string, string],        // Blue-purple hero
} as const;

// ─── Map Style ───────────────────────────────────────────────────────────────

export const map = {
  stopMarkerSize: 12,
  stopMarkerActiveSize: 20,
  stopMarkerBorderWidth: 2,
  vehicleMarkerSize: 28,
  routeStrokeWidth: 4,
  walkingDashWidth: 2,
  brtCorridorWidth: 5,
  clusterMinZoom: 12,
} as const;

// ─── Modern Multi-Layer Shadows (2025/2026) ──────────────────────────────────
// Two-layer shadow system: close subtle shadow + far soft shadow

export const shadowModern = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ─── Export all tokens ───────────────────────────────────────────────────────

const tokens = {
  colors,
  transitColorMap,
  spacing,
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  radius,
  shadows,
  shadowModern,
  animation,
  animationModern,
  layout,
  opacity,
  haptics,
  glass,
  glassModern,
  gradients,
  map,
} as const;

export default tokens;