// ============================================================================
// دروب (Droob) — TransportIcon Component
// Renders transit mode icon with colored styling for departures, badges, markers
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, radius, fontSize, fontWeight } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface TransportIconProps {
  /** Transit mode */
  mode: TransitMode | "walking";
  /** Icon size in pixels (default: 40) */
  size?: number;
  /** Show mode color background (default: true) */
  showBackground?: boolean;
  /** Optional line code overlay */
  code?: string;
  /** Override style */
  style?: ViewStyle;
}

// ─── Mode Icons (Emoji) ─────────────────────────────────────────────────────

const MODE_ICONS: Record<string, string> = {
  city_bus: "🚌",
  brt: "⚡",
  serveece: "🚐",
  intercity: "🚌",
  walking: "🚶",
};

// ─── Mode Colors ────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  city_bus: colors.bus_city,
  brt: colors.bus_brt,
  serveece: colors.serveece,
  intercity: colors.intercity,
  walking: colors.walking,
};

// ─── Component ──────────────────────────────────────────────────────────────

const TransportIcon: React.FC<TransportIconProps> = ({
  mode,
  size = 40,
  showBackground = true,
  code,
  style,
}) => {
  const modeColor = MODE_COLORS[mode] || colors.bus_city;
  const icon = MODE_ICONS[mode] || "🚌";
  const bgColor = modeColor + "26"; // 15% opacity

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: showBackground ? bgColor : "transparent",
        },
        style,
      ]}
    >
      <Text style={[styles.icon, { fontSize: size * 0.5 }]}>{icon}</Text>
      {code && (
        <View style={[styles.codeBadge, { backgroundColor: modeColor }]}>
          <Text style={styles.codeText}>{code}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  icon: {
    textAlign: "center",
  },
  codeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  codeText: {
    fontFamily: "IBM Plex Sans",
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default TransportIcon;